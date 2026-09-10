import { githubConfig } from "./github-config.js";

const API_BASE = "https://api.github.com";
const TOKEN_KEY = "dandi_admin_token";
let TOKEN = localStorage.getItem(TOKEN_KEY) || "";

const loginScreen = document.getElementById("loginScreen");
const adminShell = document.getElementById("adminShell");

/* ---------------- GITHUB API HELPERS ---------------- */

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function repoUrl(path) {
  return `${API_BASE}/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${path}`;
}

function toBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64Utf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
}

// Returns { sha, text } or null if the file doesn't exist yet.
async function ghGetFile(path) {
  const res = await fetch(`${repoUrl(path)}?ref=${githubConfig.branch}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Couldn't read ${path} (${res.status})`);
  const data = await res.json();
  return { sha: data.sha, text: fromBase64Utf8(data.content) };
}

async function ghGetJson(path) {
  const file = await ghGetFile(path);
  if (!file) return null;
  try {
    return JSON.parse(file.text);
  } catch (e) {
    console.error("Bad JSON in", path, e);
    return null;
  }
}

async function ghPutJson(path, obj, message) {
  const existing = await ghGetFile(path);
  const body = {
    message,
    content: toBase64Utf8(JSON.stringify(obj, null, 2)),
    branch: githubConfig.branch,
  };
  if (existing) body.sha = existing.sha;
  const res = await fetch(repoUrl(path), {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Couldn't save ${path} (${res.status})`);
  }
  return res.json();
}

async function ghUploadImage(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = `assets/uploads/${Date.now()}-${safeName}`;
  const res = await fetch(repoUrl(path), {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Upload image: ${safeName}`,
      content: base64,
      branch: githubConfig.branch,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed (${res.status})`);
  }
  return `${githubConfig.pagesBaseUrl}/${path}`;
}

async function validateToken(token) {
  const res = await fetch(`${API_BASE}/repos/${githubConfig.owner}/${githubConfig.repo}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.message ? ` — GitHub says: "${body.message}"` : "";
    throw new Error(`GitHub returned ${res.status}${detail}`);
  }
  const data = await res.json();
  return !data.permissions || data.permissions.push !== false;
}

/* ---------------- LOGIN / LOGOUT ---------------- */

async function tryAutoLogin() {
  if (!TOKEN) {
    showLogin();
    return;
  }
  const ok = await validateToken(TOKEN).catch(() => false);
  if (ok) {
    showDashboard();
  } else {
    localStorage.removeItem(TOKEN_KEY);
    TOKEN = "";
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = "flex";
  adminShell.style.display = "none";
}

function showDashboard() {
  loginScreen.style.display = "none";
  adminShell.style.display = "flex";
  loadEverything();
}

document.getElementById("loginBtn").addEventListener("click", handleLogin);
document.getElementById("loginToken").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});

async function handleLogin() {
  const token = document.getElementById("loginToken").value.trim();
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  if (!token) return;

  errorEl.textContent = "Checking...";
  try {
    const ok = await validateToken(token);
    if (!ok) {
      errorEl.textContent = "Signed in, but this token doesn't have write access to the repo.";
      return;
    }
    TOKEN = token;
    localStorage.setItem(TOKEN_KEY, token);
    errorEl.textContent = "";
    showDashboard();
  } catch (e) {
    console.error(e);
    errorEl.textContent = e.message || "Couldn't reach GitHub. Check your connection and try again.";
  }
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  TOKEN = "";
  showLogin();
});

tryAutoLogin();

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
  setTimeout(() => { el.textContent = ""; }, 2500);
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function wireUpload(fileInputId, urlInputId, progressId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const progressEl = document.getElementById(progressId);
    progressEl.textContent = "Uploading...";
    try {
      const url = await ghUploadImage(file);
      setVal(urlInputId, url);
      progressEl.textContent = "Uploaded ✓ (may take a minute to go live)";
      setTimeout(() => { progressEl.textContent = ""; }, 4000);
    } catch (err) {
      console.error(err);
      progressEl.textContent = "Upload failed";
    }
  });
}

async function loadDocInto(path, mapping) {
  const data = (await ghGetJson(path).catch((e) => { console.error(e); return null; })) || {};
  Object.entries(mapping).forEach(([field, inputId]) => setVal(inputId, data[field]));
}

async function saveDoc(path, mapping, statusId, message) {
  const data = {};
  Object.entries(mapping).forEach(([field, inputId]) => { data[field] = val(inputId); });
  try {
    await ghPutJson(path, data, message);
    flashStatus(statusId, "Saved ✓ (live in a minute or two)");
  } catch (e) {
    console.error(e);
    flashStatus(statusId, "Save failed — see console");
  }
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
  saveDoc("data/home.json", homeMapping, "home-status", "Update home page content");
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
  saveDoc("data/about.json", aboutMapping, "about-status", "Update about page content");
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
  saveDoc("data/contact.json", contactMapping, "contact-status", "Update contact info");
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
  saveDoc("data/donate.json", donateMapping, "donate-status", "Update donation page content");
});

/* ---------------- TEAM LIST (About page) ---------------- */

wireUpload("team-new-image-file", "team-new-image", "team-new-image-progress");

document.getElementById("team-add-btn").addEventListener("click", async () => {
  const name = val("team-new-name");
  const role = val("team-new-role");
  const image = val("team-new-image");
  if (!name || !role) return;
  const list = (await ghGetJson("data/team.json")) || [];
  list.push({ name, role, image, order: list.length });
  await ghPutJson("data/team.json", list, `Add team member: ${name}`);
  setVal("team-new-name", ""); setVal("team-new-role", ""); setVal("team-new-image", "");
  renderTeamList();
});

async function renderTeamList() {
  const container = document.getElementById("team-list");
  const list = ((await ghGetJson("data/team.json")) || []).map((d, i) => ({ ...d, _i: i }));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  container.innerHTML = "";
  list.forEach((d) => {
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
      const fresh = (await ghGetJson("data/team.json")) || [];
      fresh[d._i] = {
        name: card.querySelector(".t-name").value.trim(),
        role: card.querySelector(".t-role").value.trim(),
        image: card.querySelector(".t-image").value.trim(),
        order: Number(card.querySelector(".t-order").value) || 0,
      };
      await ghPutJson("data/team.json", fresh, `Update team member: ${fresh[d._i].name}`);
      renderTeamList();
    });
    card.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Remove this team member?")) return;
      const fresh = (await ghGetJson("data/team.json")) || [];
      fresh.splice(d._i, 1);
      await ghPutJson("data/team.json", fresh, `Remove team member: ${d.name}`);
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
  const list = (await ghGetJson("data/programs.json")) || [];
  list.push({ title, text, image, order: list.length });
  await ghPutJson("data/programs.json", list, `Add program: ${title}`);
  setVal("program-new-title", ""); setVal("program-new-text", ""); setVal("program-new-image", "");
  renderProgramsList();
});

async function renderProgramsList() {
  const container = document.getElementById("programs-list");
  const list = ((await ghGetJson("data/programs.json")) || []).map((d, i) => ({ ...d, _i: i }));
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  container.innerHTML = "";
  list.forEach((d) => {
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
      const fresh = (await ghGetJson("data/programs.json")) || [];
      fresh[d._i] = {
        title: card.querySelector(".p-title").value.trim(),
        text: card.querySelector(".p-text").value.trim(),
        image: card.querySelector(".p-image").value.trim(),
        order: Number(card.querySelector(".p-order").value) || 0,
      };
      await ghPutJson("data/programs.json", fresh, `Update program: ${fresh[d._i].title}`);
      renderProgramsList();
    });
    card.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Remove this program?")) return;
      const fresh = (await ghGetJson("data/programs.json")) || [];
      fresh.splice(d._i, 1);
      await ghPutJson("data/programs.json", fresh, `Remove program: ${d.title}`);
      renderProgramsList();
    });
    container.appendChild(card);
  });
}

/* ---------------- GALLERY LIST ---------------- */

wireUpload("activity-new-image-file", "activity-new-image", "activity-new-image-progress");

document.getElementById("activity-add-btn").addEventListener("click", async () => {
  const title = val("activity-new-title");
  const date = val("activity-new-date");
  const imageUrl = val("activity-new-image");
  if (!title || !imageUrl) return;
  const list = (await ghGetJson("data/gallery.json")) || [];
  list.push({ title, imageUrl, date: date || new Date().toISOString().slice(0, 10) });
  await ghPutJson("data/gallery.json", list, `Add gallery photo: ${title}`);
  setVal("activity-new-title", ""); setVal("activity-new-date", ""); setVal("activity-new-image", "");
  renderGalleryList();
});

async function renderGalleryList() {
  const container = document.getElementById("gallery-list");
  const list = ((await ghGetJson("data/gallery.json")) || []).map((d, i) => ({ ...d, _i: i }));
  list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  container.innerHTML = "";
  list.forEach((d) => {
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
      const fresh = (await ghGetJson("data/gallery.json")) || [];
      fresh[d._i] = {
        title: card.querySelector(".a-title").value.trim(),
        date: card.querySelector(".a-date").value.trim(),
        imageUrl: card.querySelector(".a-image").value.trim(),
      };
      await ghPutJson("data/gallery.json", fresh, `Update gallery photo: ${fresh[d._i].title}`);
      renderGalleryList();
    });
    card.querySelector(".delete-item").addEventListener("click", async () => {
      if (!confirm("Remove this photo?")) return;
      const fresh = (await ghGetJson("data/gallery.json")) || [];
      fresh.splice(d._i, 1);
      await ghPutJson("data/gallery.json", fresh, `Remove gallery photo: ${d.title}`);
      renderGalleryList();
    });
    container.appendChild(card);
  });
}

/* ---------------- LOAD EVERYTHING ON LOGIN ---------------- */

async function loadEverything() {
  await loadDocInto("data/home.json", homeMapping);
  await loadDocInto("data/about.json", aboutMapping);
  await loadDocInto("data/contact.json", contactMapping);
  await loadDocInto("data/donate.json", donateMapping);
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
