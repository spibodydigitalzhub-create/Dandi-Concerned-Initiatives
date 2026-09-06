# Dandi CCI Admin Dashboard — Setup Guide

This adds an `admin.html` dashboard to the site. The owner logs in there and can
edit or delete almost everything on the site — hero text, stats, mission/vision,
team members, programs, gallery photos, contact info, and donation/bank
details — without touching code. Every public page now pulls its content from
Firebase (the same project already used for the gallery), so a change saved in
the dashboard shows up on the live site immediately.

## 1. One-time Firebase setup (you, not the owner)

All of this happens in the Firebase console for the existing **dandi-cci** project.

**Turn on login:**
1. Go to **Authentication → Sign-in method** → enable **Email/Password**.
2. Go to **Authentication → Users → Add user** and create one account for the
   owner (their email + a password you choose together). This is the only
   account the dashboard needs — there's no public sign-up.

**Lock down the database** — go to **Firestore Database → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /site/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /team/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /programs/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /activities/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

This keeps the site publicly readable (so visitors can see it) but only a
logged-in admin can change anything.

**Lock down photo uploads** — go to **Storage → Rules** and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

If Storage hasn't been set up yet on this project, click **Get Started** in
the Storage tab first — this is what lets the owner upload photos directly
from their computer/phone instead of needing an image-hosting link.

## 2. Upload the files

Upload the whole folder to wherever the site is hosted (keep the folder
structure — `assets/` must sit next to the HTML files):

```
index.html
about.html
programs.html
contact.html
donate.html
admin.html
app.js
style.css
assets/
  firebase-config.js
  site-content.js
  admin.js
  admin.css
```

## 3. Using the dashboard

Go to `yoursite.com/admin.html` and log in with the account created in step 1.
It's not linked from the site's navigation on purpose — just bookmark the URL.
(The real protection is the login + the rules above, not the URL being secret.)

Tabs:
- **Home Page** — headline, subtitle, the three impact numbers.
- **About Page** — intro text, mission, vision, leadership team, Sallah story.
- **Programs** — add/edit/delete programs; these automatically appear on both
  the Programs page and the homepage "What We Do" cards.
- **Gallery** — add/edit/delete the photos in "Our Impact in Action."
- **Contact Info** — address, phone, email, WhatsApp number, map link. This
  also feeds the phone/email shown in the footer on every page.
- **Donation Page** — donation tier amounts/descriptions and bank transfer
  details.

For photos, either paste an image URL (like the imgur links the site already
uses) or click the file picker to upload straight from a computer or phone —
uploading fills in the URL automatically.

**One-time note on Programs/Team/Gallery:** the public pages fall back to the
original static content until at least one item exists in each list, so the
site never looks empty. The first time you use the dashboard, re-enter the
existing programs and team members through the **Add** forms so future edits
go through the dashboard instead of the old hardcoded HTML.

## What else changed in this pass

- Fixed a broken header on `contact.html` and `donate.html` — the logo `<a>`
  tag was never closed, which was swallowing the nav menu into the link.
- The WhatsApp button's phone number is now editable from **Contact Info**
  instead of being hardcoded in `app.js`.
