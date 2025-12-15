// Basic in-browser state (also synced with localStorage)
let expenses = [];
let monthlyBudget = 30000;

const els = {
    dateLabel: document.getElementById("current-date"),
    expenseForm: document.getElementById("expense-form"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    date: document.getElementById("date"),
    note: document.getElementById("note"),
    formMessage: document.getElementById("form-message"),

    tableBody: document.getElementById("expense-table-body"),
    emptyState: document.getElementById("empty-state"),

    filterCategory: document.getElementById("filter-category"),
    filterMonth: document.getElementById("filter-month"),
    clearFilters: document.getElementById("clear-filters"),

    kpiTotal: document.getElementById("kpi-total"),
    kpiTopCategory: document.getElementById("kpi-top-category"),
    kpiAvg: document.getElementById("kpi-avg"),
    kpiCount: document.getElementById("kpi-count"),

    budgetLimit: document.getElementById("budget-limit"),
    budgetUsed: document.getElementById("budget-used"),
    budgetProgress: document.getElementById("budget-progress"),
    budgetStatus: document.getElementById("budget-status"),
    settingBudget: document.getElementById("setting-budget"),
    saveBudget: document.getElementById("save-budget"),

    themeToggle: document.getElementById("theme-toggle"),
    exportJson: document.getElementById("export-json"),

    navItems: document.querySelectorAll(".nav-item"),
    views: {
        dashboard: document.getElementById("view-dashboard"),
        history: document.getElementById("view-history"),
        settings: document.getElementById("view-settings"),
    },

    historySummary: document.getElementById("history-summary"),
    historyCategory: document.getElementById("history-category"),
};

function init() {
    // Set current date label
    const now = new Date();
    els.dateLabel.textContent = now.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    // Default date field = today
    els.date.value = now.toISOString().slice(0, 10);

    // Load from localStorage
    const storedExpenses = localStorage.getItem("expenses");
    const storedBudget = localStorage.getItem("monthlyBudget");
    const storedTheme = localStorage.getItem("theme");

    if (storedExpenses) {
        expenses = JSON.parse(storedExpenses);
    }
    if (storedBudget) {
        monthlyBudget = Number(storedBudget) || monthlyBudget;
    }
    if (storedTheme) {
        document.documentElement.dataset.theme = storedTheme;
        els.themeToggle.textContent = storedTheme === "light" ? "🌙" : "☀️";
    }

    els.budgetLimit.textContent = `₹ ${monthlyBudget.toLocaleString("en-IN")}`;
    els.settingBudget.value = monthlyBudget;

    attachEvents();
    renderAll();
}

function attachEvents() {
    els.expenseForm.addEventListener("submit", (e) => {
        e.preventDefault();
        addExpense();
    });

    els.filterCategory.addEventListener("change", renderTable);
    els.filterMonth.addEventListener("change", renderTable);
    els.clearFilters.addEventListener("click", () => {
        els.filterCategory.value = "";
        els.filterMonth.value = "";
        renderTable();
    });

    els.saveBudget.addEventListener("click", () => {
        const value = Number(els.settingBudget.value);
        if (!value || value < 0) {
            alert("Enter a valid budget amount.");
            return;
        }
        monthlyBudget = value;
        localStorage.setItem("monthlyBudget", String(monthlyBudget));
        els.budgetLimit.textContent = `₹ ${monthlyBudget.toLocaleString("en-IN")}`;
        updateBudgetStatus();
    });

    els.themeToggle.addEventListener("click", toggleTheme);
    els.exportJson.addEventListener("click", exportData);

    els.navItems.forEach((btn) => {
        btn.addEventListener("click", () => switchView(btn.dataset.view, btn));
    });
}

function addExpense() {
    const amount = Number(els.amount.value);
    const category = els.category.value.trim();
    const date = els.date.value;
    const note = els.note.value.trim();

    if (!amount || amount <= 0 || !category || !date) {
        els.formMessage.textContent = "Please fill in all required fields with valid values.";
        return;
    }

    const expense = {
        id: crypto.randomUUID(),
        amount,
        category,
        date,
        note,
        createdAt: new Date().toISOString(),
    };

    expenses.push(expense);
    localStorage.setItem("expenses", JSON.stringify(expenses));

    els.formMessage.textContent = "Expense added successfully.";
    els.amount.value = "";
    els.note.value = "";

    renderAll();
}

function renderAll() {
    renderTable();
    renderKPIs();
    updateBudgetStatus();
    renderHistory();
}

function renderTable() {
    els.tableBody.innerHTML = "";

    const filtered = getFilteredExpenses();
    if (!filtered.length) {
        els.emptyState.style.display = "block";
        return;
    }
    els.emptyState.style.display = "none";

    filtered
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach((exp) => {
            const tr = document.createElement("tr");

            const tdDate = document.createElement("td");
            tdDate.textContent = exp.date;
            tr.appendChild(tdDate);

            const tdCategory = document.createElement("td");
            tdCategory.textContent = exp.category;
            tr.appendChild(tdCategory);

            const tdNote = document.createElement("td");
            tdNote.textContent = exp.note || "—";
            tr.appendChild(tdNote);

            const tdAmount = document.createElement("td");
            tdAmount.textContent = `₹ ${exp.amount.toLocaleString("en-IN")}`;
            tdAmount.className = "align-right";
            tr.appendChild(tdAmount);

            const tdActions = document.createElement("td");
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.className = "action-btn";
            editBtn.addEventListener("click", () => editExpense(exp.id));

            const delBtn = document.createElement("button");
            delBtn.textContent = "Delete";
            delBtn.className = "action-btn danger";
            delBtn.addEventListener("click", () => deleteExpense(exp.id));

            tdActions.appendChild(editBtn);
            tdActions.appendChild(delBtn);
            tr.appendChild(tdActions);

            els.tableBody.appendChild(tr);
        });
}

function getFilteredExpenses() {
    const cat = els.filterCategory.value;
    const month = els.filterMonth.value; // format: yyyy-mm
    return expenses.filter((e) => {
        let ok = true;
        if (cat && e.category !== cat) ok = false;
        if (month && !e.date.startsWith(month)) ok = false;
        return ok;
    });
}

function editExpense(id) {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    // Pre-fill form
    els.amount.value = exp.amount;
    els.category.value = exp.category;
    els.date.value = exp.date;
    els.note.value = exp.note;

    // Remove and re-add on submit
    expenses = expenses.filter((e) => e.id !== id);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    renderAll();
    els.formMessage.textContent = "Editing mode: update fields and submit.";
}

function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    expenses = expenses.filter((e) => e.id !== id);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    renderAll();
}

