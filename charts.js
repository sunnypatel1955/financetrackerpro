// Add this at the top of charts.js after the color definitions
Chart.register(ChartDataLabels);

// 2. Fix Chart Memory Leaks - Destroy charts before recreating
function disposeChart(chartInstance) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
// Enhanced Charts Module

let charts = {};

// Chart color schemes — "The Ledger" palette
const chartColors = {
    primary: '#96713E',
    secondary: '#B08D57',
    success: '#2B6E4F',
    warning: '#9C6B12',
    danger: '#A6402F',
    info: '#2E6E8E',
    dark: '#1B1B18',
    light: '#F3ECDD'
};

const investmentColors = {
    'Fixed Income': '#2B6E4F',
    'Mutual Funds': '#2E6E8E',
    'Stocks': '#96713E',
    'Real Estate': '#6E5B47',
    'Gold': '#9C6B12',
    'Bonds': '#7C5A2E',
    'Cryptocurrency': '#A6402F',
    'Other': '#5B584E'
};

// 3. Updated initCharts with proper cleanup
function initCharts() {
    console.log('initCharts: Initializing all charts');
    
    // Destroy existing charts first to prevent memory leaks
    if (window.charts) {
        Object.keys(window.charts).forEach(key => {
            if (window.charts[key]) {
                window.charts[key].destroy();
                window.charts[key] = null;
            }
        });
    }
    
    // Reset charts object
    window.charts = {};
    
    // Set default options with performance optimizations
    Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
    // Chart cards are parchment in light mode, deep ledger-green in dark
    // mode — set a sensible starting color; updateChartColors() below
    // immediately corrects it to match the actual current theme.
    const startsDark = document.body.classList.contains('dark-mode');
    Chart.defaults.color = startsDark ? '#D9CFB8' : '#5B584E';
    Chart.defaults.borderColor = startsDark ? 'rgba(243, 236, 221, 0.10)' : 'rgba(27, 27, 24, 0.08)';
    Chart.defaults.animation.duration = 500; // Reduce animation time
    Chart.defaults.animation.animateRotate = false; // Disable rotation animation for pie charts
    Chart.defaults.animation.animateScale = false; // Disable scale animation
    
    // Initialize individual charts with error handling
    try {
        initInvestmentChart();
        initRiskChart();
        initProgressChart();
        initHistoricalChart();
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
    
    // Apply theme colors
    const isDarkMode = document.body.classList.contains('dark-mode');
    updateChartColors(isDarkMode);
}


// Initialize investment distribution chart
function initInvestmentChart() {
    const canvas = document.getElementById('investmentChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    charts.investment = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 2,
                hoverBorderWidth: 3,
                // Remove hoverOffset from here - we'll handle it dynamically
                offset: [] // Initialize empty offset array
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12,
                            weight: 500
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const dataset = data.datasets[0];
                                const total = dataset.data.reduce((sum, val) => sum + val, 0);
                                
                                return data.labels.map((label, i) => {
                                    const value = dataset.data[i];
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: dataset.backgroundColor[i],
                                        strokeStyle: dataset.borderColor[i],
                                        lineWidth: dataset.borderWidth,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : '0';
                            return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: function(context) {
                        const value = context.dataset.data[context.dataIndex];
                        const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                        const percentage = (value / total) * 100;
                        return percentage > 5; // Only show label if > 5%
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value, context) {
                        const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                        const percentage = ((value / total) * 100).toFixed(0);
                        return percentage + '%';
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            // Handle hover events
            onHover: function(event, activeElements) {
                const dataset = this.data.datasets[0];
                
                // Reset all offsets to 0
                dataset.offset = new Array(dataset.data.length).fill(0);
                
                // If there's an active element (hover), set its offset
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    dataset.offset[index] = 10; // Set hover offset for the active segment
                }
                
                // Update the chart
                this.update('none'); // Use 'none' to prevent animation on hover
            },
            // Reset offsets when mouse leaves the chart
            onLeave: function() {
                const dataset = this.data.datasets[0];
                dataset.offset = new Array(dataset.data.length).fill(0);
                this.update('none');
            }
        }
    });
}

// Initialize risk distribution chart
function initRiskChart() {
    const canvas = document.getElementById('riskChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    charts.risk = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Low Risk', 'Medium Risk', 'High Risk'],
            datasets: [{
                label: 'Investment Amount',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            weight: 600
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: function(value) {
                        return formatCurrency(value);
                    },
                    font: {
                        weight: 'bold',
                        size: 12
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Initialize progress chart (net worth projection)
function initProgressChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    charts.progress = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Projected Net Worth',
                data: [],
                borderColor: chartColors.primary,
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Initialize historical net worth chart
function initHistoricalChart() {
    const canvas = document.getElementById('historicalChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    charts.historical = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Net Worth',
                data: [],
                borderColor: chartColors.primary,
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Trend Line',
                data: [],
                borderColor: chartColors.success,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        filter: function(legendItem) {
                            // Hide trend line from legend if no data
                            if (legendItem.text === 'Trend Line' && historicalNetWorth.length < 2) {
                                return false;
                            }
                            return true;
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Trend Line') {
                                return `Projected: ${formatCurrency(context.raw)}`;
                            }
                            
                            const label = context.dataset.label || '';
                            const value = formatCurrency(context.raw);
                            
                            // Find change from previous month
                            if (context.dataIndex > 0) {
                                const prevValue = context.dataset.data[context.dataIndex - 1];
                                const change = context.raw - prevValue;
                                const changePercent = prevValue > 0 ? (change / prevValue * 100).toFixed(1) : 0;
                                const changeStr = change >= 0 ? `+${formatCurrency(change)}` : formatCurrency(change);
                                return [`${label}: ${value}`, `Change: ${changeStr} (${changePercent}%)`];
                            }
                            
                            return `${label}: ${value}`;
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// 4. Optimized updateAllCharts with throttling
let chartUpdateInProgress = false;
function updateAllCharts() {
    if (chartUpdateInProgress) {
        console.log('Chart update already in progress, skipping...');
        return;
    }
    
    chartUpdateInProgress = true;
    console.log('updateAllCharts: Updating all chart data');
    
    try {
        updateInvestmentChart();
        updateRiskChart();
        updateProgressChart();
        updateHistoricalChart();
    } catch (error) {
        console.error('Error updating charts:', error);
    } finally {
        // Reset flag after a short delay
        setTimeout(() => {
            chartUpdateInProgress = false;
        }, 100);
    }
}

// Update investment distribution chart
function updateInvestmentChart() {
    if (!charts.investment) return;
    
    // Check if data exists
    if (!window.data || !window.data.investments) {
        console.warn('updateInvestmentChart: No data available');
        return;
    }
    
    console.log('updateInvestmentChart: Updating with', window.data.investments.length, 'investments');
    
    // Group investments by type
    const investmentsByType = {};
    
    window.data.investments.forEach(inv => {
        // Use the investment name directly (from the select options)
        const investmentType = inv.name || 'Other';
        investmentsByType[investmentType] = (investmentsByType[investmentType] || 0) + (inv.value || 0);
    });
    
    const labels = Object.keys(investmentsByType);
    const values = Object.values(investmentsByType);
    const colors = labels.map(label => investmentColors[label] || investmentColors['Other']);
    
    console.log('Investment chart data:', { labels, values });
    
    // Update chart data
    charts.investment.data.labels = labels;
    charts.investment.data.datasets[0].data = values;
    charts.investment.data.datasets[0].backgroundColor = colors.map(c => c + 'CC'); // 80% opacity
    charts.investment.data.datasets[0].borderColor = colors;
    
    // Initialize offset array with zeros to prevent hover state on load
    charts.investment.data.datasets[0].offset = new Array(values.length).fill(0);
    
    // Show message if no investments
    if (values.length === 0 || values.every(v => v === 0)) {
        charts.investment.data.labels = ['No Investments'];
        charts.investment.data.datasets[0].data = [1];
        charts.investment.data.datasets[0].backgroundColor = ['#e0e0e0'];
        charts.investment.data.datasets[0].borderColor = ['#bdbdbd'];
        // Also set offset for the "No Investments" placeholder
        charts.investment.data.datasets[0].offset = [0];
    }
    
    charts.investment.update('active');
}
// Update risk distribution chart
function updateRiskChart() {
    if (!charts.risk) return;
    
    // Check if data exists
    if (!window.data || !window.data.investments) {
        console.warn('updateRiskChart: No data available');
        return;
    }
    
    console.log('updateRiskChart: Updating with', window.data.investments.length, 'investments');
    
    const riskData = {
        low: 0,
        medium: 0,
        high: 0
    };
    
    window.data.investments.forEach(inv => {
        const risk = (inv.risk || 'medium').toLowerCase();
        const value = inv.value || 0;
        
        if (risk in riskData) {
            riskData[risk] += value;
        }
    });
    
    console.log('Risk chart data:', riskData);
    
    // Update chart data
    charts.risk.data.datasets[0].data = [
        riskData.low,
        riskData.medium,
        riskData.high
    ];
    
    charts.risk.update('active');
}

// Fixed updateProgressChart function for charts.js
function updateProgressChart() {
    if (!charts.progress) return;
    
    // Ensure we have the latest data
    if (!window.data) {
        console.warn('updateProgressChart: No data available');
        return;
    }
    
    // Calculate current totals with null checks
    const totalIncome = (window.data.income || []).reduce((sum, s) => sum + (s.value || 0), 0);
    const totalRecurringExpenses = (window.data.expenses || [])
        .filter(e => e.type === 'Recurring')
        .reduce((sum, e) => sum + (e.value || 0), 0);
    const monthlySavings = totalIncome - totalRecurringExpenses;
    
    // Calculate current investment values
    const totalInvestmentValue = (window.data.investments || []).reduce((sum, i) => sum + (i.value || 0), 0);
    
    // Calculate weighted average return
    let avgReturn = 0;
    if (totalInvestmentValue > 0 && window.data.investments.length > 0) {
        const weightedReturnSum = window.data.investments.reduce((sum, i) => {
            const value = i.value || 0;
            const returnRate = i.return || 0;
            return sum + (value * returnRate);
        }, 0);
        avgReturn = weightedReturnSum / totalInvestmentValue / 100;
    }
    
    // Calculate weighted average interest on loans
    const totalLoanValue = (window.data.loans || []).reduce((sum, l) => sum + (l.value || 0), 0);
    let avgInterest = 0;
    if (totalLoanValue > 0 && window.data.loans.length > 0) {
        const weightedInterestSum = window.data.loans.reduce((sum, l) => {
            const value = l.value || 0;
            const interest = l.interest || 0;
            return sum + (value * interest);
        }, 0);
        avgInterest = weightedInterestSum / totalLoanValue / 100;
    }
    
    // Current net worth (ensure initial_cash is a number)
    const initialCash = parseFloat(window.data.initial_cash) || 0;
    const netWorth = initialCash + totalInvestmentValue - totalLoanValue;
    
    console.log('updateProgressChart: Current values:', {
        netWorth,
        monthlySavings,
        avgReturn: (avgReturn * 100).toFixed(2) + '%',
        avgInterest: (avgInterest * 100).toFixed(2) + '%'
    });
    
    // Project for next 10 years
    const years = 10;
    const dataPoints = [netWorth];
    const labels = ['Now'];
    
    let currentValue = netWorth;
    
    // Calculate monthly return rate
    const monthlyReturnRate = avgReturn / 12;
    const monthlyInterestRate = avgInterest / 12;
    
    for (let year = 1; year <= years; year++) {
        let yearEndValue = currentValue;
        
       // Calculate growth for each month in the year
for (let month = 0; month < 12; month++) {
    // Apply returns on existing amount
    yearEndValue = yearEndValue * (1 + monthlyReturnRate);
    
    // Add monthly savings (assumed to be invested mid-month, so gets half month's return)
    const savingsWithHalfMonthReturn = monthlySavings * (1 + monthlyReturnRate * 0.5);
    yearEndValue = yearEndValue + savingsWithHalfMonthReturn;
    
    // Subtract loan costs if any
    const loanCosts = totalLoanValue * monthlyInterestRate;
    yearEndValue = yearEndValue - loanCosts;
}
        
        currentValue = yearEndValue;
        dataPoints.push(Math.max(0, currentValue)); // Prevent negative values
        labels.push(`Year ${year}`);
    }
    
    // Update chart data
    charts.progress.data.labels = labels;
    charts.progress.data.datasets[0].data = dataPoints;
    
// Add goal lines if goals exist
    if (window.data.goals && window.data.goals.length > 0) {
        // Remove existing goal datasets (keep only the main projection)
        while (charts.progress.data.datasets.length > 1) {
            charts.progress.data.datasets.pop();
        }
        
        // Add a horizontal line for each goal
        window.data.goals.forEach((goal, index) => {
            if (goal.target && goal.target > 0) {
                charts.progress.data.datasets.push({
                    label: goal.name || `Goal ${index + 1}`,
                    data: Array(labels.length).fill(goal.target),
                    borderColor: `hsl(${index * 60}, 70%, 50%)`,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                });
            }
        });
    }
    
    // Force chart update
    charts.progress.update('active');
    
    console.log('updateProgressChart: Chart updated with', dataPoints.length, 'data points');
}


// Enhanced updateHistoricalChart function for charts.js
function updateHistoricalChart() {
    if (!charts.historical) return;
    
    if (historicalNetWorth.length === 0) {
        charts.historical.data.labels = ['No Data'];
        charts.historical.data.datasets[0].data = [0];
        charts.historical.data.datasets[1].data = [];
        charts.historical.update();
        
        // Still call these functions even with no data
        updateInsights();
        updateMonthlyRecordsTable();
        return;
    }
    
    // Sort records by date
    const sortedRecords = [...historicalNetWorth].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Intelligent sampling strategy
    const totalPoints = sortedRecords.length;
    const maxPointsToShow = 12;
    let sampledRecords = [];
    
    if (totalPoints <= maxPointsToShow) {
        // If we have 12 or fewer points, show all
        sampledRecords = sortedRecords;
    } else {
        // Smart sampling based on time range
        const firstDate = new Date(sortedRecords[0].date);
        const lastDate = new Date(sortedRecords[sortedRecords.length - 1].date);
        const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                          (lastDate.getMonth() - firstDate.getMonth());
        
        if (monthsDiff <= 24) {
            // For 2 years or less: sample evenly
            sampledRecords = sampleEvenly(sortedRecords, maxPointsToShow);
        } else if (monthsDiff <= 60) {
            // For 2-5 years: quarterly sampling with recent bias
            sampledRecords = sampleWithRecentBias(sortedRecords, maxPointsToShow, 3);
        } else if (monthsDiff <= 120) {
            // For 5-10 years: semi-annual sampling with recent bias
            sampledRecords = sampleWithRecentBias(sortedRecords, maxPointsToShow, 6);
        } else {
            // For 10+ years: annual sampling with recent bias
            sampledRecords = sampleWithRecentBias(sortedRecords, maxPointsToShow, 12);
        }
    }
    
    // Extract labels and data
    const labels = sampledRecords.map(record => {
        const date = new Date(record.date);
        const totalMonths = (new Date(sortedRecords[sortedRecords.length - 1].date).getFullYear() - 
                           new Date(sortedRecords[0].date).getFullYear()) * 12;
        
        // Format based on time span
        if (totalMonths > 36) {
            // For long time spans, include year
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else {
            // For shorter spans, month and year
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
    });
    
    const netWorthData = sampledRecords.map(record => record.netWorth);
    
    // Calculate trend line using linear regression
    const trendData = calculateTrendLine(netWorthData);
    
    // Update chart data
    charts.historical.data.labels = labels;
    charts.historical.data.datasets[0].data = netWorthData;
    charts.historical.data.datasets[1].data = trendData;
    
    // Add annotations for significant events
    addChartAnnotations(charts.historical, sampledRecords, sortedRecords);
    
    charts.historical.update();
    
    // Update related components
    updateInsights();
    updateMonthlyRecordsTable();
}

// Helper function: Sample data points evenly
function sampleEvenly(records, targetCount) {
    const sampled = [];
    const step = (records.length - 1) / (targetCount - 1);
    
    // Always include first point
    sampled.push(records[0]);
    
    // Sample intermediate points
    for (let i = 1; i < targetCount - 1; i++) {
        const index = Math.round(i * step);
        sampled.push(records[index]);
    }
    
    // Always include last point
    sampled.push(records[records.length - 1]);
    
    return sampled;
}

// Helper function: Sample with bias towards recent data
function sampleWithRecentBias(records, targetCount, intervalMonths) {
    const sampled = [];
    const currentDate = new Date();
    
    // Always include the first record
    sampled.push(records[0]);
    
    // Sample older data at larger intervals
    let lastSampledDate = new Date(records[0].date);
    const recentThreshold = 6; // Last 6 months
    
    for (let i = 1; i < records.length - 1; i++) {
        const recordDate = new Date(records[i].date);
        const monthsFromNow = (currentDate.getFullYear() - recordDate.getFullYear()) * 12 + 
                             (currentDate.getMonth() - recordDate.getMonth());
        
        // For recent data (last 6 months), include all points
        if (monthsFromNow <= recentThreshold) {
            sampled.push(records[i]);
            lastSampledDate = recordDate;
        } else {
            // For older data, use the specified interval
            const monthsSinceLastSample = (recordDate.getFullYear() - lastSampledDate.getFullYear()) * 12 + 
                                        (recordDate.getMonth() - lastSampledDate.getMonth());
            
            if (monthsSinceLastSample >= intervalMonths) {
                sampled.push(records[i]);
                lastSampledDate = recordDate;
            }
        }
        
        // Stop if we're approaching the target count
        if (sampled.length >= targetCount - 1) break;
    }
    
    // Always include the last record
    sampled.push(records[records.length - 1]);
    
    // If we have too many points, re-sample evenly
    if (sampled.length > targetCount) {
        return sampleEvenly(sampled, targetCount);
    }
    
    return sampled;
}

// Helper function: Add annotations for significant events
function addChartAnnotations(chart, sampledRecords, allRecords) {
    // Find highest and lowest points
    let highest = { value: -Infinity, record: null };
    let lowest = { value: Infinity, record: null };
    
    allRecords.forEach(record => {
        if (record.netWorth > highest.value) {
            highest = { value: record.netWorth, record: record };
        }
        if (record.netWorth < lowest.value) {
            lowest = { value: record.netWorth, record: record };
        }
    });
    
    // Check if these points are in our sampled data
    const highestInSample = sampledRecords.find(r => r.date === highest.record.date);
    const lowestInSample = sampledRecords.find(r => r.date === lowest.record.date);
    
    // You can add visual markers or annotations here if needed
    // For example, adding to chart options or using a plugin
}

// Calculate trend line using linear regression (existing function)
function calculateTrendLine(data) {
    if (data.length < 2) return [];
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = data.length;
    
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return data.map((_, i) => intercept + slope * i);
}

// Update chart colors based on theme
function updateChartColors(isDarkMode) {
    if (!charts.investment || !charts.risk || !charts.progress || !charts.historical) return;

    // Chart cards are deep ledger-green in dark mode, parchment in light
    // mode, so axis/legend text needs to flip between cream and ink.
    const textColor = isDarkMode ? '#D9CFB8' : '#5B584E';
    const gridColor = isDarkMode ? 'rgba(243, 236, 221, 0.10)' : 'rgba(27, 27, 24, 0.08)';
    
    // Update all chart options
    Object.values(charts).forEach(chart => {
        if (!chart) return;
        
        // Update text colors
        if (chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
            }
        }
        
        chart.update();
    });
}

// Export chart as image
function exportChartAsImage(chartType) {
    const chart = charts[chartType];
    if (!chart) return;
    
    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `${chartType}_chart_${new Date().toISOString().split('T')[0]}.png`;
    link.href = url;
    link.click();
}

// Show analytics modal
function showAnalytics() {
    // Calculate analytics data
    const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
    const totalLoans = data.loans.reduce((sum, l) => sum + l.value, 0);
    const totalIncome = data.income.reduce((sum, i) => sum + i.value, 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.value, 0);
    const netWorth = data.initial_cash + totalInvestments - totalLoans;
    const monthlySavings = totalIncome - totalExpenses;
    
    // FIXED: Calculate average returns correctly
    let avgReturn = 0;
    if (data.investments.length > 0 && totalInvestments > 0) {
        // Calculate weighted average return based on investment values
        const totalWeightedReturn = data.investments.reduce((sum, i) => {
            return sum + ((i.value || 0) * (i.return || 0));
        }, 0);
        avgReturn = totalWeightedReturn / totalInvestments;
    }
    
    // Calculate portfolio metrics
    const diversificationScore = getDiversificationScore();
    const riskScore = getRiskScore();
    
    const content = `
        <div class="analytics-summary">
            <h5 class="mb-4">Comprehensive Portfolio Analytics</h5>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="text-primary">Portfolio Overview</h6>
                    <p><strong>Total Investments:</strong> ${formatCurrency(totalInvestments)}</p>
                    <p><strong>Number of Assets:</strong> ${data.investments.length}</p>
                    <p><strong>Weighted Average Return:</strong> ${avgReturn.toFixed(2)}%</p>
                    <p><strong>Net Worth:</strong> ${formatCurrency(netWorth)}</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-primary">Risk & Performance</h6>
                    <p><strong>Risk Score:</strong> ${riskScore}/10</p>
                    <p><strong>Diversification:</strong> ${diversificationScore}/10</p>
                    <p><strong>Best Performer:</strong> ${getBestPerformer()}</p>
                    <p><strong>Worst Performer:</strong> ${getWorstPerformer()}</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary">Cash Flow Analysis</h6>
                    <p><strong>Monthly Income:</strong> ${formatCurrency(totalIncome)}</p>
                    <p><strong>Monthly Expenses:</strong> ${formatCurrency(totalExpenses)}</p>
                    <p><strong>Monthly Savings:</strong> ${formatCurrency(monthlySavings)}</p>
                    <p><strong>Savings Rate:</strong> ${totalIncome > 0 ? ((monthlySavings / totalIncome) * 100).toFixed(1) : 0}%</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-primary">Recommendations</h6>
                    ${getRecommendations()}
                </div>
            </div>
        </div>
    `;
    
    Swal.fire({
        title: 'Portfolio Analytics',
        html: content,
        width: '800px',
        confirmButtonText: 'Close',
        confirmButtonColor: chartColors.primary,
        showCancelButton: true,
        cancelButtonText: 'Export Report',
        cancelButtonColor: chartColors.secondary
    }).then((result) => {
        if (!result.isConfirmed && result.dismiss === Swal.DismissReason.cancel) {
            exportAnalyticsReport();
        }
    });
}

// Helper functions for analytics
function getBestPerformer() {
    if (data.investments.length === 0) return 'No investments';
    
    const best = data.investments.reduce((prev, current) => 
        (prev.return > current.return) ? prev : current
    );
    
    return `${best.name} (${best.return}% return)`;
}

function getWorstPerformer() {
    if (data.investments.length === 0) return 'No investments';
    
    const worst = data.investments.reduce((prev, current) => 
        (prev.return < current.return) ? prev : current
    );
    
    return `${worst.name} (${worst.return}% return)`;
}

function getDiversificationScore() {
    const types = new Set(data.investments.map(i => i.name.split('-')[0])).size;
    const count = data.investments.length;
    
    // Score based on number of different investment types and total count
    let score = Math.min(types * 2, 6) + Math.min(count * 0.5, 4);
    return Math.min(Math.round(score), 10);
}

function getRiskScore() {
    if (data.investments.length === 0) return 0;
    
    const riskWeights = { low: 1, medium: 2, high: 3 };
    const totalValue = data.investments.reduce((sum, i) => sum + i.value, 0);
    const weightedRisk = data.investments.reduce((sum, i) => 
        sum + (i.value * riskWeights[i.risk || 'medium']), 0
    );
    
    const avgRisk = totalValue > 0 ? weightedRisk / totalValue : 0;
    return Math.round(avgRisk * 3.33); // Convert to 0-10 scale
}

function getRecommendations() {
    const recommendations = [];
    const diversificationScore = getDiversificationScore();
    const riskScore = getRiskScore();
    const totalIncome = data.income.reduce((sum, i) => sum + i.value, 0);
    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.value, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    
    if (diversificationScore < 6) {
        recommendations.push('• Consider diversifying your portfolio across more asset types');
    }
    
    if (riskScore > 7) {
        recommendations.push('• Your portfolio has high risk. Consider adding low-risk investments');
    } else if (riskScore < 3) {
        recommendations.push('• Your portfolio is very conservative. Consider some medium-risk investments for better returns');
    }
    
    if (savingsRate < 20) {
        recommendations.push('• Try to increase your savings rate to at least 20% of income');
    }
    
    if (data.initial_cash > data.investments.reduce((sum, i) => sum + i.value, 0) * 0.5) {
        recommendations.push('• You have significant cash reserves. Consider investing more for better returns');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('• Your portfolio is well-balanced. Keep monitoring and rebalancing regularly');
    }
    
    return `<ul class="mb-0">${recommendations.join('')}</ul>`;
}

function exportAnalyticsReport() {
    // This would export a detailed analytics report
    showNotification('Analytics report export coming soon!', 'info');
}

// Export functions
window.initCharts = initCharts;
window.updateAllCharts = updateAllCharts;
window.updateHistoricalChart = updateHistoricalChart;
window.updateInsights = updateInsights;
window.updateChartColors = updateChartColors;
window.showAnalytics = showAnalytics;
window.exportChartAsImage = exportChartAsImage;
window.charts = charts;
