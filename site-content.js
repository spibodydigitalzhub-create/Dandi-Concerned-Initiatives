// Loads editable content from the /data/*.json files in this repo and fills
// in the page. If a fetch fails (e.g. before the first deploy), the original
// static HTML already in the page stays as-is, so the site never breaks.

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

async function getJson(path) {
  try {
    // cache: "no-store" so a save in the dashboard shows up on next load
    // instead of a stale cached copy of the JSON file.
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Content load error:", path, e);
    return null;
  }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

async function loadFooterAndContact() {
  const contact = await getJson("contact.json");
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
  const home = await getJson("home.json");
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

  const programs = (await getJson("programs.json")) || [];
  const container = document.querySelector('[data-list="homeCards"]');
  if (container && programs.length) {
    const sorted = [...programs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    container.innerHTML = sorted.map(p => `
      <div class="card">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.text)}</p>
      </div>
    `).join("");
  }
}

async function loadPrograms() {
  const programs = (await getJson("programs.json")) || [];
  const container = document.querySelector('[data-list="programsFull"]');
  if (container && programs.length) {
    const sorted = [...programs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    container.innerHTML = sorted.map(p => `
      <div class="card">
        ${p.image ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}">` : ""}
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.text)}</p>
      </div>
    `).join("");
  }
}

async function loadAbout() {
  const about = await getJson("about.json");
  if (about) {
    setText("aboutIntro", about.intro);
    setText("mission", about.mission);
    setText("vision", about.vision);
    setText("sallahTitle", about.sallahTitle);
    setText("sallahText", about.sallahText);
    setAttr("sallahImage", "src", about.sallahImage);
  }

  const team = (await getJson("team.json")) || [];
  const teamContainer = document.querySelector('[data-list="team"]');
  if (teamContainer && team.length) {
    const sorted = [...team].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    teamContainer.innerHTML = sorted.map(m => `
      <div class="card">
        <img src="${escapeAttr(m.image)}" alt="${escapeAttr(m.name)}">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.role)}</p>
      </div>
    `).join("");
  }

  const gallery = (await getJson("gallery.json")) || [];
  const galleryEl = document.getElementById("activityGallery");
  if (galleryEl) {
    if (!gallery.length) {
      galleryEl.innerHTML = "<p style='text-align:center; width:100%;'>No activities added yet. Check back soon!</p>";
    } else {
      const sorted = [...gallery].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      galleryEl.innerHTML = "";
      sorted.forEach(item => {
        const img = document.createElement("img");
        img.src = item.imageUrl;
        img.alt = item.title || "";
        img.title = item.title || "";
        img.style.cursor = "pointer";
        img.onclick = function () {
          document.getElementById("lightbox-img").src = this.src;
          document.getElementById("lightbox").style.display = "flex";
        };
        galleryEl.appendChild(img);
      });
    }
  }
}

async function loadDonate() {
  const donate = await getJson("donate.json");
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

const page = document.body.dataset.page;

loadFooterAndContact();
if (page === "home") loadHome();
if (page === "programs") loadPrograms();
if (page === "about") loadAbout();
if (page === "donate") loadDonate();
