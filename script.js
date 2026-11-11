const OWNER_PIN = "0811";

// Load saved text edits on startup
document.addEventListener("DOMContentLoaded", () => {
  const savedContent = JSON.parse(localStorage.getItem("musenze_content")) || {};
  Object.keys(savedContent).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = savedContent[id];
  });
});

// Quick Edit Button on Hero Section
const editBtn = document.getElementById("edit-page-btn");
let isEditing = false;

if (editBtn) {
  editBtn.addEventListener("click", () => {
    if (!isEditing) {
      const pin = prompt("Enter Owner PIN to edit page text:");
      if (pin !== OWNER_PIN) {
        if (pin !== null) alert("Incorrect PIN.");
        return;
      }
      isEditing = true;
      document.body.classList.add("editing-active");
      document.querySelectorAll(".editable").forEach(el => el.setAttribute("contenteditable", "true"));
      editBtn.innerText = "Save Text Edits";
      editBtn.classList.replace("btn-outline", "btn-primary");
    } else {
      const contentToSave = {};
      document.querySelectorAll(".editable").forEach(el => {
        contentToSave[el.id] = el.innerText;
        el.setAttribute("contenteditable", "false");
      });
      localStorage.setItem("musenze_content", JSON.stringify(contentToSave));
      isEditing = false;
      document.body.classList.remove("editing-active");
      editBtn.innerText = "Quick Edit Text";
      editBtn.classList.replace("btn-primary", "btn-outline");
      alert("Changes saved!");
    }
  });
}

// Handle Booking Form Submission
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

    // Save to Local Storage Backup
    const bookings = JSON.parse(localStorage.getItem("musenze_bookings")) || [];
    bookings.unshift(newBooking);
    localStorage.setItem("musenze_bookings", JSON.stringify(bookings));

    // Optional: Add EmailJS send logic here when ready
    // emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", newBooking);

    document.getElementById("form-status").innerText =
      "Booking received! Musenze Digital Hub & Studio will contact you shortly.";
    bookingForm.reset();
  });
}
