function toggleMenu() {
  document.getElementById("navMenu").classList.toggle("active");
}
const openWhatsapp = document.getElementById("openWhatsapp");
const closeWhatsapp = document.getElementById("closeWhatsapp");
const waPopup = document.getElementById("waPopup");
const startWhatsapp = document.getElementById("startWhatsapp");
const waName = document.getElementById("waName");

if (openWhatsapp) {
  openWhatsapp.addEventListener("click", function(e) {
    e.preventDefault();
    waPopup.classList.add("active");
  });
}

if (closeWhatsapp) {
  closeWhatsapp.addEventListener("click", function() {
    waPopup.classList.remove("active");
  });
}

if (startWhatsapp) {
  startWhatsapp.addEventListener("click", function() {
    const name = waName.value.trim();

    if (name === "") {
      waName.style.border = "1px solid red";
      return;
    }

    const phone = "2348063182224"; 
    const message = `Hello, my name is ${name}. I want to support your NGO.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
    waPopup.classList.remove("active");
  });
}
const galleryImages = document.querySelectorAll(".gallery img");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

galleryImages.forEach(img => {
  img.addEventListener("click", () => {
    lightbox.style.display = "flex";
    lightboxImg.src = img.src;
  });
});

lightbox.addEventListener("click", () => {
  lightbox.style.display = "none";
});