import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let cachedBookings = [];
let currentUserRole = "manager"; // Defaults to manager until checked

// --- TOGGLE LOGIN / REGISTER ---
function toggleRegister() {
  document.getElementById("login-box").classList.toggle("hidden");
  document.getElementById("register-box").classList.toggle("hidden");
}
window.toggleRegister = toggleRegister;

// --- AUTHENTICATION STATE ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
    
    // Check User Database Profile
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      currentUserRole = userData.role;
      
      if (userData.status === "pending") {
        showStatusScreen("Account Pending", "Your account is waiting for Admin approval. Please check back later.");
      } else if (userData.status === "suspended") {
        showStatusScreen("Account Suspended", "Your access has been revoked by the Admin.");
      } else {
        // Account is Active
        document.getElementById("dashboard-section").classList.remove("hidden");
        document.getElementById("status-screen").classList.add("hidden");
        document.getElementById("user-role-badge").innerText = `Role: ${currentUserRole.toUpperCase()}`;
        
        applyRolePermissions();
        loadAdminData();
        loadSavedTextIntoForm();
        
        if (currentUserRole === 'admin') {
          renderAdminPosts();
          loadAdminReviews();
          loadStaffList();
        }
      }
    } else {
      // First time login but no DB record (shouldn't happen if they registered properly)
      signOut(auth);
    }
  } else {
    // Logged out
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("dashboard-section").classList.add("hidden");
    document.getElementById("status-screen").classList.add("hidden");
    document.getElementById("logout-btn").classList.add("hidden");
  }
});

function showStatusScreen(title, msg) {
  document.getElementById("status-screen").classList.remove("hidden");
  document.getElementById("status-title").innerText = title;
  document.getElementById("status-message").innerText = msg;
}

function applyRolePermissions() {
  const bossSections = document.querySelectorAll(".boss-only");
  if (currentUserRole === "admin") {
    bossSections.forEach(el => el.classList.remove("hidden"));
  } else {
    // Hide Boss sections for Managers
    bossSections.forEach(el => el.classList.add("hidden"));
  }
}

// --- LOGIN ---
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");
  const err = document.getElementById("login-error");
  
  btn.innerText = "Signing in..."; err.innerText = "";
  try { await signInWithEmailAndPassword(auth, email, pass); } 
  catch (e) { err.innerText = "Error: Invalid email or password."; } 
  finally { btn.innerText = "Sign In"; }
});

// --- REGISTER (MANAGER) ---
document.getElementById("register-btn").addEventListener("click", async () => {
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const pass = document.getElementById("reg-password").value;
  const btn = document.getElementById("register-btn");
  const err = document.getElementById("reg-error");

  btn.innerText = "Registering..."; err.innerText = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Create a pending profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: "manager",
      status: "pending",
      createdAt: new Date().toLocaleDateString()
    });
    
    alert("Registration successful! Please wait for Admin approval.");
  } catch (e) { 
    err.innerText = "Error: " + e.message; 
  } finally { 
    btn.innerText = "Register Account"; 
  }
});

// --- LOGOUT ---
document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth);
});

// --- BOSS: STAFF MANAGEMENT ---
async function loadStaffList() {
  const container = document.getElementById("staff-list");
  if (!container) return;
  
  try {
    const q = query(collection(db, "users"), where("role", "==", "manager"));
    const snap = await getDocs(q);
    const staff = [];
    snap.forEach(d => staff.push({ id: d.id, ...d.data() }));

    if (staff.length === 0) {
      container.innerHTML = "<p style='color:#9ca3af;'>No managers registered yet.</p>";
      return;
    }

    container.innerHTML = staff.map(s => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid #2d323e; border-radius:6px; margin-bottom:0.5rem;">
        <div>
          <strong>${s.name}</strong><br>
          <small style="color:#9ca3af;">${s.email}</small><br>
          <span style="color:${s.status === 'active' ? '#10b981' : s.status === 'pending' ? '#f59e0b' : '#ef4444'}; font-weight:bold; font-size:0.8rem;">Status: ${s.status.toUpperCase()}</span>
        </div>
        <div style="display:flex; gap:0.5rem;">
          ${s.status === 'pending' ? `<button data-id="${s.id}" class="btn-primary approve-staff-btn" style="padding:0.4rem 0.8rem;">Approve</button>` : ''}
          ${s.status === 'active' ? `<button data-id="${s.id}" class="btn-danger suspend-staff-btn" style="padding:0.4rem 0.8rem;">Revoke</button>` : ''}
          ${s.status === 'suspended' ? `<button data-id="${s.id}" class="btn-outline approve-staff-btn" style="padding:0.4rem 0.8rem;">Reactivate</button>` : ''}
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".approve-staff-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "users", btn.dataset.id), { status: "active" });
        loadStaffList();
      });
    });

    container.querySelectorAll(".suspend-staff-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if(confirm("Revoke access for this manager?")) {
          await updateDoc(doc(db, "users", btn.dataset.id), { status: "suspended" });
          loadStaffList();
        }
      });
    });
  } catch (err) { container.innerHTML = "<p style='color:red;'>Failed to load staff.</p>"; }
}

