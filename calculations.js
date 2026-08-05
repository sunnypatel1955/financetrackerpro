function adjustColor(color, factor) {
    console.log('adjustColor function called');
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const adjust = (value) => Math.min(255, Math.max(0, Math.round(value * factor)));
    
    return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
}

function update() {
    console.log('update function called');
    
    if (typeof window.data !== 'undefined') {
        window.previousData = JSON.parse(JSON.stringify(window.data));
    }
    
    const initialCashInput = document.getElementById('initial_cash');
    if (initialCashInput && window.data) {
        const cashValue = parseFloat(initialCashInput.value) || 0;
        window.data.initial_cash = cashValue;
        console.log('update: Set initial_cash to:', cashValue);
    }
    
    const currencySelect = document.getElementById('currency');
    if (currencySelect && window.data && window.data.settings) {
        window.data.settings.currency = currencySelect.value;
    }
    
    if (!window.data) {
        console.warn('update: No data object found');
        return;
    }
    
    window.data.investments = Array.from(document.querySelectorAll('#investments tbody tr')).map(row => ({
        name: row.querySelector('[name="investment_name"]')?.value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="investment_value"]')?.value) || 0,
        return: parseFloat(row.querySelector('[name="investment_return"]')?.value) || 0,
        risk: row.querySelector('[name="investment_risk"]')?.value || 'low',
        remark: row.querySelector('[name="investment_remark"]')?.value || '',
        dateAdded: new Date().toISOString()
    }));
    
    window.data.income = Array.from(document.querySelectorAll('#income tbody tr')).map(row => ({
        name: row.querySelector('[name="income_name"]')?.value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="income_value"]')?.value) || 0,
        remark: row.querySelector('[name="income_remark"]')?.value || ''
    }));
    
    window.data.loans = Array.from(document.querySelectorAll('#loans tbody tr')).map(row => ({
        name: row.querySelector('[name="loan_name"]')?.value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="loan_value"]')?.value) || 0,
        interest: parseFloat(row.querySelector('[name="loan_interest"]')?.value) || 0,
        remark: row.querySelector('[name="loan_remark"]')?.value || ''
    }));
    
    window.data.expenses = Array.from(document.querySelectorAll('#expenses tbody tr')).map(row => ({
        name: row.querySelector('[name="expense_category"]')?.value || 'Other',
        type: row.querySelector('[name="expense_type"]')?.value || 'Recurring',
        value: parseFloat(row.querySelector('[name="expense_value"]')?.value) || 0,
        category: row.querySelector('[name="expense_category"]')?.value || 'Other',
        remark: row.querySelector('[name="expense_remark"]')?.value || ''
    }));
    
    window.data.goals = Array.from(document.querySelectorAll('#goals tbody tr')).map(row => ({
        name: row.querySelector('[name="goal_name"]')?.value || 'Unnamed',
        target: parseFloat(row.querySelector('[name="goal_target"]')?.value) || 0,
        time: row.querySelector('[name="goal_time"]')?.value || 'N/A'
    }));
    
    if (!validateInputs()) {
        console.warn('update: Input validation failed');
        return;
    }
    
    performCalculations();

    // Add this at the end of your update() function
    if (typeof window.updateFinancialHealthScore === 'function') {
        window.updateFinancialHealthScore();
    }
    
    if (typeof window.updateAllCharts === 'function') {
        window.updateAllCharts();
    }
    
    if (typeof window.updateSummaryCards === 'function') {
        window.updateSummaryCards();
    }
    
    if (window.data.settings?.autoSave && window.hasCookieConsent) {
        if (typeof window.saveData === 'function') {
            window.saveData();
        }
    }
    
    if (typeof updateMonthlyRecordsTable === 'function') {
        updateMonthlyRecordsTable();
    }
    if (typeof updateInsights === 'function') {
        updateInsights();
    }
    showError(''); // Clear any previous errors
}

