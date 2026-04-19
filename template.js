// template.js
module.exports = function generateHTML(report, accounts) {
    // 1. Generate Filter Chips from Master Accounts
    const filterChips = accounts.map(acc => {
        // Derived ID: "sbi_spent_8234"
        const derivedId = `${acc.name}_${acc.type}_${acc.ending_number}`.toLowerCase();
        
        return `
            <button class="btn btn-outline-secondary btn-sm rounded-pill filter-chip me-2 mb-2" 
                    onclick="filterBank('${derivedId}', this)">
                ${acc.name} (${acc.type})
            </button>`;
    }).join('');

    // 2. Generate Table Rows with matching IDs
    const rows = report.transactions.map(t => {
        // This must match the logic above exactly
        const transactionId = `${t.accountId}`.toLowerCase();

        return `
            <tr class="transaction-row" data-bank-id="${transactionId}">
                <td><span class="badge bg-secondary">${t.bank}</span></td>
                <td><span class="badge ${t.type === 'Spent' ? 'bg-danger' : 'bg-success'}">${t.type}</span></td>
                <td class="fw-bold">${t.amount ? '₹' + t.amount : '---'}</td>
                <td>${t.merchant || t.account || 'N/A'}</td>
                <td>${t.date || '---'}</td>
                <td class="text-muted small">${t.card ? 'xx' + t.card : '---'}</td>
            </tr>`;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Finance Dashboard</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body { background-color: #f4f7f6; font-family: 'Segoe UI', sans-serif; padding-top: 40px; }
            .container { max-width: 1000px; }
            .table-container { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #dee2e6; }
            .filter-chip.active { background-color: #212529 !important; color: white !important; border-color: #212529 !important; }
            .transaction-row { transition: opacity 0.1s ease; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="fw-bold mb-0">Transaction Ledger</h2>
                <div class="text-end small text-muted">Last updated: ${new Date(report.reportDate).toLocaleTimeString()}</div>
            </div>

            <div class="mb-3">
                <h6 class="text-uppercase small fw-bold text-muted mb-2" style="font-size: 0.7rem;">Time range</h6>
                <div class="d-flex flex-wrap align-items-start">
                    <button type="button" class="btn btn-secondary btn-sm rounded-pill time-range-chip active me-2 mb-2" data-time-range="all" onclick="filterTimeRange('all', this)">
                        All
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill time-range-chip me-2 mb-2" data-time-range="current" onclick="filterTimeRange('current', this)">
                        Current Billing Cycle
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill time-range-chip me-2 mb-2" data-time-range="last" onclick="filterTimeRange('last', this)">
                        Last Billing Cycle
                    </button>
                </div>
                <p id="cycle-range-hint" class="small text-muted mb-0 mt-1" style="max-width: 42rem;"></p>
            </div>

            <div class="mb-3">
                <h6 class="text-uppercase small fw-bold text-muted mb-2" style="font-size: 0.7rem;">Filter by Account</h6>
                <div class="d-flex flex-wrap">
                    <button class="btn btn-secondary btn-sm rounded-pill filter-chip active me-2 mb-2" onclick="filterBank('ALL', this)">
                        All Transactions
                    </button>
                    ${filterChips}
                </div>
            </div>

            <div class="table-container shadow-sm">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light text-uppercase small">
                            <tr><th>Bank</th><th>Type</th><th>Amount</th><th>Details</th><th>Date</th><th>Card</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <script>
            function filterBank(bankId, btn) {
                // 1. Reset all chips to outline mode
                document.querySelectorAll('.filter-chip').forEach(c => {
                    c.classList.remove('active', 'btn-secondary');
                    c.classList.add('btn-outline-secondary');
                });

                // 2. Set clicked chip to active/solid mode
                btn.classList.add('active', 'btn-secondary');
                btn.classList.remove('btn-outline-secondary');
                
                // 3. Show/Hide rows based on data-bank-id
                document.querySelectorAll('.transaction-row').forEach(row => {
                    // dataset.bankId matches the HTML 'data-bank-id'
                    console.log(row.dataset, bankId)
                    if (bankId === 'ALL' || row.dataset.bankId === bankId) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            }
        </script>
    </body>
    </html>`;
};