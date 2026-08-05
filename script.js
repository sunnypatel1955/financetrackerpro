// Add at the very beginning of script.js
console.log('Starting with performance optimizations...');

// Global cleanup on errors
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    // Attempt recovery
    if (event.error && event.error.message && event.error.message.includes('memory')) {
        cleanupResources();
    }
});
// Enhanced Main Application Script
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Finance Tracker Pro - Initializing...');
    
    // Check authentication
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize UI
    initializeUI();
    
    // Load user data
    await loadUserData();
    
    // Initialize charts
    initCharts();
    
    // Initialize features
    initializeFeatures();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize cookie consent
    initializeCookieConsent();
    
    // Start auto-save if enabled
    if (data.settings?.autoSave && hasCookieConsent) {
        startAutoSave();
    }
    
    console.log('Finance Tracker Pro - Ready!');
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('financeLoggedInUserEmail');
    
    if (!token || !email) {
        console.warn('Authentication check failed');
        return false;
    }
    
    // Verify token is not expired (simple check)
    try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
            console.warn('Token expired');
            localStorage.removeItem('token');
            localStorage.removeItem('financeLoggedInUserEmail');
            return false;
        }
    } catch (e) {
        console.error('Invalid token format');
        return false;
    }
    
    return true;
}

// Initialize UI elements
function initializeUI() {
    console.log('Initializing UI...');
    
    // Set user name
    const fullName = localStorage.getItem('financeLoggedInUserFullName') || 'User';
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = `Welcome, ${fullName}!`;
    }
    
    // Apply saved theme
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'false') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }
    
    // Apply saved sidebar state
    const sidebarState = localStorage.getItem('sidebarActive');
    if (sidebarState === 'true') {
        document.getElementById('sidebar').classList.add('active');
        if (window.innerWidth > 768) {
            document.querySelector('.main-content').style.marginLeft = '320px';
        }
    }
    
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
    
    // Initialize popovers
    const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
    popovers.forEach(popover => new bootstrap.Popover(popover));
}

// Load user data
async function loadUserData() {
    console.log('Loading user data...');
    
    showLoadingState(true);
    
    try {
        // Load data from server or local storage
        const loaded = await loadData();
        
        if (!loaded) {
            console.log('No existing data found, starting fresh');
            showNotification('Welcome! Start by adding your financial data.', 'info');
        }
        
        // Update all calculations
        update();
        
        // Update monthly records
        updateMonthlyRecordsTable();
        
        // Update insights
        updateInsights();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading data. Please refresh the page.', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Initialize features
function initializeFeatures() {
    console.log('Initializing features...');
    
    // Initialize date/time display
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize drag and drop for file import
    initializeDragAndDrop();
    
    // Check for unsaved changes warning
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Currency change
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            updateCurrencyDisplay();
            debouncedUpdate();
        });
    }
    
    // Sidebar toggle on mobile
    if (window.innerWidth <= 768) {
        document.addEventListener('click', function(e) {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.querySelector('.sidebar-toggle');
            
            if (!sidebar.contains(e.target) && !toggle.contains(e.target) && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }
    
    // Window resize handler
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Update charts on resize
            Object.values(charts).forEach(chart => chart?.resize());
            
            // Adjust sidebar behavior
            if (window.innerWidth <= 768) {
                document.querySelector('.main-content').style.marginLeft = '0';
            } else if (document.getElementById('sidebar').classList.contains('active')) {
                document.querySelector('.main-content').style.marginLeft = '320px';
            }
        }, 250);
    });
}

// Initialize keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl/Cmd key combinations
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    saveData();
                    break;
                case 'e':
                    e.preventDefault();
                    exportData();
                    break;
                case 'i':
                    e.preventDefault();
                    addRow('investments');
                    break;
                case 'l':
                    e.preventDefault();
                    addRow('loans');
                    break;
                case 'g':
                    e.preventDefault();
                    addGoal();
                    break;
                case 'z':
                    e.preventDefault();
                    undoData();
                    break;
                case 'd':
                    e.preventDefault();
                    toggleDarkMode();
                    break;
            }
        }
        
        // Escape key
        if (e.key === 'Escape') {
            // Close any open modals
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            });
            
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
            }
        }
    });
}

// Initialize drag and drop
function initializeDragAndDrop() {
    const dropZone = document.body;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        dropZone.classList.add('drag-highlight');
    }
    
    function unhighlight(e) {
        dropZone.classList.remove('drag-highlight');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json') {
                handleFileImport({ target: { files: [file] } });
            } else {
                showNotification('Please drop a JSON backup file', 'error');
            }
        }
    }
}

