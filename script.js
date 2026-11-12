document.addEventListener("DOMContentLoaded", () => {
  applySavedSiteText();
  loadPublishedPosts();
});

// Apply Text Updates Saved from Admin Portal
function applySavedSiteText() {
  const savedText = JSON.parse(localStorage.getItem("musenze_site_text")) || {};
  Object.keys(savedText).forEach((id) => {
    const el = document.getElementById(id);
    if (el && savedText[id].trim() !== "") {
      el.innerText = savedText[id];
    }
  });
}

// Load Published Studio Posts onto Homepage
function loadPublishedPosts() {
  const postsGrid = document.getElementById("public-posts-grid");
  const savedPosts = JSON.parse(localStorage.getItem("musenze_posts")) || [];

  if (postsGrid && savedPosts.length > 0) {
    const dynamicCards = savedPosts.map(post => `
      <div class="card featured">
        ${post.image ? `<img src="${post.image}" alt="${post.title}" style="width:100%; border-radius:6px; margin-bottom:0.8rem; max-height:200px; object-fit:cover;">` : ""}
        <small style="color:#9ca3af;">${post.category} • ${post.date}</small>
        <h3 style="margin-top:0.3rem;">${post.title}</h3>
        <p>${post.description}</p>
        ${post.link ? `<a href="${post.link}" target="_blank" rel="noopener" class="btn-outline" style="margin-top:0.8rem; display:inline-block;">View Project</a>` : ""}
      </div>
    `).join("");

    postsGrid.innerHTML = dynamicCards + postsGrid.innerHTML;
  }
}

// Handle Client Booking Form Submission
const bookingForm = document.getElementById("booking-form");
if (bookingForm) {
  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const newBooking = {
      id: Date.now(),
      name: document.getElementById("client-name").value,
      contact: document.getElementById("client-contact").value,
      service: document.getElementById("service-type").value,
      date: document.getElementById("booking-date").value,
      details: document.getElementById("project-details").value,
      status: "Pending",
      createdAt: new Date().toLocaleDateString()
    };

    const bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
    bookings.unshift(newBooking);
    localStorage.setItem("musenze_bookings", JSON.stringify(bookings));

    document.getElementById("form-status").innerText =
      "Booking received! Musenze Digital Hub & Studio will contact you shortly.";
    bookingForm.reset();
  });
}
