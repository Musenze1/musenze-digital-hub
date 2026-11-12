import { initializeApp } from "https://gstatic.com";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://gstatic.com";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyCFyKDyBwcELJ0chSuwkeqNjh1J6ZuuiAs",
  authDomain: "musenze-digital-hub.firebaseapp.com",
  projectId: "musenze-digital-hub",
  storageBucket: "musenze-digital-hub.firebasestorage.app",
  messagingSenderId: "189794048992",
  appId: "1:189794048992:web:4b9490abc4ebcac9f52985",
  measurementId: "G-4BH6S4E33V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const logoutBtn = document.getElementById("logout-btn");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("login-error");

let cachedBookings = [];

// Monitor Login State
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loadAdminData();
    renderAdminPosts();
    loadSavedTextIntoForm();
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
});

// Handle Email & Password Sign In
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.innerText = "";
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const submitBtn = document.getElementById("login-submit-btn");

  submitBtn.disabled = true;
  submitBtn.innerText = "Signing in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (err) {
    loginError.innerText = "Login failed: " + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Sign In to Dashboard";
  }
});

// Handle Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// 1. Publish New Post to Firestore
const postForm = document.getElementById("post-form");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = postForm.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "Publishing...";

    const newPost = {
      title: document.getElementById("post-title").value,
      category: document.getElementById("post-category").value,
      image: document.getElementById("post-image").value,
      link: document.getElementById("post-link").value,
      description: document.getElementById("post-desc").value,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };

    try {
      await addDoc(collection(db, "siteContent"), newPost);
      postForm.reset();
      await renderAdminPosts();
      alert("Post published live to the website!");
    } catch (err) {
      alert("Error publishing post: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = "Publish Post to Website";
    }
  });
}

async function renderAdminPosts() {
  const container = document.getElementById("admin-posts-list");
  container.innerHTML = `<p style="color:#9ca3af; font-size:0.9rem;">Loading posts...</p>`;

  try {
    const q = query(collection(db, "siteContent"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const posts = [];

    snap.forEach((docSnap) => {
      if (docSnap.id !== "homepage") {
        posts.push({ id: docSnap.id, ...docSnap.data() });
      }
    });

    if (posts.length === 0) {
      container.innerHTML = `<p style="color:#9ca3af; font-size:0.9rem;">No custom posts published yet.</p>`;
      return;
    }

    container.innerHTML = `<h4 style="margin-bottom:0.8rem; color:#f59e0b;">Published Posts</h4>` + posts.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.7rem; border:1px solid #2d323e; border-radius:6px; margin-bottom:0.5rem;">
        <div>
          <strong>${p.title}</strong> <small style="color:#9ca3af;">(${p.category})</small>
        </div>
        <button data-id="${p.id}" class="btn-danger delete-post-btn">Remove</button>
      </div>
    `).join("");

    container.querySelectorAll(".delete-post-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Remove this post from the website?")) return;
        await deleteDoc(doc(db, "siteContent", btn.dataset.id));
        renderAdminPosts();
      });
    });
  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444;">Failed to load posts.</p>`;
  }
}

// 2. Private Site Text & Pricing Editor
const siteTextForm = document.getElementById("site-text-form");
async function loadSavedTextIntoForm() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "homepage"));
    if (snap.exists()) {
      const savedText = snap.data();
      if (savedText["site-hero-title"]) document.getElementById("edit-hero-title").value = savedText["site-hero-title"];
      if (savedText["site-hero-subtitle"]) document.getElementById("edit-hero-subtitle").value = savedText["site-hero-subtitle"];
      if (savedText["site-pkg1-price"]) document.getElementById("edit-pkg1-price").value = savedText["site-pkg1-price"];
      if (savedText["site-pkg2-price"]) document.getElementById("edit-pkg2-price").value = savedText["site-pkg2-price"];
      if (savedText["site-pkg3-price"]) document.getElementById("edit-pkg3-price").value = savedText["site-pkg3-price"];
      if (savedText["site-footer-contact"]) document.getElementById("edit-footer-contact").value = savedText["site-footer-contact"];
    }
  } catch (err) {
    console.error("Error loading saved text:", err);
  }
}

if (siteTextForm) {
  siteTextForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = siteTextForm.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.innerText = "Saving...";

    const updatedText = {
      "site-hero-title": document.getElementById("edit-hero-title").value,
      "site-hero-subtitle": document.getElementById("edit-hero-subtitle").value,
      "site-pkg1-price": document.getElementById("edit-pkg1-price").value,
      "site-pkg2-price": document.getElementById("edit-pkg2-price").value,
      "site-pkg3-price": document.getElementById("edit-pkg3-price").value,
      "site-footer-contact": document.getElementById("edit-footer-contact").value
    };

    try {
      await setDoc(doc(db, "siteContent", "homepage"), updatedText, { merge: true });
      alert("Website text & prices updated live for all visitors!");
    } catch (err) {
      alert("Error saving changes: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = "Save Website Text Changes";
    }
  });
}

// 3. Bookings Table & CSV Export
async function loadAdminData() {
  const tbody = document.getElementById("admin-table-body");
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#9ca3af;">Loading bookings...</td></tr>`;

  try {
    const q = query(collection(db, "bookings"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    cachedBookings = [];

    snap.forEach((docSnap) => {
      cachedBookings.push({ id: docSnap.id, ...docSnap.data() });
    });

    document.getElementById("stat-total").innerText = cachedBookings.length;
    document.getElementById("stat-pending").innerText = cachedBookings.filter(b => b.status === "Pending").length;
    document.getElementById("stat-completed").innerText = cachedBookings.filter(b => b.status === "Completed").length;

    if (cachedBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#9ca3af;">No bookings recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedBookings.map(b => `
      <tr>
        <td><strong>${b.name}</strong></td>
        <td>${b.contact}</td>
        <td>${b.service}</td>
        <td>${b.date}</td>
        <td>${b.details}</td>
        <td><span style="color:${b.status === 'Completed' ? '#10b981' : '#f59e0b'}; font-weight:bold;">${b.status}</span></td>
        <td style="display:flex; gap:0.5rem;">
          <button data-id="${b.id}" data-status="${b.status}" class="btn-outline toggle-status-btn">${b.status === 'Pending' ? 'Complete' : 'Reopen'}</button>
          <button data-id="${b.id}" class="btn-danger delete-booking-btn">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".toggle-status-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const newStatus = btn.dataset.status === "Pending" ? "Completed" : "Pending";
        await updateDoc(doc(db, "bookings", btn.dataset.id), { status: newStatus });
        loadAdminData();
      });
    });

    tbody.querySelectorAll(".delete-booking-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this booking permanently?")) return;
        await deleteDoc(doc(db, "bookings", btn.dataset.id));
        loadAdminData();
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">Failed to load bookings.</td></tr>`;
  }
}

document.getElementById("export-csv-btn").addEventListener("click", () => {
  if (cachedBookings.length === 0) {
    alert("No bookings available to export.");
    return;
  }

  const headers = ["Name", "Contact", "Service", "Date", "Details", "Status", "Submitted"];
