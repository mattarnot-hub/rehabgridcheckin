# Rehab Grid Check-In

A private, no-backend daily check-in app for Matt's home-exercise plan from The Rehab Grid (plantar fasciitis / hamstring & calf strength).

## Privacy model
- The repo and GitHub Pages site contain **only app code and the plan's reference content** (goals, roadmap, clinic info) — no personal check-in history is ever committed.
- Daily check-ins (which exercises were done, and your streak) live only in that browser's `localStorage` — never sent anywhere.
- Strict Content-Security-Policy: no network requests (`connect-src 'none'`), no third-party scripts, no analytics, no fonts loaded over the network.
- Checking in on a different device or browser starts a separate, empty history there — this is a single-device journal, not a synced account.

## What it tracks
- Two home exercises from the treatment plan: **calf ball release** and **foot rolling**, with a daily streak and 7-day history.
- Reference content from the plan: goals, contributing factors, the 4-phase roadmap (with an optional start date to highlight your current phase), next-session note, and clinic contact info.

## Run locally
    python -m http.server 8080
then open http://localhost:8080.

## Deploy
Push to `main`. GitHub Actions (`.github/workflows/pages.yml`) builds and publishes to GitHub Pages automatically — see **Settings → Pages** (Source: GitHub Actions).

## Customize
Edit the content blocks directly in `js/app.js` (`PHASES`, goals, chips) if the plan changes at a future visit.