// Update date/time display
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const dateString = now.toLocaleDateString('en-US', options);
    
    // Update if element exists
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

// Check for unsaved changes
function hasUnsavedChanges() {
    // Compare current data with last saved data
    if (!previousData) return false;
    
    return JSON.stringify(data) !== JSON.stringify(previousData);
}

// Format currency based on selected currency
function formatCurrency(amount, forceUSD = false) {
    const currencySelect = document.getElementById('currency');
    const currency = forceUSD ? 'USD' : (currencySelect ? currencySelect.value : 'INR');
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
}

// Update currency display
function updateCurrencyDisplay() {
    const currency = document.getElementById('currency').value;
    
    // Update all currency displays
    update();
    updateAllCharts();
}

// Logout function
function logout() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('financeLoggedInUserEmail');
            localStorage.removeItem('financeLoggedInUserFullName');
            localStorage.removeItem('rememberToken');
            
            // Stop auto-save
            stopAutoSave();

            // Clear global app state objects
            window.data = null;
            window.historicalNetWorth = null;
            window.previousData = null;
            window.hasCookieConsent = false;

            // Clear any intervals, timeouts or event listeners you may have added
            if (typeof autoSaveInterval !== 'undefined' && autoSaveInterval) {
                clearInterval(autoSaveInterval);
                autoSaveInterval = null;
            }

            // Optionally — if you added any custom global events — remove them here

            // Redirect to login
            window.location.href = 'index.html';
        }
    });
}

// Export data
function exportData() {
    const modal = new bootstrap.Modal(document.getElementById('exportModal'));
    modal.show();
}