// --- MANUAL BOOKING FORM ---
document.getElementById("manual-booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  const statusMsg = document.getElementById("manual-status");
  btn.disabled = true; btn.innerText = "Saving...";

  const manualBooking = {
    name: document.getElementById("manual-name").value,
    contact: document.getElementById("manual-contact").value,
    service: document.getElementById("manual-service").value,
    date: document.getElementById("manual-date").value,
    details: document.getElementById("manual-details").value,
    status: "Pending",
    createdAt: new Date().toLocaleDateString(),
    timestamp: Date.now(),
    source: "Walk-in"
  };

  try {
    await addDoc(collection(db, "bookings"), manualBooking);
    statusMsg.style.color = "#10b981"; statusMsg.innerText = "Client saved successfully!";
    e.target.reset(); loadAdminData();
  } catch (err) {
    statusMsg.style.color = "#ef4444"; statusMsg.innerText = "Error: " + err.message;
  } finally {
    btn.disabled = false; btn.innerText = "Save Client to Database";
  }
});

// --- POST WORK FORM (BOSS ONLY) ---
document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  btn.disabled = true; btn.innerText = "Publishing...";
  
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
    e.target.reset(); await renderAdminPosts(); alert("Post published!");
  } catch (err) { alert("Error: " + err.message); } 
  finally { btn.disabled = false; btn.innerText = "Publish Post"; }
});

// --- LOAD POSTS / REVIEWS / TEXT / BOOKINGS ---
async function renderAdminPosts() {
  const container = document.getElementById("admin-posts-list");
  if (!container) return;
  try {
    const q = query(collection(db, "siteContent"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const posts = [];
    snap.forEach((docSnap) => { if (docSnap.id !== "homepage") posts.push({ id: docSnap.id, ...docSnap.data() }); });
    container.innerHTML = posts.length === 0 ? `<p>No posts yet.</p>` : posts.map(p => `
      <div style="display:flex; justify-content:space-between; padding:0.7rem; border:1px solid #2d323e; border-radius:6px; margin-bottom:0.5rem;">
        <div><strong>${p.title}</strong></div>
        <button data-id="${p.id}" class="btn-danger delete-post-btn">Remove</button>
      </div>
    `).join("");
    container.querySelectorAll(".delete-post-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Remove post?")) { await deleteDoc(doc(db, "siteContent", btn.dataset.id)); renderAdminPosts(); }
      });
    });
  } catch (err) { console.error(err); }
}

async function loadAdminReviews() {
  const container = document.getElementById("admin-reviews-list");
  if (!container) return;
  try {
    const snap = await getDocs(query(collection(db, "reviews"), orderBy("timestamp", "desc")));
    const reviews = [];
    snap.forEach((docSnap) => { reviews.push({ id: docSnap.id, ...docSnap.data() }); });
    container.innerHTML = reviews.length === 0 ? `<p>No reviews yet.</p>` : reviews.map(r => `
      <div style="display:flex; justify-content:space-between; padding:1rem; border:1px solid #2d323e; border-radius:6px; margin-bottom:0.5rem; flex-wrap:wrap; gap:10px;">
        <div><strong>${r.name}</strong> (${r.rating}⭐)<br><small>${r.text}</small></div>
        <div style="display:flex; gap:0.5rem;">
          ${r.status === 'Pending' ? `<button data-id="${r.id}" class="btn-primary approve-review-btn" style="padding:0.4rem 0.8rem;">Approve</button>` : ''}
          <button data-id="${r.id}" class="btn-danger delete-review-btn" style="padding:0.4rem 0.8rem;">Delete</button>
        </div>
      </div>
    `).join("");
    container.querySelectorAll(".approve-review-btn").forEach(btn => btn.addEventListener("click", async () => { await updateDoc(doc(db, "reviews", btn.dataset.id), { status: "Approved" }); loadAdminReviews(); }));
    container.querySelectorAll(".delete-review-btn").forEach(btn => btn.addEventListener("click", async () => { if(confirm("Delete?")) { await deleteDoc(doc(db, "reviews", btn.dataset.id)); loadAdminReviews(); } }));
  } catch (err) { console.error(err); }
}