function performCalculations() {
    console.log('performCalculations function called');
    if (!window.data) return;
    
    const totalInvestments = window.data.investments.reduce((sum, i) => sum + (i.value || 0), 0);
    const totalLoans = window.data.loans.reduce((sum, l) => sum + (l.value || 0), 0);
    const totalIncome = window.data.income.reduce((sum, s) => sum + (s.value || 0), 0);
    const totalRecurringExpenses = window.data.expenses
        .filter(e => e.type === 'Recurring')
        .reduce((sum, e) => sum + (e.value || 0), 0);
    const totalExpenses = window.data.expenses.reduce((sum, e) => sum + (e.value || 0), 0);
    
    const initialCash = parseFloat(window.data.initial_cash) || 0;
    const netWorth = initialCash + totalInvestments - totalLoans;
    
    console.log('performCalculations: Values calculated:', {
        initialCash,
        totalInvestments,
        totalLoans,
        netWorth
    });
    
    const netWorthInput = document.getElementById('netWorth');
    const totalInvestmentsInput = document.getElementById('totalInvestments');
    const totalLoansInput = document.getElementById('totalLoans');
    
    if (netWorthInput) {
        netWorthInput.value = formatCurrency(netWorth);
        console.log('performCalculations: Updated netWorth display to:', netWorthInput.value);
    }
    if (totalInvestmentsInput) totalInvestmentsInput.value = formatCurrency(totalInvestments);
    if (totalLoansInput) totalLoansInput.value = formatCurrency(totalLoans);
    
    window.data.goals.forEach((goal, index) => {
        const row = document.querySelectorAll('#goals tbody tr')[index];
        if (!row) return;
        
        const monthlySavings = totalIncome - totalRecurringExpenses;
        
        let avgReturn = 0;
        if (totalInvestments > 0 && window.data.investments.length > 0) {
            const weightedReturnSum = window.data.investments.reduce((sum, i) => {
                return sum + ((i.value || 0) * (i.return || 0));
            }, 0);
            avgReturn = weightedReturnSum / totalInvestments / 100;
        }
        
        const avgInterest = window.data.loans.length > 0
            ? window.data.loans.reduce((sum, l) => sum + (l.interest || 0), 0) / window.data.loans.length / 100
            : 0;
        
        let currentValue = netWorth;
        let months = 0;
        
        if (goal.target > 0) {
            const progress = Math.min((netWorth / goal.target) * 100, 100);
            const progressBar = row.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${progress.toFixed(0)}%`;
            }
            
            if (monthlySavings > 0 || avgReturn > avgInterest) {
                const monthlyReturn = avgReturn / 12;
                const monthlyInterest = avgInterest / 12;
                const netMonthlyReturn = monthlyReturn - monthlyInterest;
                
                while (currentValue < goal.target && months < 1200) {
                    currentValue = currentValue * (1 + netMonthlyReturn) + monthlySavings;
                    months++;
                }
                
                const timeInput = row.querySelector('[name="goal_time"]');
                if (timeInput) {
                    if (months >= 1200) {
                        timeInput.value = '>100 years';
                    } else if (netWorth >= goal.target) {
                        timeInput.value = 'Achieved!';
                    } else {
                        const years = Math.floor(months / 12);
                        const remainingMonths = months % 12;
                        timeInput.value = years > 0 
                            ? `${years}y ${remainingMonths}m`
                            : `${remainingMonths}m`;
                    }
                }
            } else {
                const timeInput = row.querySelector('[name="goal_time"]');
                if (timeInput) {
                    timeInput.value = monthlySavings <= 0 ? 'Need positive savings' : 'N/A';
                }
            }
        }
    });
}

function validateInputs() {
    console.log('validateInputs function called');
    if (!window.data) return false;
    
    const errors = [];
    const maxErrors = 10;
    
    // Validate with early exit
    if (window.data.initial_cash < 0) {
        errors.push("Liquid Cash cannot be negative");
    }
    
    // Use for...of with early break for better performance
    for (const [index, inv] of (window.data.investments || []).entries()) {
        if (errors.length >= maxErrors) break;
        
        if (inv.value < 0) {
            errors.push(`Investment #${index + 1}: Value cannot be negative`);
        }
        if (inv.return < -100 || inv.return > 100) {
            errors.push(`Investment #${index + 1}: Return must be between -100% and 100%`);
        }
    }
    
    // Display errors
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        if (errors.length > 0) {
            const displayErrors = errors.slice(0, maxErrors);
            if (errors.length > maxErrors) {
                displayErrors.push(`... and ${errors.length - maxErrors} more errors`);
            }
            
            errorDiv.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <strong>Validation Errors:</strong>
                    <ul class="mb-0">
                        ${displayErrors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            `;
            errorDiv.style.display = 'block';
        } else {
            errorDiv.innerHTML = '';
            errorDiv.style.display = 'none';
        }
    }
    
    return errors.length === 0;
}

function updateInsights() {
    console.log('updateInsights function called');
    
    if (!window.historicalNetWorth || window.historicalNetWorth.length < 2) {
        const growthRateElement = document.getElementById('growthRate');
        const volatilityElement = document.getElementById('volatility');
        const bestWorstMonthElement = document.getElementById('bestWorstMonth');
        const actionableInsightsElement = document.getElementById('actionableInsights');
        
        if (growthRateElement) growthRateElement.textContent = 'Not enough data (need 2+ months)';
        if (volatilityElement) volatilityElement.textContent = 'Not enough data';
        if (bestWorstMonthElement) bestWorstMonthElement.textContent = 'Not enough data';
        if (actionableInsightsElement) {
            actionableInsightsElement.innerHTML = '<p>Add more monthly records to get personalized insights and recommendations.</p>';
        }
        return;
    }
    
    const monthlyChanges = [];
    const monthlyGrowthRates = [];
    let bestMonth = { change: -Infinity, date: null };
    let worstMonth = { change: Infinity, date: null };
    
    const sortedRecords = [...window.historicalNetWorth].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 1; i < sortedRecords.length; i++) {
        const current = sortedRecords[i];
        const previous = sortedRecords[i - 1];
        const change = current.netWorth - previous.netWorth;
        const growthRate = previous.netWorth > 0 ? (change / previous.netWorth) * 100 : 0;
        
        monthlyChanges.push(change);
        monthlyGrowthRates.push(growthRate);
        
        if (change > bestMonth.change) {
            bestMonth = { change, date: new Date(current.date) };
        }
        if (change < worstMonth.change) {
            worstMonth = { change, date: new Date(current.date) };
        }
    }
    
    const avgGrowthRate = monthlyGrowthRates.length > 0
        ? monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length
        : 0;
    
    const meanChange = monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length;
    const squaredDiffs = monthlyChanges.map(change => Math.pow(change - meanChange, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / monthlyChanges.length;
    const volatility = Math.sqrt(variance);
    
    const avgNetWorth = sortedRecords.reduce((sum, record) => sum + record.netWorth, 0) / sortedRecords.length;
    const volatilityPercentage = avgNetWorth > 0 ? (volatility / avgNetWorth) * 100 : 0;
    
    const formatDate = (date) => date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
    });
    
    const growthRateCard = document.getElementById('growthRate');
    if (growthRateCard) {
        growthRateCard.textContent = `${avgGrowthRate >= 0 ? '+' : ''}${avgGrowthRate.toFixed(1)}% monthly average`;
        const cardElement = growthRateCard.closest('.insight-card');
        if (cardElement) {
            cardElement.classList.remove('positive', 'negative', 'neutral');
            cardElement.classList.add(
                avgGrowthRate > 2 ? 'positive' : avgGrowthRate < -2 ? 'negative' : 'neutral'
            );
        }
    }
    
    const volatilityCard = document.getElementById('volatility');
    if (volatilityCard) {
        let stabilityText = '';
        if (volatilityPercentage < 5) stabilityText = 'Very Stable';
        else if (volatilityPercentage < 10) stabilityText = 'Moderately Stable';
        else if (volatilityPercentage < 20) stabilityText = 'Somewhat Volatile';
        else stabilityText = 'Highly Volatile';
        
        volatilityCard.textContent = `${stabilityText} (${volatilityPercentage.toFixed(1)}% volatility)`;
        const cardElement = volatilityCard.closest('.insight-card');
        if (cardElement) {
            cardElement.classList.remove('positive', 'negative', 'neutral');
            cardElement.classList.add(
                volatilityPercentage < 10 ? 'positive' : volatilityPercentage < 20 ? 'neutral' : 'negative'
            );
        }
    }
    
    const bestWorstMonthCard = document.getElementById('bestWorstMonth');
    if (bestWorstMonthCard && bestMonth.date && worstMonth.date) {
        bestWorstMonthCard.innerHTML = `
            <strong>Best:</strong> ${formatDate(bestMonth.date)} (${formatCurrency(bestMonth.change)})<br>
            <strong>Worst:</strong> ${formatDate(worstMonth.date)} (${formatCurrency(worstMonth.change)})
        `;
    }
    
    const insights = generateActionableInsights(avgGrowthRate, volatilityPercentage);
    const actionableInsightsCard = document.getElementById('actionableInsights');
    if (actionableInsightsCard) {
        actionableInsightsCard.innerHTML = `<ul>${insights.map(item => `<li>${item}</li>`).join('')}</ul>`;
    }
}


function generateActionableInsights(avgGrowthRate, volatilityPercentage) {
    console.log('generateActionableInsights function called');
    if (!window.data) return ['Data not available for insights.'];
    
    const insights = [];
    
    const totalIncome = window.data.income.reduce((sum, inc) => sum + inc.value, 0);
    const totalExpenses = window.data.expenses.reduce((sum, exp) => sum + exp.value, 0);
    const totalInvestments = window.data.investments.reduce((sum, i) => sum + i.value, 0);
    const totalLoans = window.data.loans.reduce((sum, l) => sum + l.value, 0);
    const netWorth = window.data.initial_cash + totalInvestments - totalLoans;
    
    if (avgGrowthRate > 5) {
        insights.push(`Excellent! Your wealth is growing at ${avgGrowthRate.toFixed(1)}% monthly. Consider increasing investments to accelerate growth.`);
    } else if (avgGrowthRate > 0) {
        insights.push(`Your net worth is growing at ${avgGrowthRate.toFixed(1)}% monthly. Good progress, but there's room for improvement.`);
    } else if (avgGrowthRate < 0) {
        insights.push(`⚠️ Your net worth is declining at ${Math.abs(avgGrowthRate).toFixed(1)}% monthly. Review expenses and consider additional income sources.`);
    }
    
    if (volatilityPercentage > 30) {
        insights.push('📊 High volatility detected. Consider diversifying investments and building an emergency fund.');
    } else if (volatilityPercentage > 20) {
        insights.push('📈 Moderate volatility in your finances. Consider reviewing your risk tolerance.');
    } else if (volatilityPercentage < 5) {
        insights.push('💪 Very stable financial performance! Your strategy is working well.');
    } else {
        insights.push('✅ Good financial stability. Continue monitoring and maintain your current approach.');
    }
    
    if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
        
        if (savingsRate >= 30) {
            insights.push(`💪 Excellent savings rate of ${savingsRate.toFixed(1)}%! You're on track for financial independence.`);
        } else if (savingsRate >= 20) {
            insights.push(`Good savings rate of ${savingsRate.toFixed(1)}%. Try to reach 30% for faster wealth building.`);
        } else if (savingsRate >= 10) {
            insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% to build long-term wealth.`);
        } else if (savingsRate > 0) {
            insights.push(`⚠️ Low savings rate of ${savingsRate.toFixed(1)}%. Focus on reducing expenses or increasing income.`);
        } else {
            insights.push(`🚨 You're spending more than you earn! Create a budget immediately to control expenses.`);
        }
    }
    
    const investmentTypes = new Set(window.data.investments.map(i => i.name)).size;
    if (investmentTypes < 3 && window.data.investments.length > 0) {
        insights.push('💡 Consider diversifying across more investment types to reduce risk.');
    } else if (investmentTypes >= 5) {
        insights.push('👍 Good diversification across investment types.');
    }
    
    const monthlyExpenses = totalExpenses;
    const liquidCash = window.data.initial_cash;
    const emergencyFundMonths = monthlyExpenses > 0 ? liquidCash / monthlyExpenses : 0;
    
    if (emergencyFundMonths < 3) {
        insights.push('🚨 Build an emergency fund covering 3-6 months of expenses.');
    } else if (emergencyFundMonths >= 6) {
        insights.push('💰 Great emergency fund! You have good financial security.');
    }
    
    return insights.length > 0 ? insights : ['Keep tracking your finances regularly for personalized insights.'];
}

function calculate() {
    console.log('calculate: Manual calculation triggered');
    update();
    if (typeof window.showNotification === 'function') {
        window.showNotification('Calculations updated successfully', 'success');
    }
}

function formatCurrency(amount) {
    console.log('formatCurrency function called');
    if (typeof window.formatCurrency === 'function') {
        return window.formatCurrency(amount);
    }
    
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect ? currencySelect.value : 'INR';
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
}

function showError(message) {
    console.log('showError function called');
    if (typeof window.showError === 'function') {
        window.showError(message);
    } else {
        console.error('Error:', message);
    }
}

function startAutoSave() {
    console.log('startAutoSave function called');
    if (window.autoSaveTimer) {
        clearInterval(window.autoSaveTimer);
        window.autoSaveTimer = null;
    }
    
    if (window.data?.settings?.autoSave !== false) {
        window.autoSaveTimer = setInterval(() => {
            const consentCheck = typeof window.hasCookieConsent !== 'undefined' ? window.hasCookieConsent : true;
            if (consentCheck && typeof window.saveData === 'function') {
                window.saveData().catch(error => {
                    console.error('Auto-save error:', error);
                });
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('Auto-save enabled (5-minute interval)');
    }
}

function stopAutoSave() {
    console.log('stopAutoSave function called');
    if (window.autoSaveTimer) {
        clearInterval(window.autoSaveTimer);
        window.autoSaveTimer = null;
        console.log('Auto-save disabled');
    }
}

function showNotification(message, type = 'info') {
    console.log('showNotification function called');
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function cleanupResources() {
    console.log('cleanupResources function called');
    
    stopAutoSave();
    
    if (window.calculationTimeout) {
        clearTimeout(window.calculationTimeout);
    }
}

function setupOptimizedEventListeners() {
    console.log('setupOptimizedEventListeners function called');
    
    const inputs = document.querySelectorAll('input[type="number"], select, input[type="text"]:not([readonly])');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (typeof window.debouncedUpdate === 'function') {
                window.debouncedUpdate();
            }
        });
    });
}
// Fixed calculateFinancialHealthScore function
function calculateFinancialHealthScore() {
    console.log('calculateFinancialHealthScore function called');
    
    if (!window.data) return { score: 0, breakdown: {}, grade: getFinancialGrade(0) };
    
    const scores = {
        savingsRate: 0,
        debtRatio: 0,
        emergencyFund: 0,
        investmentDiversity: 0,
        netWorthGrowth: 0
    };
    
    // 1. Savings Rate Score (20 points max)
    const totalIncome = window.data.income.reduce((sum, i) => sum + (i.value || 0), 0);
    const totalExpenses = window.data.expenses.reduce((sum, e) => sum + (e.value || 0), 0);
    if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
        scores.savingsRate = Math.min(20, Math.max(0, savingsRate * 0.67)); // 30% savings = 20 points
    }
    
    // 2. Debt-to-Income Ratio Score (20 points max)
    const totalLoans = window.data.loans.reduce((sum, l) => sum + (l.value || 0), 0);
    if (totalIncome > 0) {
        const debtRatio = (totalLoans / (totalIncome * 12)) * 100; // Annual income
        scores.debtRatio = Math.max(0, 20 - (debtRatio * 0.5)); // 0% debt = 20 points, 40% debt = 0 points
    } else {
        scores.debtRatio = totalLoans === 0 ? 20 : 0;
    }
    
    // 3. Emergency Fund Score (20 points max)
    const liquidCash = window.data.initial_cash || 0;
    const monthlyExpenses = totalExpenses;
    if (monthlyExpenses > 0) {
        const emergencyMonths = liquidCash / monthlyExpenses;
        scores.emergencyFund = Math.min(20, emergencyMonths * 3.33); // 6 months = 20 points
    } else {
        scores.emergencyFund = liquidCash > 0 ? 20 : 0;
    }
    
    // 4. Investment Diversity Score (20 points max)
    const investmentTypes = new Set(window.data.investments.map(i => i.name)).size;
    const totalInvestments = window.data.investments.reduce((sum, i) => sum + (i.value || 0), 0);
    if (totalInvestments > 0) {
        scores.investmentDiversity = Math.min(20, investmentTypes * 4); // 5 types = 20 points
    }
    
    // 5. Net Worth Growth Score (20 points max)
    // 5. Net Worth Growth Score (20 points max)
if (window.historicalNetWorth && window.historicalNetWorth.length >= 3) {
    const recent = window.historicalNetWorth.slice(-3);
    const oldestNetWorth = recent[0].netWorth;
    const newestNetWorth = recent[recent.length - 1].netWorth;
    if (oldestNetWorth > 0) {
        // Calculate monthly growth rate
        const monthsSpan = recent.length - 1; // Should be 2 for 3 records
        const totalGrowthRate = ((newestNetWorth - oldestNetWorth) / oldestNetWorth) * 100;
        const monthlyGrowthRate = totalGrowthRate / monthsSpan;
        
        // More realistic scoring:
        // 0% monthly = 0 points
        // 1% monthly = 10 points (12% annual)
        // 2% monthly = 18 points (24% annual)
        // 2.5%+ monthly = 20 points (30%+ annual)
        scores.netWorthGrowth = Math.min(20, Math.max(0, monthlyGrowthRate * 8));
    }
}
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    return {
        score: Math.round(totalScore),
        breakdown: scores,
        grade: getFinancialGrade(totalScore)
    };
}

