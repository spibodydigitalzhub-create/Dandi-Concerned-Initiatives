import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc,
  updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const loginScreen = document.getElementById("loginScreen");
const adminShell = document.getElementById("adminShell");

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = "none";
    adminShell.style.display = "flex";
    loadEverything();
  } else {
    loginScreen.style.display = "flex";
    adminShell.style.display = "none";
  }
});

document.getElementById("loginBtn").addEventListener("click", handleLogin);
document.getElementById("loginPassword").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});

function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  signInWithEmailAndPassword(auth, email, password).catch((err) => {
    errorEl.textContent = "Incorrect email or password.";
    console.error(err);
  });
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
});

/* ---------------- SIDEBAR NAV ---------------- */

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
  });
});

/* ---------------- HELPERS ---------------- */

function flashStatus(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

// Wires up an <input type="file"> so choosing an image uploads it to Firebase
// Storage and drops the download URL into the paired text input.
function wireUpload(fileInputId, urlInputId, progressId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const progressEl = document.getElementById(progressId);
    progressEl.textContent = "Uploading...";
    try {
      const path = `uploads/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setVal(urlInputId, url);
      progressEl.textContent = "Uploaded ✓";
      setTimeout(() => { progressEl.textContent = ""; }, 2000);
    } catch (err) {
      console.error(err);
      progressEl.textContent = "Upload failed";
    }
  });
}

async function loadDocInto(path, mapping) {
  const snap = await getDoc(doc(db, path));
  const data = snap.exists() ? snap.data() : {};
  Object.entries(mapping).forEach(([field, inputId]) => setVal(inputId, data[field]));
}

async function saveDoc(path, mapping, statusId) {
  const data = {};
  Object.entries(mapping).forEach(([field, inputId]) => { data[field] = val(inputId); });
  await setDoc(doc(db, path), data, { merge: true });
  flashStatus(statusId, "Saved ✓");
}

/* ---------------- HOME PANEL ---------------- */

const homeMapping = {
  heroTitle: "home-heroTitle",
  heroSubtitle: "home-heroSubtitle",
  stat1Number: "home-stat1Number",
  stat1Label: "home-stat1Label",
  stat2Number: "home-stat2Number",
  stat2Label: "home-stat2Label",
  stat3Number: "home-stat3Number",
  stat3Label: "home-stat3Label",
};

document.querySelector('[data-save="home"]').addEventListener("click", () => {
  saveDoc("site/home", homeMapping, "home-status");
});

/* ---------------- ABOUT PANEL ---------------- */

const aboutMapping = {
  intro: "about-intro",
  mission: "about-mission",
  vision: "about-vision",
  sallahTitle: "about-sallahTitle",
  sallahText: "about-sallahText",
  sallahImage: "about-sallahImage",
};

document.querySelector('[data-save="about"]').addEventListener("click", () => {
  saveDoc("site/about", aboutMapping, "about-status");
});

wireUpload("about-sallahImage-file", "about-sallahImage", "about-sallahImage-progress");

/* ---------------- CONTACT PANEL ---------------- */

const contactMapping = {
  address: "contact-address",
  phone: "contact-phone",
  email: "contact-email",
  whatsappNumber: "contact-whatsappNumber",
  mapEmbedUrl: "contact-mapEmbedUrl",
};

document.querySelector('[data-save="contact"]').addEventListener("click", () => {
  saveDoc("site/contact", contactMapping, "contact-status");
});

/* ---------------- DONATE PANEL ---------------- */

const donateMapping = {
  heroText: "donate-heroText",
  tier1Amount: "donate-tier1Amount",
  tier1Text: "donate-tier1Text",
  tier2Amount: "donate-tier2Amount",
  tier2Text: "donate-tier2Text",
  tier3Amount: "donate-tier3Amount",
  tier3Text: "donate-tier3Text",
  bankName: "donate-bankName",
  accountName: "donate-accountName",
  accountNumber: "donate-accountNumber",
  reference: "donate-reference",
};

document.querySelector('[data-save="donate"]').addEventListener("click", () => {
  saveDoc("site/donate", donateMapping, "donate-status");
});

/* ---------------- TEAM LIST (About page) ---------------- */

wireUpload("team-new-image-file", "team-new-image", "team-new-image-progress");

document.getElementById("team-add-btn").addEventListener("click", async () => {
  const name = val("team-new-name");
  const role = val("team-new-role");
  const image = val("team-new-image");
  if (!name || !role) return;
  const count = (await getDocs(collection(db, "team"))).size;
  await addDoc(collection(db, "team"), { name, role, image, order: count });
  setVal("team-new-name", ""); setVal("team-new-role", ""); setVal("team-new-image", "");
  renderTeamList();
});

async function renderTeamList() {
  const container = document.getElementById("team-list");
  const q = query(collection(db, "team"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  container.innerHTML = "";
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <img src="${d.image || ''}" alt="">
      <div class="item-body">
        <div class="field-row">
          <div class="field-group"><label>Name</label><input type="text" class="t-name" value="${escapeAttr(d.name)}"></div>
          <div class="field-group"><label>Role</label><input type="text" class="t-role" value="${escapeAttr(d.role)}"></div>
        </div>
        <div class="field-group"><label>Photo URL</label><input type="text" class="t-image" value="${escapeAttr(d.image || '')}"></div>
        <div class="field-group"><label>Order</label><input type="text" class="t-order" value="${d.order ?? 0}" style="max-width:80px"></div>
      </div>
      <div class="item-actions">
        <button class="icon-btn save-item">Save</button>
        <button class="icon-btn danger delete-item">Delete</button>
      </div>
    `;
    card.querySelector(".save-item").addEventListener("click", async () => {
      await updateDoc(doc(db, "team", id), {
        name: card.querySelector(".t-name").value.trim(),
        role: card.querySelector(".t-role").value.trim(),
        image: card.querySelector(".t-image").value.trim(),
        order: Number(card.querySelector(".t-order").value) || 0,
      });
      renderTeamList();
    });
    card.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Remove this team member?")) return;
      await deleteDoc(doc(db, "team", id));
      renderTeamList();
    });
    container.appendChild(card);
  });
}