async function loadSavedTextIntoForm() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "homepage"));
    if (snap.exists()) {
      const d = snap.data();
      if(d["site-hero-title"]) document.getElementById("edit-hero-title").value = d["site-hero-title"];
      if(d["site-hero-subtitle"]) document.getElementById("edit-hero-subtitle").value = d["site-hero-subtitle"];
      if(d["site-pkg1-price"]) document.getElementById("edit-pkg1-price").value = d["site-pkg1-price"];
      if(d["site-pkg2-price"]) document.getElementById("edit-pkg2-price").value = d["site-pkg2-price"];
      if(d["site-pkg3-price"]) document.getElementById("edit-pkg3-price").value = d["site-pkg3-price"];
      if(d["site-footer-contact"]) document.getElementById("edit-footer-contact").value = d["site-footer-contact"];
    }
  } catch (err) { console.error(err); }
}

document.getElementById("site-text-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type='submit']");
  btn.disabled = true; btn.innerText = "Saving...";
  const updatedText = {
    "site-hero-title": document.getElementById("edit-hero-title").value,
    "site-hero-subtitle": document.getElementById("edit-hero-subtitle").value,
    "site-pkg1-price": document.getElementById("edit-pkg1-price").value,
    "site-pkg2-price": document.getElementById("edit-pkg2-price").value,
    "site-pkg3-price": document.getElementById("edit-pkg3-price").value,
    "site-footer-contact": document.getElementById("edit-footer-contact").value
  };
  try { await setDoc(doc(db, "siteContent", "homepage"), updatedText, { merge: true }); alert("Website updated!"); } 
  catch (err) { alert("Error: " + err.message); } 
  finally { btn.disabled = false; btn.innerText = "Save Website Changes"; }
});

async function loadAdminData() {
  const tbody = document.getElementById("admin-table-body");
  if (!tbody) return;
  try {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("timestamp", "desc")));
    cachedBookings = [];
    snap.forEach((docSnap) => { cachedBookings.push({ id: docSnap.id, ...docSnap.data() }); });
    
    document.getElementById("stat-total").innerText = cachedBookings.length;
    document.getElementById("stat-pending").innerText = cachedBookings.filter(b => b.status === "Pending").length;
    document.getElementById("stat-completed").innerText = cachedBookings.filter(b => b.status === "Completed").length;
    
    tbody.innerHTML = cachedBookings.length === 0 ? `<tr><td colspan="7" style="text-align:center;">No bookings yet.</td></tr>` : cachedBookings.map(b => `
      <tr>
        <td><strong>${b.name}</strong></td><td>${b.contact}</td><td>${b.service}</td><td>${b.date}</td><td>${b.details}</td>
        <td><span style="color:${b.status === 'Completed' ? '#10b981' : '#f59e0b'}; font-weight:bold;">${b.status}</span></td>
        <td style="display:flex; gap:0.5rem;">
          <button data-id="${b.id}" data-status="${b.status}" class="btn-outline toggle-status-btn">${b.status === 'Pending' ? 'Complete' : 'Reopen'}</button>
          <button data-id="${b.id}" class="btn-danger delete-booking-btn">Delete</button>
        </td>
      </tr>
    `).join("");
    
    tbody.querySelectorAll(".toggle-status-btn").forEach(btn => btn.addEventListener("click", async () => {
      const newStatus = btn.dataset.status === "Pending" ? "Completed" : "Pending";
      await updateDoc(doc(db, "bookings", btn.dataset.id), { status: newStatus }); loadAdminData();
    }));
    tbody.querySelectorAll(".delete-booking-btn").forEach(btn => btn.addEventListener("click", async () => {
      if (confirm("Delete permanently?")) { await deleteDoc(doc(db, "bookings", btn.dataset.id)); loadAdminData(); }
    }));
  } catch (err) { console.error(err); }
}

document.getElementById("export-csv-btn").addEventListener("click", () => {
  if (cachedBookings.length === 0) { alert("No data."); return; }
  const headers = ["Name", "Contact", "Service", "Date", "Details", "Status"];
  const rows = cachedBookings.map(b => [`"${b.name}"`, `"${b.contact}"`, `"${b.service}"`, `"${b.date}"`, `"${b.details}"`, `"${b.status}"`]);
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "musenze_bookings.csv");
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
});