function renderKPIs() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthly = expenses.filter((e) => e.date.startsWith(currentMonth));

    const total = monthly.reduce((sum, e) => sum + e.amount, 0);
    els.kpiTotal.textContent = `₹ ${total.toLocaleString("en-IN")}`;
    els.kpiCount.textContent = monthly.length.toString();

    if (monthly.length > 0) {
        const dates = new Set(monthly.map((e) => e.date));
        const avg = total / dates.size;
        els.kpiAvg.textContent = `₹ ${avg.toFixed(0).toLocaleString("en-IN")}`;

        const byCat = {};
        monthly.forEach((e) => {
            byCat[e.category] = (byCat[e.category] || 0) + e.amount;
        });
        const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
        els.kpiTopCategory.textContent = `${top[0]} (₹ ${top[1].toLocaleString("en-IN")})`;
    } else {
        els.kpiAvg.textContent = "₹ 0";
        els.kpiTopCategory.textContent = "—";
    }
}

function updateBudgetStatus() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthly = expenses.filter((e) => e.date.startsWith(currentMonth));
    const spent = monthly.reduce((sum, e) => sum + e.amount, 0);

    els.budgetUsed.textContent = `₹ ${spent.toLocaleString("en-IN")}`;

    const ratio = monthlyBudget > 0 ? Math.min(spent / monthlyBudget, 1) : 0;
    els.budgetProgress.style.width = `${ratio * 100}%`;

    if (!monthlyBudget) {
        els.budgetStatus.textContent = "Set a budget in Settings to track usage.";
        return;
    }

    if (spent === 0) {
        els.budgetStatus.textContent = "No spending yet this month.";
    } else if (ratio < 0.5) {
        els.budgetStatus.textContent = "You’re well within your budget.";
    } else if (ratio < 0.9) {
        els.budgetStatus.textContent = "Caution: You’re approaching your budget limit.";
    } else if (ratio <= 1) {
        els.budgetStatus.textContent = "Warning: You’re very close to your budget limit.";
    } else {
        els.budgetStatus.textContent = "Budget exceeded! Review your expenses.";
    }
}

