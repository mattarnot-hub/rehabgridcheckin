# Rehab Grid Check-In

A daily check-in app for Matt's home-exercise plan from The Rehab Grid (plantar fasciitis / hamstring & calf strength). Anyone with the link sees Matt's real, live progress; only Matt can update it.

## Data model
- Check-ins live in a single shared Firestore document (`public/rehabgrid`), read openly by anyone who opens the page, and updated only by whoever is signed in as the owner.
- The repo and its GitHub Pages build contain **only app code and the plan's reference content** (goals, roadmap, clinic info, the Home Exercise Program handout) — no personal check-in history is ever committed; that data lives only in Firestore.
- **Owner sign-in**: a link in the footer opens an email/password form (Firebase Authentication). The app never offers public sign-up, so the only account that can ever sign in is the one created manually in the Firebase console (see `js/firebase-config.js`) — that's what keeps writes to Matt even though reads are public.
- Each visitor's browser also keeps an offline cache of the last-seen record in `localStorage`, purely so the page isn't blank while the live connection loads or if it's briefly offline; it's not a separate private copy.
- Until `js/firebase-config.js` has a real project's config, the site quietly runs in a **local-only preview mode** — everything works, but nothing is shared and nothing leaves the device. See that file for the one-time Firebase setup steps.

## What it tracks
- Two home exercises from the treatment plan: **calf ball release** and **foot rolling**, with a daily streak and 7-day history.
- The full **Home Exercise Program** handout from the clinic (4 exercises with steps, purpose, dose and the original diagrams), each with an owner-editable "Frequency" note.
- Reference content from the plan: goals, contributing factors, the 4-phase roadmap (with an optional start date to highlight the current phase), next-session note, and clinic contact info.

## Run locally
    python -m http.server 8080
then open http://localhost:8080. (Runs in local-only preview mode unless `js/firebase-config.js` is filled in.)

## Deploy
Push to `main`. GitHub Actions (`.github/workflows/pages.yml`) builds and publishes to GitHub Pages automatically — see **Settings → Pages** (Source: GitHub Actions).

## Customize
Edit the content blocks directly in `js/app.js` (`PHASES`, `HEP`, goals, chips) if the plan changes at a future visit.
