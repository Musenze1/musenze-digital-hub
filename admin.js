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
    renderAdminPosts();
    loadSavedTextIntoForm();
  } else {
    alert("Incorrect PIN.");
  }
});

// 1. Publish New Post
const postForm = document.getElementById("post-form");
if (postForm) {
  postForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const newPost = {
      id: Date.now(),
      title: document.getElementById("post-title").value,
      category: document.getElementById("post-category").value,
      image: document.getElementById("post-image").value,
      link: document.getElementById("post-link").value,
      description: document.getElementById("post-desc").value,
      date: new Date().toLocaleDateString()
    };

    const posts = JSON.parse(localStorage.getItem("musenze_posts")) || [];
    posts.unshift(newPost);
    localStorage.setItem("musenze_posts", JSON.stringify(posts));

    postForm.reset();
    renderAdminPosts();
    alert("Post published! Tap 'Back to Website' to view it.");
  });
}

function renderAdminPosts() {
  const container = document.getElementById("admin-posts-list");
  const posts = JSON.parse(localStorage.getItem("musenze_posts")) || [];

  if (posts.length === 0) {
    container.innerHTML = `<p style="color:#9ca3af; font-size:0.9rem;">No custom posts published yet.</p>`;
    return;
  }

  container.innerHTML = `<h4 style="margin-bottom:0.8rem; color:#f59e0b;">Published Posts</h4>` + posts.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.7rem; border:1px solid #2d323e; border-radius:6px; margin-bottom:0.5rem;">
      <div>
        <strong>${p.title}</strong> <small style="color:#9ca3af;">(${p.category})</small>
      </div>
      <button onclick="deletePost(${p.id})" class="btn-danger">Remove</button>
    </div>
  `).join("");
}

function deletePost(id) {
  let posts = JSON.parse(localStorage.getItem("musenze_posts")) || [];
  posts = posts.filter(p => p.id !== id);
  localStorage.setItem("musenze_posts", JSON.stringify(posts));
  renderAdminPosts();
}

// 2. Private Site Text & Pricing Editor
const siteTextForm = document.getElementById("site-text-form");
function loadSavedTextIntoForm() {
  const savedText = JSON.parse(localStorage.getItem("musenze_site_text")) || {};
  if (savedText["site-hero-title"]) document.getElementById("edit-hero-title").value = savedText["site-hero-title"];
  if (savedText["site-hero-subtitle"]) document.getElementById("edit-hero-subtitle").value = savedText["site-hero-subtitle"];
  if (savedText["site-pkg1-price"]) document.getElementById("edit-pkg1-price").value = savedText["site-pkg1-price"];
  if (savedText["site-pkg2-price"]) document.getElementById("edit-pkg2-price").value = savedText["site-pkg2-price"];
  if (savedText["site-pkg3-price"]) document.getElementById("edit-pkg3-price").value = savedText["site-pkg3-price"];
  if (savedText["site-footer-contact"]) document.getElementById("edit-footer-contact").value = savedText["site-footer-contact"];
}

if (siteTextForm) {
  siteTextForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const updatedText = {
      "site-hero-title": document.getElementById("edit-hero-title").value,
      "site-hero-subtitle": document.getElementById("edit-hero-subtitle").value,
      "site-pkg1-price": document.getElementById("edit-pkg1-price").value,
      "site-pkg2-price": document.getElementById("edit-pkg2-price").value,
      "site-pkg3-price": document.getElementById("edit-pkg3-price").value,
      "site-footer-contact": document.getElementById("edit-footer-contact").value
    };
    localStorage.setItem("musenze_site_text", JSON.stringify(updatedText));
    alert("Website text & prices updated!");
  });
}

// 3. Bookings Table & CSV Export
function loadAdminData() {
  const bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
  const tbody = document.getElementById("admin-table-body");

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
