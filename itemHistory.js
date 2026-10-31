// Item History: tracks each investment and loan row month by month.
//
// Every tracked row has a permanent id. Saving a month stores a snapshot of
// each row in record.items, and growth is always derived from those snapshots
// rather than stored:
//   investment growth = closing - opening - money in/out
//   loan interest     = closing - opening + paid/received
// Records saved before this feature have no items and are left untouched.

const TRACKED_SECTIONS = { investments: 'investment', loans: 'loan' };

let itemHistoryChart = null;

function generateItemId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `item_${crypto.randomUUID()}`;
    }
    return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function monthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function roundMoney(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

// Gives every tracked row an id and fills in the tracking fields. Safe to run
// repeatedly. A repeated id is replaced so two rows can never share a history.
function ensureTrackingFields(financeData) {
    financeData.closedItems = Array.isArray(financeData.closedItems) ? financeData.closedItems : [];
    const seen = new Set();
    Object.keys(TRACKED_SECTIONS).forEach(section => {
        (financeData[section] || []).forEach(item => {
            if (!item.id || seen.has(item.id)) item.id = generateItemId();
            seen.add(item.id);
            item.flow = roundMoney(item.flow);
            item.dateAdded = item.dateAdded || new Date().toISOString();
        });
    });
    return financeData;
}

// Removes the empty records older versions created from placeholder rows.
function removeBlankRecords(financeData) {
    ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
        if (!Array.isArray(financeData[section])) return;
        financeData[section] = financeData[section].filter(item =>
            !(item.name === 'Unnamed' && !item.value && !item.target && !item.remark)
        );
    });
    return financeData;
}

// Once a new month starts, removes the amount already saved in an earlier
// month's record. Anything typed after that save stays in the box.
function settleRecordedFlows(financeData, now = new Date()) {
    const currentMonth = monthKey(now);
    let changed = false;
    Object.keys(TRACKED_SECTIONS).forEach(section => {
        (financeData[section] || []).forEach(item => {
            if (item.flowRecordedMonth && item.flowRecordedMonth < currentMonth) {
                item.flow = roundMoney((item.flow || 0) - (item.flowRecorded || 0));
                delete item.flowRecorded;
                delete item.flowRecordedMonth;
                changed = true;
            }
        });
    });
    return changed;
}

function prepareLoadedData(financeData) {
    ensureTrackingFields(financeData);
    settleRecordedFlows(financeData);
    return financeData;
}

function getClosingFlow(closedItem) {
    const finalAmount = Number(closedItem.finalAmount) || 0;
    const boxAmount = Number(closedItem.flow) || 0;
    return roundMoney(closedItem.type === 'loan' ? boxAmount + finalAmount : boxAmount - finalAmount);
}

function hasClosedEntry(records, id) {
    return records.some(record => (record.items || []).some(item => item.id === id && item.closed));
}

// Builds the item list for a monthly record. Closed items appear once, in the
// first record saved after they were closed.
function buildMonthSnapshot(financeData, otherRecords) {
    const items = [];
    Object.entries(TRACKED_SECTIONS).forEach(([section, type]) => {
        (financeData[section] || []).forEach(item => {
            items.push({
                id: item.id,
                type,
                name: item.name,
                remark: item.remark || '',
                value: roundMoney(item.value),
                flow: roundMoney(item.flow)
            });
        });
    });
    (financeData.closedItems || []).forEach(closedItem => {
        if (hasClosedEntry(otherRecords, closedItem.id)) return;
        items.push({
            id: closedItem.id,
            type: closedItem.type,
            name: closedItem.name,
            remark: closedItem.remark || '',
            value: 0,
            flow: getClosingFlow(closedItem),
            closed: true
        });
    });
    return items;
}

function markFlowsRecorded(financeData, savedMonth) {
    Object.keys(TRACKED_SECTIONS).forEach(section => {
        (financeData[section] || []).forEach(item => {
            item.flowRecorded = roundMoney(item.flow);
            item.flowRecordedMonth = savedMonth;
        });
    });
}