function renderHistory() {
    // Monthly summary (group by yyyy-mm)
    const byMonth = {};
    expenses.forEach((e) => {
        const ym = e.date.slice(0, 7);
        byMonth[ym] = (byMonth[ym] || 0) + e.amount;
    });

    els.historySummary.innerHTML = "";
    Object.entries(byMonth)
        .sort(([a], [b]) => (a > b ? -1 : 1))
        .forEach(([month, total]) => {
            const li = document.createElement("li");
            const [y, m] = month.split("-");
            li.textContent = `${m}-${y}: ₹ ${total.toLocaleString("en-IN")}`;
            els.historySummary.appendChild(li);
        });

    // Current month category split
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthly = expenses.filter((e) => e.date.startsWith(currentMonth));
    const byCat = {};
    monthly.forEach((e) => {
        byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });

    els.historyCategory.innerHTML = "";
    Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, total]) => {
            const li = document.createElement("li");
            li.textContent = `${cat}: ₹ ${total.toLocaleString("en-IN")}`;
            els.historyCategory.appendChild(li);
        });

    if (!monthly.length) {
        const li = document.createElement("li");
        li.textContent = "No data for this month yet.";
        els.historyCategory.appendChild(li);
    }
}

function switchView(viewName, clickedBtn) {
    Object.values(els.views).forEach((v) => v.classList.add("hidden"));
    els.views[viewName].classList.remove("hidden");

    els.navItems.forEach((btn) => btn.classList.remove("active"));
    clickedBtn.classList.add("active");
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    els.themeToggle.textContent = next === "light" ? "🌙" : "☀️";
}
let currentPage = 1;
const itemsPerPage = 5;

function renderTable() {
    els.tableBody.innerHTML = "";

    const filtered = getFilteredExpenses();
    const paginated = paginateExpenses(filtered);

    if (!paginated.length) {
        els.emptyState.style.display = "block";
        return;
    }
    els.emptyState.style.display = "none";

    paginated.forEach((exp) => {
        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = exp.date;
        tr.appendChild(tdDate);

        const tdCategory = document.createElement("td");
        tdCategory.textContent = exp.category;
        tr.appendChild(tdCategory);

        const tdNote = document.createElement("td");
        tdNote.textContent = exp.note || "—";
        tr.appendChild(tdNote);

        const tdAmount = document.createElement("td");
        tdAmount.textContent = `₹ ${exp.amount.toLocaleString("en-IN")}`;
        tdAmount.className = "align-right";
        tr.appendChild(tdAmount);

        const tdActions = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "action-btn";
        editBtn.addEventListener("click", () => editExpense(exp.id));

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "action-btn danger";
        delBtn.addEventListener("click", () => deleteExpense(exp.id));

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);
        tr.appendChild(tdActions);

        els.tableBody.appendChild(tr);
    });

    updatePaginationInfo(filtered.length);
}

function getFilteredExpenses() {
    const search = document.getElementById("search-bar").value.toLowerCase();
    const cat = els.filterCategory.value;
    const month = els.filterMonth.value; // format: yyyy-mm

    return expenses.filter((e) => {
        let ok = true;
        if (search && !e.note.toLowerCase().includes(search) && !e.category.toLowerCase().includes(search)) ok = false;
        if (cat && e.category !== cat) ok = false;
        if (month && !e.date.startsWith(month)) ok = false;
        return ok;
    });
}

function paginateExpenses(filtered) {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
}

function updatePaginationInfo(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById("page-info").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prev-page").disabled = currentPage === 1;
    document.getElementById("next-page").disabled = currentPage === totalPages;
}

document.getElementById("prev-page").addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    renderTable();
});

document.getElementById("next-page").addEventListener("click", () => {
    currentPage += 1;
    renderTable();
});

document.getElementById("search-bar").addEventListener("input", renderTable);
function exportData() {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
document.addEventListener("DOMContentLoaded", init);
function exportCSV() {
    const headers = ["Date", "Category", "Note", "Amount"];
    const rows = expenses.map((e) => [e.date, e.category, e.note, e.amount]);

    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const rows = content.split("\n").slice(1); // Skip headers
        rows.forEach((row) => {
            const [date, category, note, amount] = row.split(",").map((cell) => cell.replace(/"/g, ""));
            if (date && category && amount) {
                expenses.push({
                    id: crypto.randomUUID(),
                    date,
                    category,
                    note,
                    amount: Number(amount),
                    createdAt: new Date().toISOString(),
                });
            }
        });
        localStorage.setItem("expenses", JSON.stringify(expenses));
        renderAll();
    };
    reader.readAsText(file);
}

document.getElementById("export-csv").addEventListener("click", exportCSV);
document.getElementById("import-csv-btn").addEventListener("click", () => {
    document.getElementById("import-csv").click();
});
document.getElementById("import-csv").addEventListener("change", importCSV);