// Export to Excel
async function exportToExcel() {
    try {
        showLoadingState(true);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Overview sheet
        const overviewData = [
            ['Finance Tracker Pro - Financial Report'],
            ['Generated on:', new Date().toLocaleString()],
            [''],
            ['Overview'],
            ['Liquid Cash:', data.initial_cash],
            ['Total Investments:', data.investments.reduce((sum, i) => sum + i.value, 0)],
            ['Total Loans:', data.loans.reduce((sum, l) => sum + l.value, 0)],
            ['Net Worth:', data.initial_cash + data.investments.reduce((sum, i) => sum + i.value, 0) - data.loans.reduce((sum, l) => sum + l.value, 0)],
            [''],
            ['Monthly Cash Flow'],
            ['Total Income:', data.income.reduce((sum, i) => sum + i.value, 0)],
            ['Total Expenses:', data.expenses.reduce((sum, e) => sum + e.value, 0)],
            ['Net Savings:', data.income.reduce((sum, i) => sum + i.value, 0) - data.expenses.reduce((sum, e) => sum + e.value, 0)]
        ];
        
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');
        
        // Investments sheet
        if (data.investments.length > 0) {
            const investmentsData = [
                ['Investment Name', 'Value', 'Expected Return (%)', 'Risk Level', 'Notes'],
                ...data.investments.map(inv => [
                    inv.name,
                    inv.value,
                    inv.return,
                    inv.risk,
                    inv.remark
                ])
            ];
            const wsInvestments = XLSX.utils.aoa_to_sheet(investmentsData);
            XLSX.utils.book_append_sheet(wb, wsInvestments, 'Investments');
        }
        
        // Income sheet
        if (data.income.length > 0) {
            const incomeData = [
                ['Income Source', 'Monthly Amount', 'Notes'],
                ...data.income.map(inc => [
                    inc.name,
                    inc.value,
                    inc.remark
                ])
            ];
            const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
            XLSX.utils.book_append_sheet(wb, wsIncome, 'Income');
        }
        
        // Loans sheet
        if (data.loans.length > 0) {
            const loansData = [
                ['Loan Name', 'Outstanding Amount', 'Interest Rate (%)', 'Notes'],
                ...data.loans.map(loan => [
                    loan.name,
                    loan.value,
                    loan.interest,
                    loan.remark
                ])
            ];
            const wsLoans = XLSX.utils.aoa_to_sheet(loansData);
            XLSX.utils.book_append_sheet(wb, wsLoans, 'Loans');
        }
        
        // Expenses sheet
        if (data.expenses.length > 0) {
            const expensesData = [
                ['Category', 'Type', 'Monthly Amount', 'Notes'],
                ...data.expenses.map(exp => [
                    exp.category,
                    exp.type,
                    exp.value,
                    exp.remark
                ])
            ];
            const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
            XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');
        }
        
        // Goals sheet
        if (data.goals.length > 0) {
            const netWorth = data.initial_cash + data.investments.reduce((sum, i) => sum + i.value, 0) - data.loans.reduce((sum, l) => sum + l.value, 0);
            const goalsData = [
                ['Goal Name', 'Target Amount', 'Time to Achieve', 'Progress (%)'],
                ...data.goals.map(goal => [
                    goal.name,
                    goal.target,
                    goal.time,
                    goal.target > 0 ? Math.min((netWorth / goal.target * 100).toFixed(1), 100) : 0
                ])
            ];
            const wsGoals = XLSX.utils.aoa_to_sheet(goalsData);
            XLSX.utils.book_append_sheet(wb, wsGoals, 'Goals');
        }
        
        // Historical data sheet
        if (historicalNetWorth.length > 0) {
            const historicalData = [
                ['Month', 'Net Worth', 'Cash', 'Investments', 'Loans', 'Income', 'Expenses'],
                ...historicalNetWorth.map(record => [
                    new Date(record.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    record.netWorth,
                    record.cash,
                    record.totalInvestments,
                    record.totalLoans,
                    record.totalIncome,
                    record.totalExpenses
                ])
            ];
            const wsHistorical = XLSX.utils.aoa_to_sheet(historicalData);
            XLSX.utils.book_append_sheet(wb, wsHistorical, 'Historical');
        }
        
        // Save file
        XLSX.writeFile(wb, `FinanceTracker_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showNotification('Excel report generated successfully', 'success');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        
    } catch (error) {
        console.error('Export to Excel failed:', error);
        showNotification('Failed to generate Excel report', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Export to CSV
function exportToCSV() {
    try {
        const netWorth = data.initial_cash + data.investments.reduce((sum, i) => sum + i.value, 0) - data.loans.reduce((sum, l) => sum + l.value, 0);
        
        let csv = 'Finance Tracker Pro - CSV Export\n';
        csv += `Generated on: ${new Date().toLocaleString()}\n\n`;
        
        csv += 'OVERVIEW\n';
        csv += `Liquid Cash,${data.initial_cash}\n`;
        csv += `Total Investments,${data.investments.reduce((sum, i) => sum + i.value, 0)}\n`;
        csv += `Total Loans,${data.loans.reduce((sum, l) => sum + l.value, 0)}\n`;
        csv += `Net Worth,${netWorth}\n\n`;
        
        if (data.investments.length > 0) {
            csv += 'INVESTMENTS\n';
            csv += 'Name,Value,Return %,Risk,Notes\n';
            data.investments.forEach(inv => {
                csv += `"${inv.name}",${inv.value},${inv.return},"${inv.risk}","${inv.remark}"\n`;
            });
            csv += '\n';
        }
        
        if (data.income.length > 0) {
            csv += 'INCOME\n';
            csv += 'Source,Monthly Amount,Notes\n';
            data.income.forEach(inc => {
                csv += `"${inc.name}",${inc.value},"${inc.remark}"\n`;
            });
            csv += '\n';
        }
        
        if (data.expenses.length > 0) {
            csv += 'EXPENSES\n';
            csv += 'Category,Type,Monthly Amount,Notes\n';
            data.expenses.forEach(exp => {
                csv += `"${exp.category}","${exp.type}",${exp.value},"${exp.remark}"\n`;
            });
        }
        
        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FinanceTracker_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('CSV export completed', 'success');
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
        
    } catch (error) {
        console.error('Export to CSV failed:', error);
        showNotification('Failed to export CSV', 'error');
    }
}

// Export to PDF
// Export to PDF
async function exportToPDF() {
    try {
        showLoadingState(true);
        
        // IMPORTANT: Update data before generating PDF to get latest values
        if (typeof window.update === 'function') {
            window.update();
            // Wait for update to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify data was updated
            console.log('PDF Export - Data verification:', {
                cash: window.data.initial_cash,
                investmentCount: window.data.investments.length,
                totalInvestments: window.data.investments.reduce((sum, i) => sum + (i.value || 0), 0)
            });
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('Finance Tracker Pro - Financial Report', 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);

        // Add overview with CURRENT data
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Financial Overview', 20, 45);

        doc.setFontSize(12);
        
        // Use window.data to ensure we get the latest data
        const currentCash = window.data.initial_cash || 0;
        const currentInvestments = window.data.investments.reduce((sum, i) => sum + (i.value || 0), 0);
        const currentLoans = window.data.loans.reduce((sum, l) => sum + (l.value || 0), 0);
        const netWorth = currentCash + currentInvestments - currentLoans;

        let y = 55;
        doc.text(`Liquid Cash: ${formatCurrency(currentCash)}`, 20, y);
        y += 8;
        doc.text(`Total Investments: ${formatCurrency(currentInvestments)}`, 20, y);
        y += 8;
        doc.text(`Total Loans: ${formatCurrency(currentLoans)}`, 20, y);
        y += 8;
        doc.setTextColor(102, 126, 234);
        doc.text(`Net Worth: ${formatCurrency(netWorth)}`, 20, y);

        // Add monthly cash flow with CURRENT data
        y += 15;
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Monthly Cash Flow', 20, y);

        y += 10;
        doc.setFontSize(12);
        const totalIncome = window.data.income.reduce((sum, i) => sum + (i.value || 0), 0);
        const totalExpenses = window.data.expenses.reduce((sum, e) => sum + (e.value || 0), 0);
        const savings = totalIncome - totalExpenses;

        doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 20, y);
        y += 8;
        doc.text(`Total Expenses: ${formatCurrency(totalExpenses)}`, 20, y);
        y += 8;
        doc.setTextColor(savings >= 0 ? 34 : 220, savings >= 0 ? 197 : 53, savings >= 0 ? 94 : 69);
        doc.text(`Net Savings: ${formatCurrency(savings)}`, 20, y);

        // Add investment summary if exists
        if (window.data.investments.length > 0) {
            y += 15;
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text('Investment Portfolio', 20, y);

            y += 10;
            doc.setFontSize(10);

            const investmentData = window.data.investments.map(inv => [
                inv.name || 'Unnamed',
                formatCurrency(inv.value || 0),
                `${inv.return || 0}%`,
                inv.risk || 'medium'
            ]);

            doc.autoTable({
                startY: y,
                head: [['Investment', 'Value', 'Return', 'Risk']],
                body: investmentData,
                theme: 'striped',
                headStyles: { fillColor: [102, 126, 234] },
                margin: { left: 20, right: 20 }
            });
        }

        // CRITICAL FIX: Force chart rendering and capture
        console.log('Starting chart export process...');
        
        // First, make sure charts exist and are visible
        const chartElements = {
            investment: document.getElementById('investmentChart'),
            risk: document.getElementById('riskChart'),
            progress: document.getElementById('progressChart'),
            historical: document.getElementById('historicalChart')
        };
        
        console.log('Chart elements found:', Object.keys(chartElements).filter(k => chartElements[k] !== null));
        
        // Force update all charts
        if (typeof window.updateAllCharts === 'function') {
            window.updateAllCharts();
            await new Promise(resolve => setTimeout(resolve, 500)); // Longer wait
        }
        
        // Try to capture charts
        const chartImages = {};
        
        for (const [chartName, canvas] of Object.entries(chartElements)) {
            if (canvas) {
                try {
                    // Method 1: Direct canvas capture
                    const imageData = canvas.toDataURL('image/png', 1.0);
                    if (imageData && imageData !== 'data:,') {
                        chartImages[chartName] = imageData;
                        console.log(`Successfully captured ${chartName} chart`);
                    }
                } catch (e) {
                    console.error(`Failed to capture ${chartName} chart:`, e);
                    
                    // Method 2: Try through Chart.js instance
                    if (window.charts && window.charts[chartName]) {
                        try {
                            const chart = window.charts[chartName];
                            if (chart.toBase64Image) {
                                chartImages[chartName] = chart.toBase64Image();
                                console.log(`Successfully captured ${chartName} chart using Chart.js method`);
                            }
                        } catch (e2) {
                            console.error(`Failed Chart.js capture for ${chartName}:`, e2);
                        }
                    }
                }
            }
        }
        
        console.log('Charts captured:', Object.keys(chartImages));
        
        // Add charts to PDF if we have any
        if (Object.keys(chartImages).length > 0) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text('Financial Charts', 20, 20);
            
            let chartY = 40;
            
            // Investment Chart
            if (chartImages.investment) {
                doc.addImage(chartImages.investment, 'PNG', 20, chartY, 80, 60);
                doc.setFontSize(10);
                doc.text('Investment Distribution', 60, chartY + 65, { align: 'center' });
            }
            
            // Risk Chart
            if (chartImages.risk) {
                doc.addImage(chartImages.risk, 'PNG', 110, 40, 80, 60);
                doc.setFontSize(10);
                doc.text('Risk Analysis', 150, 105, { align: 'center' });
            }
            
            // Progress Chart
            if (chartImages.progress) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Net Worth Projection', 20, 20);
                doc.addImage(chartImages.progress, 'PNG', 20, 35, 170, 100);
            }
            
            // Historical Chart
            if (chartImages.historical && window.historicalNetWorth && window.historicalNetWorth.length > 0) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Historical Net Worth', 20, 20);
                doc.addImage(chartImages.historical, 'PNG', 20, 35, 170, 100);
            }
        } else {
            console.warn('No charts were captured for PDF export');
            
            // Add a message in PDF
            doc.addPage();
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text('Charts could not be included in this export.', 20, 30);
            doc.setFontSize(10);
            doc.text('Please ensure charts are visible on screen before exporting.', 20, 40);
        }

        // Add summary statistics page
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Summary Statistics', 20, 20);

        let summaryY = 35;
        doc.setFontSize(11);
        
        // Investment statistics
        if (window.data.investments.length > 0) {
            const avgReturn = window.data.investments.reduce((sum, i) => sum + (i.return || 0), 0) / window.data.investments.length;
            doc.text(`Average Investment Return: ${avgReturn.toFixed(2)}%`, 20, summaryY);
            summaryY += 8;
            
            const riskCounts = { low: 0, medium: 0, high: 0 };
            window.data.investments.forEach(i => riskCounts[i.risk || 'medium']++);
            doc.text(`Risk Profile: Low (${riskCounts.low}), Medium (${riskCounts.medium}), High (${riskCounts.high})`, 20, summaryY);
            summaryY += 8;
        }
        
        // Expense breakdown
        if (window.data.expenses.length > 0) {
            summaryY += 5;
            doc.text('Top Expense Categories:', 20, summaryY);
            summaryY += 8;
            
            const expenseByCategory = {};
            window.data.expenses.forEach(e => {
                expenseByCategory[e.category || 'Other'] = (expenseByCategory[e.category || 'Other'] || 0) + (e.value || 0);
            });
            
            Object.entries(expenseByCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([category, amount]) => {
                    doc.text(`  • ${category}: ${formatCurrency(amount)}`, 25, summaryY);
                    summaryY += 6;
                });
        }

        // Save PDF
        doc.save(`FinanceTracker_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        showNotification('PDF report generated successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();

    } catch (error) {
        console.error('Export to PDF failed:', error);
        showNotification('Failed to generate PDF report: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

// Debug function to check charts
function debugChartsForPDF() {
    console.log('=== Chart Debug for PDF Export ===');
    
    // Check chart elements
    const elements = {
        investment: document.getElementById('investmentChart'),
        risk: document.getElementById('riskChart'),
        progress: document.getElementById('progressChart'),
        historical: document.getElementById('historicalChart')
    };
    
    Object.entries(elements).forEach(([name, el]) => {
        if (el) {
            console.log(`${name} canvas:`, {
                exists: true,
                width: el.width,
                height: el.height,
                displayed: el.style.display !== 'none',
                context: !!el.getContext('2d')
            });
            
            // Try to get image
            try {
                const dataUrl = el.toDataURL();
                console.log(`${name} can export:`, dataUrl.substring(0, 50) + '...');
            } catch (e) {
                console.error(`${name} export error:`, e.message);
            }
        } else {
            console.log(`${name} canvas: NOT FOUND`);
        }
    });
    
    // Check Chart.js instances
    if (window.charts) {
        Object.entries(window.charts).forEach(([name, chart]) => {
            console.log(`Chart.js ${name}:`, {
                exists: !!chart,
                hasCanvas: !!(chart && chart.canvas),
                hasData: !!(chart && chart.data && chart.data.datasets)
            });
        });
    } else {
        console.log('window.charts not found');
    }
    
    console.log('========================');
}

// Enhanced version with better error handling
async function ensureChartsRendered() {
    return new Promise((resolve) => {
        if (window.charts) {
            try {
                // Force chart updates
                Object.entries(window.charts).forEach(([name, chart]) => {
                    if (chart && typeof chart.update === 'function') {
                        try {
                            chart.update('none'); // Update without animation
                            chart.render(); // Force render if available
                        } catch (e) {
                            console.warn(`Failed to update ${name} chart:`, e);
                        }
                    }
                });
                
                // Wait for next animation frame
                requestAnimationFrame(() => {
                    setTimeout(resolve, 500); // Slightly longer delay for complex charts
                });
            } catch (error) {
                console.error('Error in ensureChartsRendered:', error);
                resolve(); // Continue even if error
            }
        } else {
            resolve();
        }
    });
}

// Helper function to safely get chart image
function getChartImage(chart) {
    try {
        if (chart && chart.canvas) {
            return chart.canvas.toDataURL('image/png', 1.0);
        } else if (chart && typeof chart.toBase64Image === 'function') {
            // Fallback to Chart.js method if available
            return chart.toBase64Image();
        }
    } catch (error) {
        console.error('Failed to get chart image:', error);
    }
    return null;
}
// Export to JSON (backup)
function exportToJSON() {
    backupData();
    bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
}

// Show profile modal
function showProfile() {
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    
    // Update profile information
    document.getElementById('profileName').value = localStorage.getItem('financeLoggedInUserFullName') || 'Unknown';
    document.getElementById('profileEmail').value = localStorage.getItem('financeLoggedInUserEmail') || 'Unknown';
    
    // Calculate member since
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const memberSince = new Date(tokenData.iat * 1000);
            document.getElementById('profileMemberSince').value = memberSince.toLocaleDateString();
        } catch (e) {
            document.getElementById('profileMemberSince').value = 'Unknown';
        }
    }
    
    // Calculate storage usage (approximate)
    const dataSize = new Blob([JSON.stringify(data)]).size;
    const historicalSize = new Blob([JSON.stringify(historicalNetWorth)]).size;
    const totalSize = dataSize + historicalSize;
    const totalMB = (totalSize / 1024 / 1024).toFixed(2);
    const percentage = Math.min((totalSize / (10 * 1024 * 1024)) * 100, 100);
    
    document.getElementById('storageProgress').style.width = `${percentage}%`;
    document.getElementById('storageProgress').textContent = `${percentage.toFixed(0)}%`;
    document.querySelector('#profileModal .text-muted').textContent = `${totalMB} MB of 10 MB used`;
    
    modal.show();
}

// Show change password modal
function showChangePasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    document.getElementById('changePasswordForm').reset();
    modal.show();
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('New password must be at least 8 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (!response.ok) {
            throw new Error('Password change failed');
        }
        
        showNotification('Password changed successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        document.getElementById('changePasswordForm').reset();
        
    } catch (error) {
        console.error('Change password error:', error);
        showNotification('Failed to change password', 'error');
    }
}

// Password strength check for change password
document.getElementById('newPassword')?.addEventListener('input', function() {
    const password = this.value;
    const strengthBar = document.getElementById('newPasswordStrengthBar');
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;

    strengthBar.className = 'password-strength-bar';
    if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
    } else if (strength <= 4) {
        strengthBar.classList.add('strength-medium');
    } else {
        strengthBar.classList.add('strength-strong');
    }
});

// Show tutorial
function showTutorial() {
    const modal = new bootstrap.Modal(document.getElementById('tutorialModal'));
    modal.show();
}

// Start interactive tour
function startInteractiveTour() {
    bootstrap.Modal.getInstance(document.getElementById('tutorialModal')).hide();
    
    // Use intro.js or custom tour implementation
    showNotification('Interactive tour coming soon!', 'info');
}

// Show keyboard shortcuts
function showKeyboardShortcuts() {
    const modal = new bootstrap.Modal(document.getElementById('shortcutsModal'));
    modal.show();
}

// Show investment suggestions
function showInvestmentSuggestions() {
    const suggestions = {
        'Conservative': [
            'Fixed Deposits (6-7% return)',
            'Government Bonds (7-8% return)',
            'Debt Mutual Funds (6-8% return)'
        ],
        'Moderate': [
            'Balanced Mutual Funds (10-12% return)',
            'Real Estate Investment (8-10% return)',
            'Gold ETFs (7-9% return)'
        ],
        'Aggressive': [
            'Equity Mutual Funds (12-15% return)',
            'Direct Stocks (15-20% return)',
            'Cryptocurrency (Variable return)'
        ]
    };
    
    let content = '<div class="investment-suggestions">';
    for (const [type, items] of Object.entries(suggestions)) {
        content += `<h6 class="text-primary">${type} Portfolio</h6><ul>`;
        items.forEach(item => {
            content += `<li>${item}</li>`;
        });
        content += '</ul>';
    }
    content += '</div>';
    
    Swal.fire({
        title: 'Investment Suggestions',
        html: content,
        width: '600px',
        confirmButtonText: 'Close',
        confirmButtonColor: chartColors.primary
    });
}

// Show loan calculator
function showLoanCalculator() {
    Swal.fire({
        title: 'EMI Calculator',
        html: `
            <div class="emi-calculator">
                <div class="mb-3">
                    <label class="form-label">Loan Amount</label>
                    <input type="number" class="form-control" id="emiAmount" placeholder="Enter loan amount">
                </div>
                <div class="mb-3">
                    <label class="form-label">Interest Rate (% per year)</label>
                    <input type="number" class="form-control" id="emiRate" placeholder="Enter interest rate" step="0.1">
                </div>
                <div class="mb-3">
                    <label class="form-label">Loan Tenure (months)</label>
                    <input type="number" class="form-control" id="emiTenure" placeholder="Enter tenure in months">
                </div>
                <div class="alert alert-info" id="emiResult" style="display:none;"></div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Calculate',
        confirmButtonColor: chartColors.primary,
        preConfirm: () => {
            const amount = parseFloat(document.getElementById('emiAmount').value);
            const rate = parseFloat(document.getElementById('emiRate').value) / 100 / 12;
            const tenure = parseInt(document.getElementById('emiTenure').value);
            
            if (amount && rate && tenure) {
                const emi = (amount * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);
                const totalAmount = emi * tenure;
                const totalInterest = totalAmount - amount;
                
                return {
                    emi: emi.toFixed(2),
                    totalAmount: totalAmount.toFixed(2),
                    totalInterest: totalInterest.toFixed(2)
                };
            }
            return false;
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: 'EMI Calculation Result',
                html: `
                    <div class="text-start">
                        <p><strong>Monthly EMI:</strong> ${formatCurrency(result.value.emi)}</p>
                        <p><strong>Total Amount Payable:</strong> ${formatCurrency(result.value.totalAmount)}</p>
                        <p><strong>Total Interest:</strong> ${formatCurrency(result.value.totalInterest)}</p>
                    </div>
                `,
                confirmButtonText: 'Close',
                confirmButtonColor: chartColors.primary
            });
        }
    });
}

// Show expense analysis
function showExpenseAnalysis() {
    const expenseByCategory = {};
    let totalExpenses = 0;
    
    data.expenses.forEach(exp => {
        const category = exp.category || 'Other';
        expenseByCategory[category] = (expenseByCategory[category] || 0) + exp.value;
        totalExpenses += exp.value;
    });
    
    let content = '<div class="expense-analysis">';
    content += '<h6>Monthly Expense Breakdown</h6>';
    content += '<table class="table table-sm">';
    content += '<thead><tr><th>Category</th><th>Amount</th><th>Percentage</th></tr></thead>';
    content += '<tbody>';
    
    Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, amount]) => {
            const percentage = totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(1) : 0;
            content += `<tr>
                <td>${escapeHtml(category)}</td>
                <td>${formatCurrency(amount)}</td>
                <td>${percentage}%</td>
            </tr>`;
        });
    
    content += '</tbody></table>';
    content += `<p class="mt-3"><strong>Total Monthly Expenses:</strong> ${formatCurrency(totalExpenses)}</p>`;
    content += '</div>';
    
    Swal.fire({
        title: 'Expense Analysis',
        html: content,
        width: '600px',
        confirmButtonText: 'Close',
        confirmButtonColor: chartColors.primary
    });
}

// Show goal planner
function showGoalPlanner() {
    // Get the most recent net worth from historical records if available
    let currentNetWorth;
    
    if (window.historicalNetWorth && window.historicalNetWorth.length > 0) {
        // Sort by date and get the most recent record
        const sortedRecords = [...window.historicalNetWorth].sort((a, b) => new Date(b.date) - new Date(a.date));
        currentNetWorth = sortedRecords[0].netWorth;
        console.log('Using net worth from historical records:', currentNetWorth);
    } else {
        // Fallback to calculated net worth if no historical records
        currentNetWorth = data.initial_cash + data.investments.reduce((sum, i) => sum + i.value, 0) - data.loans.reduce((sum, l) => sum + l.value, 0);
        console.log('Using calculated net worth:', currentNetWorth);
    }
    
    Swal.fire({
        title: 'Goal Planning Calculator',
        html: `
            <div class="goal-planner">
                <div class="mb-3">
                    <label class="form-label">Current Net Worth ${window.historicalNetWorth && window.historicalNetWorth.length > 0 ? '(from latest monthly record)' : '(calculated)'}</label>
                    <input type="text" class="form-control" value="${formatCurrency(currentNetWorth)}" readonly>
                </div>
                <div class="mb-3">
                    <label class="form-label">Goal Amount</label>
                    <input type="number" class="form-control" id="goalAmount" placeholder="Enter target amount">
                </div>
                <div class="mb-3">
                    <label class="form-label">Monthly Savings</label>
                    <input type="number" class="form-control" id="monthlySavings" placeholder="Enter monthly savings amount">
                </div>
                <div class="mb-3">
                    <label class="form-label">Expected Annual Return (%)</label>
                    <input type="number" class="form-control" id="expectedReturn" placeholder="Enter expected return" step="0.1">
                </div>
                <div class="alert alert-info" id="goalResult" style="display:none;"></div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Calculate',
        confirmButtonColor: chartColors.primary,
        preConfirm: () => {
            const goalAmount = parseFloat(document.getElementById('goalAmount').value);
            const monthlySavings = parseFloat(document.getElementById('monthlySavings').value);
            const annualReturn = parseFloat(document.getElementById('expectedReturn').value) / 100;
            
            if (goalAmount && monthlySavings && annualReturn >= 0) {
                const monthlyReturn = annualReturn / 12;
                let balance = currentNetWorth; // Use the net worth we determined above
                let months = 0;
                
                while (balance < goalAmount && months < 600) {
                    balance = balance * (1 + monthlyReturn) + monthlySavings;
                    months++;
                }
                
                const years = Math.floor(months / 12);
                const remainingMonths = months % 12;
                
                return {
                    months: months,
                    years: years,
                    remainingMonths: remainingMonths,
                    achievable: months < 600,
                    currentNetWorth: currentNetWorth,
                    goalAmount: goalAmount
                };
            }
            return false;
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            const timeStr = result.value.years > 0 
                ? `${result.value.years} years and ${result.value.remainingMonths} months`
                : `${result.value.remainingMonths} months`;
            
            Swal.fire({
                title: 'Goal Planning Result',
                html: `
                    <div class="text-center">
                        ${result.value.achievable 
                            ? `<h4 class="text-success">You can achieve your goal in ${timeStr}!</h4>`
                            : '<h4 class="text-danger">Goal might take longer than 50 years</h4>'}
                        <p class="mt-3">Starting from ${formatCurrency(result.value.currentNetWorth)}, you need to reach ${formatCurrency(result.value.goalAmount)}.</p>
                        <p>Keep saving consistently to reach your target.</p>
                    </div>
                `,
                confirmButtonText: 'Close',
                confirmButtonColor: chartColors.primary
            });
        }
    });
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Process imported data through the import function
            window.importData = () => {
                // The actual import is handled by data.js
                // This is just triggering it with the file
            };
            
            // Trigger file input click is already handled
            // The data.js importData function will handle the actual import
            
        } catch (error) {
            console.error('File import error:', error);
            showNotification('Invalid file format', 'error');
        }
    };
    
    reader.readAsText(file);
}