/* ---------------- PROGRAMS LIST ---------------- */

wireUpload("program-new-image-file", "program-new-image", "program-new-image-progress");

document.getElementById("program-add-btn").addEventListener("click", async () => {
  const title = val("program-new-title");
  const text = val("program-new-text");
  const image = val("program-new-image");
  if (!title || !text) return;
  const count = (await getDocs(collection(db, "programs"))).size;
  await addDoc(collection(db, "programs"), { title, text, image, order: count });
  setVal("program-new-title", ""); setVal("program-new-text", ""); setVal("program-new-image", "");
  renderProgramsList();
});

async function renderProgramsList() {
  const container = document.getElementById("programs-list");
  const q = query(collection(db, "programs"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  container.innerHTML = "";
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <img src="${d.image || ''}" alt="">
      <div class="item-body">
        <div class="field-group"><label>Title</label><input type="text" class="p-title" value="${escapeAttr(d.title)}"></div>
        <div class="field-group"><label>Description</label><textarea class="p-text">${escapeHtml(d.text)}</textarea></div>
        <div class="field-group"><label>Photo URL</label><input type="text" class="p-image" value="${escapeAttr(d.image || '')}"></div>
        <div class="field-group"><label>Order</label><input type="text" class="p-order" value="${d.order ?? 0}" style="max-width:80px"></div>
      </div>
      <div class="item-actions">
        <button class="icon-btn save-item">Save</button>
        <button class="icon-btn danger delete-item">Delete</button>
      </div>
    `;
    card.querySelector(".save-item").addEventListener("click", async () => {
      await updateDoc(doc(db, "programs", id), {
        title: card.querySelector(".p-title").value.trim(),
        text: card.querySelector(".p-text").value.trim(),
        image: card.querySelector(".p-image").value.trim(),
        order: Number(card.querySelector(".p-order").value) || 0,
      });
      renderProgramsList();
    });
    card.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Remove this program?")) return;
      await deleteDoc(doc(db, "programs", id));
      renderProgramsList();
    });
    container.appendChild(card);
  });
}

/* ---------------- GALLERY / ACTIVITIES LIST ---------------- */

wireUpload("activity-new-image-file", "activity-new-image", "activity-new-image-progress");

document.getElementById("activity-add-btn").addEventListener("click", async () => {
  const title = val("activity-new-title");
  const date = val("activity-new-date");
  const imageUrl = val("activity-new-image");
  if (!title || !imageUrl) return;
  await addDoc(collection(db, "activities"), {
    title, imageUrl, date: date || new Date().toISOString().slice(0, 10)
  });
  setVal("activity-new-title", ""); setVal("activity-new-date", ""); setVal("activity-new-image", "");
  renderGalleryList();
});

async function renderGalleryList() {
  const container = document.getElementById("gallery-list");
  const q = query(collection(db, "activities"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  container.innerHTML = "";
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <img src="${d.imageUrl || ''}" alt="">
      <div class="item-body">
        <div class="field-row">
          <div class="field-group"><label>Caption</label><input type="text" class="a-title" value="${escapeAttr(d.title)}"></div>
          <div class="field-group"><label>Date</label><input type="date" class="a-date" value="${escapeAttr(d.date)}"></div>
        </div>
        <div class="field-group"><label>Photo URL</label><input type="text" class="a-image" value="${escapeAttr(d.imageUrl || '')}"></div>
      </div>
      <div class="item-actions">
        <button class="icon-btn save-item">Save</button>
        <button class="icon-btn danger delete-item">Delete</button>
      </div>
    `;
    card.querySelector(".save-item").addEventListener("click", async () => {
      await updateDoc(doc(db, "activities", id), {
        title: card.querySelector(".a-title").value.trim(),
        date: card.querySelector(".a-date").value.trim(),
        imageUrl: card.querySelector(".a-image").value.trim(),
      });
      renderGalleryList();
    });
    card.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Remove this photo?")) return;
      await deleteDoc(doc(db, "activities", id));
      renderGalleryList();
    });
    container.appendChild(card);
  });
}

/* ---------------- LOAD EVERYTHING ON LOGIN ---------------- */

async function loadEverything() {
  await loadDocInto("site/home", homeMapping);
  await loadDocInto("site/about", aboutMapping);
  await loadDocInto("site/contact", contactMapping);
  await loadDocInto("site/donate", donateMapping);
  renderTeamList();
  renderProgramsList();
  renderGalleryList();
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
