const ADMIN_PIN = "0811";

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const unlockBtn = document.getElementById("unlock-btn");
const pinInput = document.getElementById("admin-pin-input");

unlockBtn.addEventListener("click", () => {
  if (pinInput.value === ADMIN_PIN) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    loadAdminData();
  } else {
    alert("Incorrect PIN.");
  }
});

function loadAdminData() {
  const bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
  const tbody = document.getElementById("admin-table-body");

  // Update summary stats
  document.getElementById("stat-total").innerText = bookings.length;
  document.getElementById("stat-pending").innerText = bookings.filter(b => b.status === "Pending").length;
  document.getElementById("stat-completed").innerText = bookings.filter(b => b.status === "Completed").length;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#9ca3af;">No bookings recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>${b.name}</strong></td>
      <td>${b.contact}</td>
      <td>${b.service}</td>
      <td>${b.date}</td>
      <td>${b.details}</td>
      <td><span style="color:${b.status === 'Completed' ? '#10b981' : '#f59e0b'}; font-weight:bold;">${b.status}</span></td>
      <td style="display:flex; gap:0.5rem;">
        <button onclick="toggleStatus(${b.id})" class="btn-outline">${b.status === 'Pending' ? 'Complete' : 'Reopen'}</button>
        <button onclick="removeBooking(${b.id})" class="btn-danger">Delete</button>
      </td>
    </tr>
  `).join("");
}

function toggleStatus(id) {
  const bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
  const updated = bookings.map(b => {
    if (b.id === id) {
      b.status = b.status === "Pending" ? "Completed" : "Pending";
    }
    return b;
  });
  localStorage.setItem("musenze_bookings", JSON.stringify(updated));
  loadAdminData();
}

function removeBooking(id) {
  if (!confirm("Delete this booking permanently?")) return;
  let bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
  bookings = bookings.filter(b => b.id !== id);
  localStorage.setItem("musenze_bookings", JSON.stringify(bookings));
  loadAdminData();
}

// Export Bookings to CSV Spreadsheet
document.getElementById("export-csv-btn").addEventListener("click", () => {
  const bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
  if (bookings.length === 0) {
    alert("No bookings available to export.");
    return;
  }

  const headers = ["Name", "Contact", "Service", "Date", "Details", "Status", "Submitted"];
  const rows = bookings.map(b => [
    `"${b.name}"`,
    `"${b.contact}"`,
    `"${b.service}"`,
    `"${b.date}"`,
    `"${b.details.replace(/"/g, '""')}"`,
    `"${b.status}"`,
    `"${b.createdAt}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "musenze_studio_bookings.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
