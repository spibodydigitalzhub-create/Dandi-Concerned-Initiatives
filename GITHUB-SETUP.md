# Dandi CCI Admin Dashboard — GitHub Setup Guide

No Firebase. The dashboard reads and writes straight to this GitHub repo —
every save is a commit. GitHub Pages then rebuilds the live site (usually
within a minute or two).

## 1. Put the repo on GitHub Pages (if not already)

Repo → **Settings → Pages** → set the source branch (usually `main`) and
save. Note the live URL it gives you, e.g. `https://spibody.github.io/dandi-cci`.

## 2. Fill in `assets/github-config.js`

Open that file and set:

```js
export const githubConfig = {
  owner: "spibody",              // your GitHub username or org
  repo: "dandi-cci",             // the repo name
  branch: "main",
  pagesBaseUrl: "https://spibody.github.io/dandi-cci", // the URL from step 1
};
```

## 3. Create the owner's access code

This is a **fine-grained personal access token**, scoped to just this one
repo, so it can't touch anything else on GitHub even if it leaked.

1. On GitHub: **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Resource owner:** you (or your org). **Repository access:** "Only select
   repositories" → pick this repo.
3. **Permissions → Repository permissions → Contents:** set to **Read and
   write**. Leave everything else as "No access."
4. Set an expiration (a year is reasonable — you'll just generate a new one
   and hand it over when it expires).
5. Generate it, copy the code (starts with `github_pat_...`), and give that
   to the owner as their "access code" for `admin.html`. It's shown once —
   if you lose it, generate a new one.

## 4. Upload the files

Push/upload everything to the repo, keeping the structure:

```
index.html, about.html, programs.html, contact.html, donate.html, admin.html
app.js
style.css
assets/
  github-config.js
  site-content.js
  admin.js
  admin.css
data/
  home.json, about.json, contact.json, donate.json
  team.json, programs.json, gallery.json
```

The `data/*.json` files are already pre-filled with the site's current
content, so nothing looks empty on day one.

## 5. Using the dashboard

Go to `yoursite.com/admin.html` and paste in the access code from step 3.
It's not linked from the site nav on purpose — bookmark the URL. Every
**Save** or **Add** makes a commit to the repo; GitHub Pages then rebuilds,
so changes usually show up on the live site within a minute or two (not
instantly — that's normal, not a bug).

Tabs:
- **Home Page** — headline, subtitle, the three impact numbers.
- **About Page** — intro text, mission, vision, leadership team, Sallah story.
- **Programs** — add/edit/delete; these show on both the Programs page and
  the homepage "What We Do" cards.
- **Gallery** — add/edit/delete photos in "Our Impact in Action."
- **Contact Info** — address, phone, email, WhatsApp number, map link. Also
  feeds the footer on every page.
- **Donation Page** — donation tiers and bank transfer details.

For photos, paste an image URL or use the file picker to upload directly —
it commits the image into `assets/uploads/` in the repo and fills in the URL.

## Notes

- The access code is stored in the browser (`localStorage`) after login, so
  the owner won't have to re-paste it every visit. **Log Out** clears it.
- Treat the code like a password — anyone who has it can edit the site.
  Regenerate it (step 3) if it's ever shared somewhere it shouldn't be.
- Two old bugs fixed along the way: `contact.html`/`donate.html` had an
  unclosed `<a>` tag in the header that was swallowing the nav menu into the
  logo link, and the WhatsApp number is now editable instead of hardcoded.