function getFinancialGrade(score) {
    if (score >= 90) return { grade: 'A+', color: '#10d164', label: 'Excellent' };
    if (score >= 80) return { grade: 'A', color: '#28a745', label: 'Very Good' };
    if (score >= 70) return { grade: 'B', color: '#17a2b8', label: 'Good' };
    if (score >= 60) return { grade: 'C', color: '#ffc107', label: 'Fair' };
    if (score >= 50) return { grade: 'D', color: '#fd7e14', label: 'Poor' };
    return { grade: 'F', color: '#dc3545', label: 'Needs Improvement' };
}

// Enhanced updateFinancialHealthScore function
function updateFinancialHealthScore() {
    console.log('updateFinancialHealthScore function called');
    
    const healthData = calculateFinancialHealthScore();
    console.log('Health score calculated:', healthData);
    
    // Update main score display
    const scoreElement = document.getElementById('healthScoreValue');
    const gradeElement = document.getElementById('healthScoreGrade');
    const labelElement = document.getElementById('healthScoreLabel');
    
    if (scoreElement) scoreElement.textContent = healthData.score;
    if (gradeElement) {
        gradeElement.textContent = healthData.grade.grade;
        gradeElement.style.color = healthData.grade.color;
    }
if (labelElement) {
    labelElement.textContent = healthData.grade.label;  // Keep the text as is
    labelElement.setAttribute('style', 'color: #94a3b8 !important;');  // Change the COLOR to a neutral gray
}
    
    // Update breakdown bars
    Object.entries(healthData.breakdown).forEach(([metric, score]) => {
        const scoreElement = document.getElementById(`${metric}Score`);
        const barElement = document.getElementById(`${metric}Bar`);
        
        if (scoreElement) scoreElement.textContent = `${Math.round(score)}/20`;
        if (barElement) {
            barElement.style.width = `${(score / 20) * 100}%`;
            
            // Color based on performance
            if (score >= 15) barElement.className = 'progress-bar bg-success';
            else if (score >= 10) barElement.className = 'progress-bar bg-warning';
            else barElement.className = 'progress-bar bg-danger';
        }
    });
    
    // Draw gauge chart if canvas exists
    drawHealthScoreGauge(healthData.score);
}

