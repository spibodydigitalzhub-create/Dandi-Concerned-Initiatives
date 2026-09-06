// Loads editable content from Firestore into the public pages.
// If a document/field doesn't exist yet, the original static HTML stays as-is,
// so the site never breaks before the owner has entered anything in the admin dashboard.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function setText(field, value) {
  if (value === undefined || value === null || value === "") return;
  document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
    el.textContent = value;
  });
}

function setAttr(field, attr, value) {
  if (value === undefined || value === null || value === "") return;
  document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
    el.setAttribute(attr, value);
  });
}

async function getDocSafe(path) {
  try {
    const snap = await getDoc(doc(db, path));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Content load error:", path, e);
    return null;
  }
}

async function getOrderedCollection(name) {
  try {
    const q = query(collection(db, name), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (e) {
    console.error("Content load error:", name, e);
    return [];
  }
}

// Footer contact info + WhatsApp number appear on every page.
async function loadFooterAndContact() {
  const contact = await getDocSafe("site/contact");
  if (!contact) return;
  setText("footerEmail", contact.email);
  setText("footerPhone", contact.phone);
  setText("address", contact.address);
  setText("phone", contact.phone);
  setText("email", contact.email);
  if (contact.mapEmbedUrl) setAttr("mapEmbed", "src", contact.mapEmbedUrl);
  if (contact.whatsappNumber) {
    window.__DANDI_WHATSAPP_NUMBER__ = contact.whatsappNumber;
  }
}

async function loadHome() {
  const home = await getDocSafe("site/home");
  if (home) {
    setText("heroTitle", home.heroTitle);
    setText("heroSubtitle", home.heroSubtitle);
    setText("stat1Number", home.stat1Number);
    setText("stat1Label", home.stat1Label);
    setText("stat2Number", home.stat2Number);
    setText("stat2Label", home.stat2Label);
    setText("stat3Number", home.stat3Number);
    setText("stat3Label", home.stat3Label);
  }

  const programs = await getOrderedCollection("programs");
  const container = document.querySelector('[data-list="homeCards"]');
  if (container && programs.length) {
    container.innerHTML = programs.map(p => `
      <div class="card">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.text)}</p>
      </div>
    `).join("");
  }
}

async function loadPrograms() {
  const programs = await getOrderedCollection("programs");
  const container = document.querySelector('[data-list="programsFull"]');
  if (container && programs.length) {
    container.innerHTML = programs.map(p => `
      <div class="card">
        ${p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}">` : ""}
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.text)}</p>
      </div>
    `).join("");
  }
}

async function loadAbout() {
  const about = await getDocSafe("site/about");
  if (about) {
    setText("aboutIntro", about.intro);
    setText("mission", about.mission);
    setText("vision", about.vision);
    setText("sallahTitle", about.sallahTitle);
    setText("sallahText", about.sallahText);
    setAttr("sallahImage", "src", about.sallahImage);
  }

  const team = await getOrderedCollection("team");
  const container = document.querySelector('[data-list="team"]');
  if (container && team.length) {
    container.innerHTML = team.map(m => `
      <div class="card">
        <img src="${escapeAttr(m.image)}" alt="${escapeAttr(m.name)}">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.role)}</p>
      </div>
    `).join("");
  }
}

async function loadDonate() {
  const donate = await getDocSafe("site/donate");
  if (!donate) return;
  setText("donateHeroText", donate.heroText);
  setText("tier1Amount", donate.tier1Amount);
  setText("tier1Text", donate.tier1Text);
  setText("tier2Amount", donate.tier2Amount);
  setText("tier2Text", donate.tier2Text);
  setText("tier3Amount", donate.tier3Amount);
  setText("tier3Text", donate.tier3Text);
  setText("bankName", donate.bankName);
  setText("accountName", donate.accountName);
  setText("accountNumber", donate.accountNumber);
  setText("reference", donate.reference);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

const page = document.body.dataset.page;

loadFooterAndContact();
if (page === "home") loadHome();
if (page === "programs") loadPrograms();
if (page === "about") loadAbout();
if (page === "donate") loadDonate();
