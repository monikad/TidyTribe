<div align="center">

# TidyTribe

### Turn household chaos into teamwork.

TidyTribe is a mobile-first chore app for families. Sign in, create or join a household, assign chores, earn stars, and redeem rewards across devices with Firebase sync.

[Screenshots](#screenshots) • [Features](#features) • [Getting Started](#getting-started) • [Project Structure](#project-structure)

![PWA](https://img.shields.io/badge/PWA-ready-79c98c)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-f4b942)
![Mobile First](https://img.shields.io/badge/Design-mobile--first-8ab6e5)

</div>

<p align="center">
  <img src="assets/screenshots/dashboard.png" alt="TidyTribe dashboard" width="290" />
</p>

## Why TidyTribe?

Most family chore apps feel like spreadsheets. TidyTribe is designed more like a lightweight household companion:

- A simple sign-in flow for each family member
- Shared household data synced in real time with Firestore
- A personal "My Day" dashboard with streaks, reminders, and weekly progress
- Invite-code based family setup so new members can join quickly
- Rewards that turn completed chores into something motivating
- PWA support so it works like a home-screen app on mobile

## Screenshots

| Dashboard | Family |
| --- | --- |
| ![Dashboard](assets/screenshots/dashboard.png) | ![Family](assets/screenshots/family.png) |

| Chores | Rewards |
| --- | --- |
| ![Chores](assets/screenshots/chores.png) | ![Rewards](assets/screenshots/rewards.png) |

## Features

### Household setup

- Sign in with Google or Apple
- Create a household or join one with a 6-character invite code
- Keep a per-device family profile so each device knows who is using it

### Daily chore flow

- Add chores with assignees, due dates, and star values
- View chores in a list or calendar layout
- Mark chores complete with instant visual feedback
- Track overdue work and upcoming tasks from the dashboard

### Family motivation

- See streaks, weekly completion stats, and a family leaderboard
- Add rewards with required star totals
- Let parents manage rewards while kids can redeem what they can afford

### Mobile app behavior

- Installable Progressive Web App
- Service worker support for offline fallback
- Notification prompts for due-date reminders
- Designed around a mobile tab-bar interface instead of a desktop admin layout

## How It Works

1. Sign in with Google or Apple.
2. Create a new household or join one with an invite code.
3. Add family members, chores, and rewards.
4. Complete chores to earn stars.
5. Redeem rewards when enough stars are available.
6. Stay in sync across devices through Firebase Auth and Firestore.

## Getting Started

### 1. Clone the project

```bash
git clone https://github.com/monikad/TidyTribe.git
cd TidyTribe
```

### 2. Add your Firebase config

This app expects a local config file at `utils/env.js`.

```bash
cp utils/env.example.js utils/env.js
```

Then fill in `utils/env.js` with your Firebase project values:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

You also need Firebase Authentication and Firestore enabled in your Firebase project.

### 3. Run the local server

Using the bundled Python server:

```bash
python3 server.py
```

Or choose a custom port:

```bash
python3 server.py 3000
```

Open the app at:

- `http://localhost:8000`
- `http://localhost:3000`

The local server prints your LAN IP too, so you can open the app on your phone while testing on the same Wi-Fi network.

## Firebase Notes

TidyTribe is a static frontend, but it is not a no-backend demo. The core product flow depends on Firebase:

- Firebase Auth for Google and Apple sign-in
- Firestore for household data and live multi-device sync
- Local storage only for device-level profile and cached state

If Firebase is not configured, the app will not move through the real sign-in and household flow.

## Project Structure

```text
TidyTribe/
├── index.html
├── styles.css
├── app.js
├── store.js
├── server.py
├── manifest.json
├── service-worker.js
├── assets/
│   ├── avatars/
│   ├── icons/
│   └── screenshots/
├── components/
│   ├── onboarding.js
│   ├── dashboard.js
│   ├── chores.js
│   ├── calendar.js
│   ├── members.js
│   ├── rewards.js
│   ├── modals.js
│   └── newModals.js
└── utils/
    ├── auth.js
    ├── firebase-config.js
    ├── notifications.js
    ├── safety.js
    ├── streaks.js
    └── sync.js
```

## Stack

- HTML, CSS, and modular vanilla JavaScript
- Firebase Authentication
- Firebase Firestore
- Service Worker and Web App Manifest for PWA support
- Python `http.server`-based local dev server

## Status

This repository is set up as a real product prototype with live auth, household sync, and mobile-first UI flows. The screenshots in this README are captured from the current app in this repo.
