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
  loadGlobalCounter(); 
  loadApprovedReviews(); 
});

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
  } catch (err) { console.error("Error loading site content:", err); }
}

// --- BULLETPROOF YOUTUBE LINK EXTRACTOR ---
function getYouTubeID(url) {
  if (!url) return null;
  // This regex handles standard links, share links, and YouTube Shorts
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

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
        let mediaHTML = "";

        // Check if the link is a YouTube video
        const videoId = getYouTubeID(post.link);

        if (videoId) {
          // If it's a YouTube video, embed the player perfectly
          mediaHTML = `
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #2d323e; background: #000;">
              <iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          `;
        } else if (post.image) {
          // If it's just an image post
          mediaHTML = `<img src="${post.image}" alt="${post.title}" style="width:100%; border-radius:6px; margin-bottom:0.8rem; max-height:250px; object-fit:cover;">`;
        }

        // Add the "View Project" button only if there is a link but NO YouTube video
        let buttonHTML = "";
        if (post.link && !videoId) {
          buttonHTML = `<a href="${post.link}" target="_blank" rel="noopener" class="btn-outline" style="margin-top:0.8rem; display:inline-block;">View Project</a>`;
        }

        dynamicCards.push(`
          <div class="card featured">
            ${mediaHTML}
            <small style="color:#9ca3af;">${post.category} • ${post.date}</small>
            <h3 style="margin-top:0.3rem;">${post.title}</h3>
            <p>${post.description}</p>
            ${buttonHTML}
          </div>
        `);
      }
    });

    if (dynamicCards.length > 0) {
      postsGrid.innerHTML = dynamicCards.join("") + postsGrid.innerHTML;
    }
  } catch (err) { console.error("Error loading posts:", err); }
}

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
      statusMsg.innerText = "Booking received! We will contact you shortly.";
      bookingForm.reset();
    } catch (err) {
      statusMsg.style.color = "#ef4444";
      statusMsg.innerText = "Could not send booking right now. Please tap the WhatsApp button.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Booking Request";
    }
  });
}

const reviewForm = document.getElementById("review-form");
if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusMsg = document.getElementById("review-status");
    const submitBtn = reviewForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    const newReview = {
      name: document.getElementById("review-name").value,
      rating: document.getElementById("review-rating").value,
      text: document.getElementById("review-text").value,
      status: "Pending", 
      timestamp: Date.now()
    };

    try {
      await addDoc(collection(db, "reviews"), newReview);
      statusMsg.style.color = "#10b981";
      statusMsg.innerText = "Thank you! Your review has been submitted for approval.";
      reviewForm.reset();
    } catch (err) {
      statusMsg.style.color = "#ef4444";
      statusMsg.innerText = "Error submitting review. Please try again.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Review";
    }
  });
}

async function loadApprovedReviews() {
  const reviewsGrid = document.getElementById("public-reviews-grid");
  if (!reviewsGrid) return;
  try {
    const q = query(collection(db, "reviews"), where("status", "==", "Approved"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const reviews = [];
    snap.forEach((docSnap) => { reviews.push(docSnap.data()); });

    if (reviews.length === 0) {
      reviewsGrid.innerHTML = `<p style="color: #9ca3af; text-align: center; width: 100%;">No reviews yet. Be the first to leave one!</p>`;
      return;
    }

    reviewsGrid.innerHTML = reviews.map(r => `
      <div class="card" style="border-left: 4px solid var(--accent);">
        <div style="color: #f59e0b; font-size: 1.2rem; margin-bottom: 0.5rem;">
          ${"⭐".repeat(parseInt(r.rating))}
        </div>
        <p style="font-style: italic; color: #d1d5db; margin-bottom: 1rem;">"${r.text}"</p>
        <strong style="color: var(--text-main);">- ${r.name}</strong>
      </div>
    `).join("");
  } catch (err) { console.error("Error loading reviews:", err); }
}

async function loadGlobalCounter() {
  const counterContainer = document.getElementById("completed-counter"); 
  if (!counterContainer) return;
  try {
    const q = query(collection(db, "bookings"), where("status", "==", "Completed"));
    const snap = await getDocs(q);
    counterContainer.innerText = snap.size; 
  } catch (err) { console.error("Error loading counter:", err); }
        }