// Enhanced gauge drawing function with better visuals
function drawHealthScoreGauge(score) {
    const canvas = document.getElementById('scoreGaugeCanvas');
    if (!canvas) return;
    
    // Set canvas size
    canvas.width = 240;
    canvas.height = 240;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 90;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw outer ring shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    
    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25, false);
    ctx.lineWidth = 25;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();
    
    // Reset shadow for score arc
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw score arc
    const scoreAngle = Math.PI * 0.75 + (score / 100) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, scoreAngle, false);
    ctx.lineWidth = 25;
    ctx.lineCap = 'round';
    
    // Create gradient based on score
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (score >= 80) {
        gradient.addColorStop(0, '#10d164');
        gradient.addColorStop(1, '#28a745');
    } else if (score >= 60) {
        gradient.addColorStop(0, '#ffc107');
        gradient.addColorStop(1, '#fd7e14');
    } else {
        gradient.addColorStop(0, '#dc3545');
        gradient.addColorStop(1, '#ff6b6b');
    }
    
    ctx.strokeStyle = gradient;
    ctx.stroke();
    
    // Draw inner circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 35, 0, Math.PI * 2, false);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    
    // Add tick marks
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI * 0.75);
    
    for (let i = 0; i <= 10; i++) {
        ctx.rotate((Math.PI * 1.5) / 10);
        ctx.beginPath();
        ctx.moveTo(radius - 35, 0);
        ctx.lineTo(radius - 40, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.restore();
    
    // Draw center score text
    ctx.font = 'bold 48px Inter';
    ctx.fillStyle = '#667eea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(score, centerX, centerY - 10);
    
    // Draw "out of 100" text
    ctx.font = '14px Inter';
    ctx.fillStyle = document.body.classList.contains('light-mode') ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('out of 100', centerX, centerY + 25);
}

window.update = update;
window.calculate = calculate;
window.updateInsights = updateInsights;
window.adjustColor = adjustColor;
window.performCalculations = performCalculations;
window.validateInputs = validateInputs;
window.generateActionableInsights = generateActionableInsights;
window.startAutoSave = startAutoSave;
window.stopAutoSave = stopAutoSave;
window.showNotification = showNotification;
window.cleanupResources = cleanupResources;
window.setupOptimizedEventListeners = setupOptimizedEventListeners;
// Add these to your existing global exports
window.calculateFinancialHealthScore = calculateFinancialHealthScore;
window.getFinancialGrade = getFinancialGrade;
window.updateFinancialHealthScore = updateFinancialHealthScore;
window.drawHealthScoreGauge = drawHealthScoreGauge;
