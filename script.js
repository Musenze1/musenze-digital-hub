import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  applySavedSiteText();
  loadPublishedPosts();
  loadBookingHistory(); // Loads history and the counter
});

// Load Headline & Price Updates
async function applySavedSiteText() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "homepage"));
    if (snap.exists()) {
      const savedText = snap.data();
      Object.keys(savedText).forEach((id) => {
        const el = document.getElementById(id);
        if (el && typeof savedText[id] === "string" && savedText[id].trim() !== "") {
          el.innerText = savedText[id];
        }
      });
    }
  } catch (err) {
    console.error("Error loading site content:", err);
  }
}

// Load Published Studio Posts
async function loadPublishedPosts() {
  const postsGrid = document.getElementById("public-posts-grid");
  if (!postsGrid) return;

  try {
    const q = query(collection(db, "siteContent"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const dynamicCards = [];

    querySnapshot.forEach((docSnap) => {
      if (docSnap.id !== "homepage") {
        const post = docSnap.data();
        dynamicCards.push(`
          <div class="card featured">
            ${post.image ? `<img src="${post.image}" alt="${post.title}" style="width:100%; border-radius:6px; margin-bottom:0.8rem; max-height:200px; object-fit:cover;">` : ""}
            <small style="color:#9ca3af;">${post.category} • ${post.date}</small>
            <h3 style="margin-top:0.3rem;">${post.title}</h3>
            <p>${post.description}</p>
            ${post.link ? `<a href="${post.link}" target="_blank" rel="noopener" class="btn-outline" style="margin-top:0.8rem; display:inline-block;">View Project</a>` : ""}
          </div>
        `);
      }
    });

    if (dynamicCards.length > 0) {
      postsGrid.innerHTML = dynamicCards.join("") + postsGrid.innerHTML;
    }
  } catch (err) {
    console.error("Error loading posts:", err);
  }
}

// Save Client Booking Form
const bookingForm = document.getElementById("booking-form");
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusMsg = document.getElementById("form-status");
    const submitBtn = bookingForm.querySelector("button[type='submit']");

    submitBtn.disabled = true;
    submitBtn.innerText = "Sending Booking...";

    const newBooking = {
      name: document.getElementById("client-name").value,
      contact: document.getElementById("client-contact").value,
      service: document.getElementById("service-type").value,
      date: document.getElementById("booking-date").value,
      details: document.getElementById("project-details").value,
      status: "Pending",
      createdAt: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };

    try {
      await addDoc(collection(db, "bookings"), newBooking);
      statusMsg.style.color = "#10b981";
      statusMsg.innerText = "Booking received! Musenze Digital Hub & Studio will contact you shortly.";
      bookingForm.reset();
    } catch (err) {
      console.error("Booking error:", err);
      statusMsg.style.color = "#ef4444";
      statusMsg.innerText = "Could not send booking right now. Please tap the WhatsApp button.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Booking Request";
    }
  });
}

// Load Public Booking History & Counter
async function loadBookingHistory() {
  const historyContainer = document.getElementById("public-booking-history");
  const counterContainer = document.getElementById("completed-counter"); 
  
  if (!historyContainer) return;

  try {
    // ONLY fetch bookings where status is exactly "Completed"
    const q = query(
      collection(db, "bookings"), 
      where("status", "==", "Completed"),
      orderBy("timestamp", "desc")
    );
    
    const snap = await getDocs(q);
    const completedBookings = [];

    snap.forEach((docSnap) => {
      completedBookings.push(docSnap.data());
    });

    // 1. Update the Counter Number
    if (counterContainer) {
      counterContainer.innerText = completedBookings.length; 
    }

    // 2. Show the History List
    if (completedBookings.length === 0) {
      historyContainer.innerHTML = `<p style="color:#9ca3af; font-size:0.9rem;">No completed bookings yet. Your completed work will appear here!</p>`;
      return;
    }

    historyContainer.innerHTML = completedBookings.map(b => `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid #10b981;">
        <h4 style="margin-bottom: 0.3rem;">${b.service}</h4>
        <p style="font-size: 0.9rem; color: #d1d5db;">
          <strong>Client:</strong> ${b.name}<br>
          <strong>Date:</strong> ${b.date}<br>
          <strong>Details:</strong> ${b.details}
        </p>
        <span style="color: #10b981; font-weight: bold; font-size: 0.8rem;">✔ Completed</span>
      </div>
    `).join("");
    
  } catch (err) {
    console.error("Error loading booking history:", err);
    historyContainer.innerHTML = `<p style="color:#ef4444;">Failed to load booking history.</p>`;
  }
    }