function calculateGrowth(type, closing, opening, flow) {
    return roundMoney(type === 'loan' ? closing - opening + flow : closing - opening - flow);
}

function createHistoryEntry(type, opening, value, flow, extra) {
    const growth = calculateGrowth(type, value, opening, flow);
    return {
        ...extra,
        opening,
        value,
        flow,
        growth,
        growthPercent: opening > 0 ? roundMoney((growth / opening) * 100) : null
    };
}

function sortRecords(records) {
    return [...(records || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Returns one summary per item with its full month-by-month history.
function buildItemSummaries(financeData, records) {
    const sorted = sortRecords(records);
    const firstTracked = sorted.findIndex(record => Array.isArray(record.items));
    const summaries = new Map();

    sorted.forEach((record, recordIndex) => {
        (record.items || []).forEach(item => {
            const value = roundMoney(item.value);
            const flow = roundMoney(item.flow);
            let summary = summaries.get(item.id);

            if (!summary) {
                summary = {
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    remark: item.remark || '',
                    entries: [],
                    startValue: 0,
                    totalFlow: 0,
                    totalGrowth: 0,
                    status: 'active',
                    closedDate: null
                };
                summaries.set(item.id, summary);
            }

            let entry;
            if (summary.entries.length === 0 && recordIndex === firstTracked) {
                // The first tracked month only sets the starting point.
                summary.startValue = value;
                entry = {
                    date: record.date,
                    baseline: true,
                    opening: null,
                    value,
                    flow: 0,
                    growth: null,
                    growthPercent: null
                };
            } else {
                const previous = summary.entries[summary.entries.length - 1];
                // With no amount typed, a new row's starting value is counted
                // as money put in, so it never appears as growth.
                const newItemFlow = item.type === 'loan' ? -value : value;
                const effectiveFlow = previous ? flow : (flow || newItemFlow);
                entry = createHistoryEntry(item.type, previous ? previous.value : 0, value, effectiveFlow, {
                    date: record.date
                });
            }

            summary.entries.push(entry);
            summary.name = item.name;
            summary.remark = item.remark || '';
            summary.totalFlow = roundMoney(summary.totalFlow + entry.flow);
            summary.totalGrowth = roundMoney(summary.totalGrowth + (entry.growth || 0));
            if (item.closed) summary.status = 'closed';
        });
    });

    (financeData.closedItems || []).forEach(closedItem => {
        const summary = summaries.get(closedItem.id);
        if (!summary) return;
        summary.status = 'closed';
        summary.closedDate = closedItem.closedDate;
        if (hasClosedEntry(sorted, closedItem.id)) return;

        const last = summary.entries[summary.entries.length - 1];
        const entry = createHistoryEntry(closedItem.type, last.value, 0, getClosingFlow(closedItem), {
            date: `${closedItem.closedDate}T12:00:00`,
            pending: true
        });
        summary.entries.push(entry);
        summary.totalFlow = roundMoney(summary.totalFlow + entry.flow);
        summary.totalGrowth = roundMoney(summary.totalGrowth + entry.growth);
    });

    Object.entries(TRACKED_SECTIONS).forEach(([section, type]) => {
        (financeData[section] || []).forEach(item => {
            const summary = summaries.get(item.id);
            if (summary) {
                summary.name = item.name;
                summary.remark = item.remark || '';
                summary.currentValue = roundMoney(item.value);
            } else {
                summaries.set(item.id, {
                    id: item.id,
                    type,
                    name: item.name,
                    remark: item.remark || '',
                    entries: [],
                    startValue: 0,
                    totalFlow: 0,
                    totalGrowth: 0,
                    status: 'unsaved',
                    closedDate: null,
                    currentValue: roundMoney(item.value)
                });
            }
        });
    });

    // Active items follow the order of the tables; closed items come last
    const tableOrder = [...(financeData.investments || []), ...(financeData.loans || [])].map(item => item.id);
    const orderOf = (summary) => {
        const index = tableOrder.indexOf(summary.id);
        return index === -1 ? tableOrder.length : index;
    };

    return [...summaries.values()]
        .sort((a, b) => orderOf(a) - orderOf(b))
        .map(summary => ({
            ...summary,
            currentValue: summary.status === 'closed' ? 0 : (summary.currentValue ?? 0),
            totalGrowthPercent: getTotalGrowthPercent(summary),
            xirr: summary.type === 'loan' ? null : calculateXirr(getItemCashFlows(summary))
        }));
}

function getMoneyPutIn(summary) {
    return summary.startValue + summary.entries.reduce((sum, entry) => sum + Math.max(entry.flow, 0), 0);
}

function getTotalGrowthPercent(summary) {
    if (summary.type === 'loan') return null;
    const moneyPutIn = getMoneyPutIn(summary);
    return moneyPutIn > 0 ? roundMoney((summary.totalGrowth / moneyPutIn) * 100) : null;
}

function getMonthEnd(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
}

function getMonthMiddle(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 15, 12);
}

// Money in/out counts on the 15th and saved values count as month-end.
// Amounts are from the investor's side: paid in is negative, received positive.
function getItemCashFlows(summary) {
    const flows = [];
    summary.entries.forEach(entry => {
        if (entry.baseline) {
            flows.push({ date: getMonthEnd(entry.date), amount: -entry.value });
        } else if (entry.flow) {
            flows.push({ date: getMonthMiddle(entry.date), amount: -entry.flow });
        }
    });

    const last = summary.entries[summary.entries.length - 1];
    if (last?.value > 0) {
        flows.push({ date: getMonthEnd(last.date), amount: last.value });
    }
    return flows;
}

// Returns the yearly rate as a percentage, or null if there is no answer,
// such as before any growth period exists or after a total loss.
function calculateXirr(flows) {
    const amounts = flows.filter(flow => flow.amount !== 0);
    if (!amounts.some(flow => flow.amount > 0) || !amounts.some(flow => flow.amount < 0)) return null;

    const times = amounts.map(flow => flow.date.getTime());
    const firstTime = Math.min(...times);
    if (firstTime === Math.max(...times)) return null;

    const yearsOf = (flow) => (flow.date.getTime() - firstTime) / (365 * 24 * 60 * 60 * 1000);
    const netValue = (rate) => amounts.reduce(
        (sum, flow) => sum + flow.amount / Math.pow(1 + rate, yearsOf(flow)),
        0
    );

    if (Math.abs(netValue(0)) < 0.005) return 0;

    // Search outward from 0 so the answer closest to 0 is found first
    const upward = [0, 0.1, 0.5, 1, 5, 10, 100, 1000, 100000, 10000000];
    const downward = [0, -0.1, -0.5, -0.9, -0.99, -0.9999, -0.999999];
    for (const steps of [upward, downward]) {
        for (let i = 1; i < steps.length; i++) {
            let low = steps[i - 1];
            let high = steps[i];
            if (netValue(low) * netValue(high) > 0) continue;

            for (let round = 0; round < 200; round++) {
                const middle = (low + high) / 2;
                if (netValue(low) * netValue(middle) <= 0) high = middle;
                else low = middle;
            }
            return roundMoney(((low + high) / 2) * 100);
        }
    }
    return null;
}

// True only for items saved in an earlier month. A row created and removed in
// the same month has no real history, so it is deleted rather than closed.
function isItemInPastRecords(id, records, now = new Date()) {
    const currentMonth = monthKey(now);
    return (records || []).some(record =>
        monthKey(record.date) < currentMonth && (record.items || []).some(item => item.id === id)
    );
}

function findCurrentMonthRecord(records, now = new Date()) {
    const currentMonth = monthKey(now);
    return (records || []).find(record => monthKey(record.date) === currentMonth);
}

function getItemLabel(item) {
    return item.remark ? `${item.name} (${item.remark})` : item.name;
}

function formatSignedAmount(amount) {
    if (!amount) return formatCurrency(0);
    return `${amount > 0 ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
}

function formatPercent(percent) {
    return percent === null || percent === undefined ? '—' : `${percent.toFixed(1)}%`;
}

function getEntryMonthLabel(entry) {
    const month = new Date(entry.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return entry.pending ? `${month} (closed, not yet saved)` : month;
}

function getGrowthClass(type, growth) {
    if (type === 'loan' || !growth) return '';
    return growth > 0 ? 'text-success' : 'text-danger';
}

function createSummaryRow(summary) {
    const typeLabel = summary.type === 'loan' ? 'Loan' : 'Investment';
    const growthText = summary.status === 'unsaved' ? '—' : formatCurrency(summary.totalGrowth);
    const statusBadge = summary.status === 'unsaved'
        ? '<span class="badge bg-warning text-dark">Not saved yet</span>'
        : summary.status === 'closed'
            ? '<span class="badge bg-secondary">Closed</span>'
            : '<span class="badge bg-success">Active</span>';
    const detailsButton = summary.entries.length > 0
        ? `<button class="btn btn-sm btn-primary" data-item-id="${escapeHtml(summary.id)}" onclick="showItemHistory(this.dataset.itemId)"><i class="fas fa-eye"></i> View</button>`
        : '';

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${escapeHtml(getItemLabel(summary))}</td>
        <td>${typeLabel}</td>
        <td class="col-num">${formatCurrency(summary.currentValue)}</td>
        <td class="col-num">${formatSignedAmount(summary.totalFlow)}</td>
        <td class="col-num ${getGrowthClass(summary.type, summary.totalGrowth)}">${growthText}</td>
        <td class="col-num">${formatPercent(summary.totalGrowthPercent)}</td>
        <td class="col-num">${formatPercent(summary.xirr)}</td>
        <td>${statusBadge}</td>
        <td>${detailsButton}</td>
    `;
    return row;
}

function fillSummaryTable(tbody, summaries, emptyMessage) {
    tbody.innerHTML = '';
    if (summaries.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="9" class="text-center item-history-muted">${emptyMessage}</td>`;
        tbody.appendChild(row);
        return;
    }
    summaries.forEach(summary => tbody.appendChild(createSummaryRow(summary)));
}

function getOverallReturns(summaries) {
    const investments = summaries.filter(summary => summary.type === 'investment' && summary.entries.length > 0);
    const totalGrowth = investments.reduce((sum, summary) => sum + summary.totalGrowth, 0);
    const moneyPutIn = investments.reduce((sum, summary) => sum + getMoneyPutIn(summary), 0);
    return {
        returnSoFar: moneyPutIn > 0 ? roundMoney((totalGrowth / moneyPutIn) * 100) : null,
        xirr: calculateXirr(investments.flatMap(getItemCashFlows))
    };
}

function renderItemHistory() {
    const activeBody = document.querySelector('#itemHistoryActive tbody');
    const closedBody = document.querySelector('#itemHistoryClosed tbody');
    if (!activeBody || !closedBody) return;

    const summaries = buildItemSummaries(data, historicalNetWorth);
    const overall = getOverallReturns(summaries);
    document.getElementById('itemHistoryOverallReturn').textContent = formatPercent(overall.returnSoFar);
    document.getElementById('itemHistoryOverallXirr').textContent = formatPercent(overall.xirr);

    fillSummaryTable(
        activeBody,
        summaries.filter(summary => summary.status !== 'closed'),
        'Add an investment or loan, then save a monthly record to start its history.'
    );
    fillSummaryTable(
        closedBody,
        summaries.filter(summary => summary.status === 'closed'),
        'No closed items yet.'
    );
}

function destroyItemHistoryChart() {
    if (itemHistoryChart) {
        itemHistoryChart.destroy();
        itemHistoryChart = null;
    }
}

function drawItemHistoryChart(summary) {
    const canvas = document.getElementById('itemHistoryChart');
    if (!canvas) return;
    destroyItemHistoryChart();

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#D9CFB8' : '#5B584E';
    const gridColor = isDarkMode ? 'rgba(243, 236, 221, 0.10)' : 'rgba(27, 27, 24, 0.08)';

    itemHistoryChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: summary.entries.map(entry =>
                new Date(entry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            ),
            datasets: [{
                label: summary.type === 'loan' ? 'Outstanding balance' : 'Value',
                data: summary.entries.map(entry => entry.value),
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primary,
                borderWidth: 2,
                tension: 0.2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } },
                datalabels: { display: false },
                tooltip: {
                    callbacks: { label: context => formatCurrency(context.parsed.y) }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        }
    });
}

function showItemHistory(id) {
    const summary = buildItemSummaries(data, historicalNetWorth).find(item => item.id === id);
    if (!summary) return;

    const isLoan = summary.type === 'loan';
    document.getElementById('itemHistoryTitle').textContent = getItemLabel(summary);
    document.getElementById('itemHistoryReturns').textContent = isLoan
        ? ''
        : `Return So Far: ${formatPercent(summary.totalGrowthPercent)} | XIRR: ${formatPercent(summary.xirr)}`;
    document.getElementById('itemHistoryFlowHeading').textContent = isLoan ? 'Paid/received' : 'Money in/out';
    document.getElementById('itemHistoryGrowthHeading').textContent = isLoan ? 'Interest' : 'Growth';

    const tbody = document.querySelector('#itemHistoryEntries tbody');
    tbody.innerHTML = '';
    [...summary.entries].reverse().forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = entry.baseline
            ? `<td>${getEntryMonthLabel(entry)}</td>
               <td colspan="2" class="item-history-muted">Starting point</td>
               <td class="col-num">${formatCurrency(entry.value)}</td>
               <td class="col-num">—</td>
               <td class="col-num">—</td>`
            : `<td>${getEntryMonthLabel(entry)}</td>
               <td class="col-num">${formatCurrency(entry.opening)}</td>
               <td class="col-num">${formatSignedAmount(entry.flow)}</td>
               <td class="col-num">${formatCurrency(entry.value)}</td>
               <td class="col-num ${getGrowthClass(summary.type, entry.growth)}">${formatCurrency(entry.growth)}</td>
               <td class="col-num">${formatPercent(entry.growthPercent)}</td>`;
        tbody.appendChild(row);
    });

    const modalElement = document.getElementById('itemHistoryModal');
    modalElement.addEventListener('shown.bs.modal', () => drawItemHistoryChart(summary), { once: true });
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function renderMonthItemBreakdown(record) {
    const container = document.getElementById('modalItemBreakdown');
    if (!container) return;

    if (!Array.isArray(record.items)) {
        container.innerHTML = '<p class="item-history-muted mb-0">Item details were not recorded for this month.</p>';
        return;
    }

    const rows = buildItemSummaries(data, historicalNetWorth).flatMap(summary => {
        const entry = summary.entries.find(item => item.date === record.date);
        return entry ? [{ summary, entry }] : [];
    });

    if (rows.length === 0) {
        container.innerHTML = '<p class="item-history-muted mb-0">No investments or loans were recorded for this month.</p>';
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="col-num">Opening</th>
                        <th class="col-num">In/out</th>
                        <th class="col-num">Value</th>
                        <th class="col-num">Growth / interest</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(({ summary, entry }) => `
                        <tr>
                            <td>${escapeHtml(getItemLabel(summary))}</td>
                            <td class="col-num">${entry.baseline ? '—' : formatCurrency(entry.opening)}</td>
                            <td class="col-num">${entry.baseline ? '—' : formatSignedAmount(entry.flow)}</td>
                            <td class="col-num">${formatCurrency(entry.value)}</td>
                            <td class="col-num ${getGrowthClass(summary.type, entry.growth)}">${entry.baseline ? 'Starting point' : formatCurrency(entry.growth)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getItemHistoryExportRows() {
    const rows = [['Month', 'Item', 'Type', 'Status', 'Opening', 'Money In/Out', 'Value', 'Growth/Interest', 'Growth %']];
    buildItemSummaries(data, historicalNetWorth).forEach(summary => {
        summary.entries.forEach(entry => {
            rows.push([
                getEntryMonthLabel(entry),
                getItemLabel(summary),
                summary.type === 'loan' ? 'Loan' : 'Investment',
                summary.status === 'closed' ? 'Closed' : 'Active',
                entry.opening,
                entry.baseline ? null : entry.flow,
                entry.value,
                entry.growth,
                entry.growthPercent
            ]);
        });
    });
    return rows;
}

// Runs the close popup. Resolves to the closing details, or null if cancelled.
async function promptItemClosure(type, itemLabel) {
    const isLoan = type === 'loan';
    const today = new Date();
    const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const result = await Swal.fire({
        title: isLoan ? 'Close this loan?' : 'Close this investment?',
        html: `
            <p>${escapeHtml(itemLabel)} will leave this table and its history will be kept.</p>
            <div class="mb-3 text-start">
                <label class="form-label" for="closeItemAmount">${isLoan ? 'Final amount paid' : 'Final amount received'}</label>
                <input type="number" class="form-control" id="closeItemAmount" min="0" step="0.01" placeholder="0">
            </div>
            <div class="text-start">
                <label class="form-label" for="closeItemDate">Closing date</label>
                <input type="date" class="form-control" id="closeItemDate" value="${todayValue}" max="${todayValue}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Close item',
        cancelButtonText: 'Keep it',
        confirmButtonColor: chartColors.primary,
        preConfirm: () => {
            const amountText = document.getElementById('closeItemAmount').value;
            const finalAmount = parseFloat(amountText);
            const closedDate = document.getElementById('closeItemDate').value;
            if (amountText === '' || !Number.isFinite(finalAmount) || finalAmount < 0) {
                Swal.showValidationMessage('Enter the final amount. Use 0 if nothing was received or paid.');
                return false;
            }
            if (!closedDate || closedDate > todayValue) {
                Swal.showValidationMessage('Enter a closing date that is not in the future.');
                return false;
            }
            return { finalAmount, closedDate };
        }
    });

    return result.isConfirmed ? result.value : null;
}

function readTrackedRow(row, tableId) {
    const prefix = tableId === 'loans' ? 'loan' : 'investment';
    return {
        id: row.dataset.itemId,
        type: TRACKED_SECTIONS[tableId],
        name: row.querySelector(`[name="${prefix}_name"]`)?.value || 'Unnamed',
        remark: row.querySelector(`[name="${prefix}_remark"]`)?.value || '',
        flow: parseFloat(row.querySelector(`[name="${prefix}_flow"]`)?.value) || 0
    };
}

async function closeTrackedItem(row, tableId) {
    const item = readTrackedRow(row, tableId);
    const closure = await promptItemClosure(item.type, getItemLabel(item));
    if (!closure) return;

    data.closedItems.push({ ...item, ...closure });
    performRowRemoval(row, async () => {
        await refreshCurrentMonthRecord();
        renderItemHistory();
    });
}

// Keeps the record and saved data in step after a row is closed or removed.
async function refreshCurrentMonthRecord() {
    if (findCurrentMonthRecord(historicalNetWorth)) {
        await window.saveMonthlyNetWorth({ silent: true });
    } else if (typeof window.update === 'function') {
        window.update();
        await window.saveData();
    }
}

window.generateItemId = generateItemId;
window.renderItemHistory = renderItemHistory;
window.showItemHistory = showItemHistory;
window.closeTrackedItem = closeTrackedItem;

if (typeof document !== 'undefined') {
    document.getElementById('itemHistoryModal')?.addEventListener('hidden.bs.modal', destroyItemHistoryChart);
}
