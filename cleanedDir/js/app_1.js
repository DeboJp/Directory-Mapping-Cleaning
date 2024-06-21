let chart; // Reference to the chart instance
let summaryChart; // Reference to the summary chart instance

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // Simple script to test if JavaScript is working
    const testDiv = document.getElementById('test');
    if (testDiv) {
        testDiv.textContent = 'JavaScript is working!';
    }

    // Fetch transactions.csv file
    fetch('data/transactions.csv')
        .then(response => response.text())
        .then(data => {
            console.log('Fetched transactions.csv');
            // Parse CSV data
            const transactions = Papa.parse(data, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            }).data;
            console.log('Parsed CSV data:', transactions);
            calculateSummary(transactions);
            renderChart(transactions, 'all');
            renderTransactionList(transactions);
            setupFilters(transactions);
            setupDateRangePicker(transactions); // Setup date range picker
        })
        .catch(error => console.error('Error fetching transactions:', error));
});

function calculateSummary(transactions) {
    let totalMoney = 0;
    let totalSpent = 0;
    let currentBalance = 0;
    let dailySpending = 0;
    let weeklySpending = 0;

    if (transactions.length === 0) {
        console.error("No transactions available to calculate summary.");
        return;
    }

    const today = new Date();
    const startOfWeek = getStartOfWeek(today);

    transactions.forEach(transaction => {
        if (transaction.Type === 'DEBIT_CARD' && transaction.Amount < 0) {
            totalSpent += Math.abs(transaction.Amount);
        }
        if (new Date(transaction['Posting Date']).toDateString() === today.toDateString() && transaction.Amount < 0) {
            dailySpending += Math.abs(transaction.Amount);
        }
        if (new Date(transaction['Posting Date']) >= startOfWeek && new Date(transaction['Posting Date']) <= today && transaction.Amount < 0) {
            weeklySpending += Math.abs(transaction.Amount);
        }
    });

    currentBalance = transactions[0].Balance;
    totalMoney = totalSpent + currentBalance;

    document.getElementById('totalMoney').innerText = `Total Money Ever: $${totalMoney.toFixed(2)}`;
    document.getElementById('totalSpent').innerText = `Total Money Spent: $${totalSpent.toFixed(2)}`;
    document.getElementById('currentBalance').innerText = `Current Balance: $${currentBalance.toFixed(2)}`;
    document.getElementById('dailySpending').innerText = `Today's Spending: $${dailySpending.toFixed(2)}`;
    document.getElementById('weeklySpending').innerText = `Weekly Spending: $${weeklySpending.toFixed(2)}`;
}

function renderChart(transactions, filter) {
    console.log(`Rendering chart with filter: ${filter}`, transactions);
    const ctx = document.getElementById('spendingChart').getContext('2d');

    // Destroy existing chart instance if it exists
    if (chart) {
        chart.destroy();
    }

    // Group transactions based on the filter
    const groupedTransactions = transactions.reduce((acc, transaction) => {
        let key;
        const date = new Date(transaction['Posting Date']);
        if (filter === 'week') {
            key = `${date.getFullYear()}-W${getWeekNumber(date)}`;
        } else if (filter === 'month') {
            key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        } else if (filter === 'year') {
            key = `${date.getFullYear()}`;
        } else {
            key = transaction['Posting Date'];
        }
        acc[key] = (acc[key] || 0) + transaction.Amount;
        return acc;
    }, {});

    const labels = Object.keys(groupedTransactions);
    const data = Object.values(groupedTransactions);

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Spending',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderTransactionList(transactions) {
    console.log('Rendering transaction list with transactions:', transactions);
    const listContainer = document.getElementById('transactionList');
    listContainer.innerHTML = transactions.map(t => `
        <div class="transaction">
            <div>${t['Posting Date']}</div>
            <div>${t.Description}</div>
            <div>${t.Amount}</div>
        </div>
    `).join('');
}

function setupFilters(transactions) {
    console.log('Setting up filters');
    const filterContainer = document.getElementById('filters');
    filterContainer.innerHTML = `
        <select id="filterSelect">
            <option value="all">All</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
        </select>
    `;
    document.getElementById('filterSelect').addEventListener('change', (e) => {
        console.log('Filter changed to:', e.target.value);
        const filterValue = e.target.value;
        let filteredTransactions;
        const currentDate = new Date();

        if (filterValue === 'day') {
            filteredTransactions = transactions.filter(t => new Date(t['Posting Date']).toDateString() === currentDate.toDateString());
        } else if (filterValue === 'week') {
            const startOfWeek = getStartOfWeek(currentDate);
            filteredTransactions = transactions.filter(t => new Date(t['Posting Date']) >= startOfWeek && new Date(t['Posting Date']) <= currentDate);
        } else if (filterValue === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(currentDate.getMonth() - 1);
            filteredTransactions = transactions.filter(t => new Date(t['Posting Date']) >= monthAgo && new Date(t['Posting Date']) <= currentDate);
        } else if (filterValue === 'year') {
            const yearAgo = new Date();
            yearAgo.setFullYear(currentDate.getFullYear() - 1);
            filteredTransactions = transactions.filter(t => new Date(t['Posting Date']) >= yearAgo && new Date(t['Posting Date']) <= currentDate);
        } else {
            filteredTransactions = transactions;
        }

        renderChart(filteredTransactions, filterValue);
        renderTransactionList(filteredTransactions);
    });
}

function setupDateRangePicker(transactions) {
    const filterContainer = document.getElementById('filters');
    filterContainer.innerHTML += `
        <label for="startDate">Start Date:</label>
        <input type="date" id="startDate">
        <label for="endDate">End Date:</label>
        <input type="date" id="endDate">
        <button id="applyDateRange">Apply</button>
    `;

    document.getElementById('applyDateRange').addEventListener('click', () => {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        const filteredTransactions = transactions.filter(t => {
            const transactionDate = new Date(t['Posting Date']);
            return transactionDate >= startDate && transactionDate <= endDate;
        });

        renderChart(filteredTransactions, 'custom');
        renderTransactionList(filteredTransactions);
    });
}

// Helper function to get the start of the current week
function getStartOfWeek(date) {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

// Helper function to get week number
function getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = (date - start + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000)) / (1000 * 60 * 60 * 24);
    return Math.floor((diff + start.getDay() + 6) / 7);
}
