import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let currentUserRole = "coworker";
let currentUserId = null;

function toggleRegister() {
  document.getElementById("login-box").classList.toggle("hidden");
  document.getElementById("register-box").classList.toggle("hidden");
}
window.toggleRegister = toggleRegister;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
    
    const userDocSnap = await getDoc(doc(db, "users", user.uid));

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      currentUserRole = userData.role;
      
      if (userData.status === "pending") {
        showStatusScreen("Account Pending", "Your account is waiting for approval.");
      } else if (userData.status === "suspended") {
        showStatusScreen("Account Suspended", "Your access has been revoked.");
      } else {
        document.getElementById("dashboard-section").classList.remove("hidden");
        document.getElementById("status-screen").classList.add("hidden");
        document.getElementById("user-role-badge").innerText = `Role: ${currentUserRole.toUpperCase()}`;
        
        applyRolePermissions();
        loadAdminData();
        
        if (currentUserRole === 'admin') {
          renderAdminPosts();
          loadAdminReviews();
          loadSavedTextIntoForm();
          loadStaffList(); // Admin sees everyone
        } else if (currentUserRole === 'manager') {
          loadStaffList(); // Manager sees only coworkers
        }
      }
    } else {
      signOut(auth);
    }
  } else {
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
  const adminElements = document.querySelectorAll(".admin-only");
  const managerElements = document.querySelectorAll(".manager-only");
  const staffSection = document.getElementById("staff-management-section");

  // Reset all to hidden
  adminElements.forEach(el => el.classList.add("hidden"));
  managerElements.forEach(el => el.classList.add("hidden"));
  staffSection.classList.add("hidden");

  if (currentUserRole === "admin") {
    adminElements.forEach(el => el.classList.remove("hidden"));
    managerElements.forEach(el => el.classList.remove("hidden")); // Admin can also do manager tasks
    staffSection.classList.remove("hidden");
    document.getElementById("staff-management-desc").innerText = "You have full control. Approve Managers and Coworkers.";
  } else if (currentUserRole === "manager") {
    managerElements.forEach(el => el.classList.remove("hidden"));
    staffSection.classList.remove("hidden");
    document.getElementById("staff-management-desc").innerText = "You can approve or suspend Coworkers.";
  } else {
    // Coworkers only see the dashboard and table, nothing else
  }
}

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

document.getElementById("register-btn").addEventListener("click", async () => {
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const pass = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value; // Manager or Coworker
  const btn = document.getElementById("register-btn");
  const err = document.getElementById("reg-error");

  btn.innerText = "Registering..."; err.innerText = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: role,
      status: "pending",
      createdAt: new Date().toLocaleDateString()
    });
    
    alert("Registration successful! Please wait for approval.");
  } catch (e) { 
    err.innerText = "Error: " + e.message; 
  } finally { 
    btn.innerText = "Register Account"; 
  }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

// --- STAFF MANAGEMENT (UPDATED FOR 3 ROLES) ---
async function loadStaffList() {
  const container = document.getElementById("staff-list");
  if (!container) return;
  container.innerHTML = "<p style='color:#9ca3af;'>Loading team...</p>";

  try {
    const snap = await getDocs(collection(db, "users"));
    const staff = [];
    
    snap.forEach(d => {
      const data = d.data();
      // Admin sees Managers & Coworkers. Manager only sees Coworkers.
      if (currentUserRole === 'admin' && (data.role === 'manager' || data.role === 'coworker')) {
        staff.push({ id: d.id, ...data });
      } else if (currentUserRole === 'manager' && data.role === 'coworker') {
        staff.push({ id: d.id, ...data });
      }
    });

    if (staff.length === 0) {
      container.innerHTML = "<p style='color:#9ca3af;'>No team members found.</p>";
      return;
    }

    container.innerHTML = staff.map(s => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid #2d323e; border-radius:6px; margin-bottom:0.5rem; flex-wrap:wrap; gap:10px;">
        <div>
          <strong>${s.name}</strong> <span style="font-size:0.8rem; background:#2d323e; padding:2px 6px; border-radius:4px;">${s.role.toUpperCase()}</span><br>
          <small style="color:#9ca3af;">${s.email}</small><br>
          <span style="color:${s.status === 'active' ? '#10b981' : s.status === 'pending' ? '#f59e0b' : '#ef4444'}; font-weight:bold; font-size:0.8rem;">Status: ${s.status.toUpperCase()}</span>
        </div>
        <div style="display:flex; gap:0.5rem;">
          ${s.status === 'pending' ? `<button data-id="${s.id}" class="btn-primary approve-staff-btn" style="padding:0.4rem 0.8rem;">Approve</button>` : ''}
          ${s.status === 'active' ? `<button data-id="${s.id}" class="btn-danger suspend-staff-btn" style="padding:0.4rem 0.8rem;">Suspend</button>` : ''}
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
        if(confirm("Suspend this team member?")) {
          await updateDoc(doc(db, "users", btn.dataset.id), { status: "suspended" });
          loadStaffList();
        }
      });
    });
  } catch (err) { 
    container.innerHTML = "<p style='color:red;'>Failed to load team.</p>"; 
  }
}

// (The rest of the functions for manual booking, posts, reviews, etc. remain exactly the same as the previous code)
// You can copy-paste the rest of the admin.js from the previous step here...
// [Paste the manual booking form, post form, reviews, text form, loadAdminData, and export CSV functions from the previous message here]