// 7. Clean up function for page unload
function cleanupResources() {
    console.log('Cleaning up resources...');
    
    // Stop auto-save
    stopAutoSave();
    
    // Clear all timeouts
    notificationTimeouts.forEach(timeout => clearTimeout(timeout));
    notificationTimeouts.clear();
    
    // Clear debounce timer
    if (updateDebounceTimer) {
        clearTimeout(updateDebounceTimer);
    }
    
    // Destroy all charts
    if (window.charts) {
        Object.keys(window.charts).forEach(key => {
            if (window.charts[key]) {
                window.charts[key].destroy();
            }
        });
    }
    
    // Clear any pending animations
    if (window.cancelAnimationFrame) {
        // Cancel any pending animation frames
        let id = window.requestAnimationFrame(() => {});
        while (id--) {
            window.cancelAnimationFrame(id);
        }
    }
}

// 9. Add cleanup on page unload
window.addEventListener('beforeunload', cleanupResources);
window.addEventListener('unload', cleanupResources);
// Export global functions
window.logout = logout;
window.exportData = exportData;
window.exportToExcel = exportToExcel;
window.exportToCSV = exportToCSV;
window.exportToPDF = exportToPDF;
window.exportToJSON = exportToJSON;
window.showProfile = showProfile;
window.showChangePasswordModal = showChangePasswordModal;
window.changePassword = changePassword;
window.showTutorial = showTutorial;
window.startInteractiveTour = startInteractiveTour;
window.showKeyboardShortcuts = showKeyboardShortcuts;
window.showInvestmentSuggestions = showInvestmentSuggestions;
window.showLoanCalculator = showLoanCalculator;
window.showExpenseAnalysis = showExpenseAnalysis;
window.showGoalPlanner = showGoalPlanner;
window.handleFileImport = handleFileImport;
// Add this to your script.js to debug
window.debugChartsForPDF = debugChartsForPDF;
window.debugChartsForPDF = debugChartsForPDF;
window.formatCurrency = formatCurrency; // If not already exported elsewhere
window.showLoadingState = showLoadingState; // If defined in your code
window.checkAuth = checkAuth; // Useful for debugging auth issues
