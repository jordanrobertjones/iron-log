# Iron Log

A mobile-first workout tracker with smart progression suggestions, a running coach, and cross-device sync.

## Features

- **3-day strength program** (A/B/C) with progression tracking
- **Smart suggestions**: "Go up to 55lbs" or "Stay here and build reps"
- **Running coach**: goal-based advice, weekly mileage tracking, pace trends
- **Exercise swap**: curated alternatives + custom exercises, history preserved
- **Stopwatch** for timed exercises (plank, farmer's carry)
- **60-second rest timer** between sets
- **Coaching cues** with YouTube form video links
- **CSV export** of all data
- **Cross-device sync** via Firebase (phone + computer)
- **Google sign-in** for multi-user support

## Setup (takes about 5 minutes)

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Name it something like `iron-log`
4. Disable Google Analytics (not needed) and click **Create**

### 2. Enable Google Sign-In

1. In your Firebase project, go to **Authentication** (left sidebar)
2. Click **"Get started"**
3. Click **Google** under "Sign-in method"
4. Toggle **Enable**
5. Select your email as the support email
6. Click **Save**

### 3. Create Firestore Database

1. Go to **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll add rules later)
4. Choose your region (us-central1 is fine)
5. Click **Done**

### 4. Get Your Firebase Config

1. Go to **Project Settings** (gear icon, top left)
2. Scroll to **"Your apps"** section
3. Click the web icon **</>** to add a web app
4. Name it `iron-log`, skip hosting
5. Copy the `firebaseConfig` object that appears

### 5. Add Config to the App

Open `src/firebase.js` and replace the placeholder config:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",          // from step 4
  authDomain: "iron-log-xxxxx.firebaseapp.com",
  projectId: "iron-log-xxxxx",
  storageBucket: "iron-log-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 6. Add Your GitHub Pages Domain to Firebase Auth

1. In Firebase Console, go to **Authentication > Settings**
2. Under **Authorized domains**, click **Add domain**
3. Add: `jordanrobertjones.github.io`

### 7. Install and Run Locally

```bash
cd iron-log
npm install
npm run dev
```

Open http://localhost:5173/iron-log/ in your browser.

### 8. Deploy to GitHub Pages

```bash
# Create the repo on GitHub first, then:
git init
git remote add origin git@github.com:jordanrobertjones/iron-log.git
git add .
git commit -m "Initial commit"
git push -u origin main

# Deploy to GitHub Pages
npm run deploy
```

Your app will be live at: **https://jordanrobertjones.github.io/iron-log/**

### 9. (Optional) Secure Firestore Rules

Once everything is working, go to **Firestore > Rules** and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each user can only read/write their own data.

## Project Structure

```
iron-log/
  src/
    main.jsx        # Entry point
    App.jsx         # Main app component (auth, UI, all features)
    firebase.js     # Firebase config (YOU EDIT THIS)
    db.js           # Firestore read/write operations
    data.js         # Exercises, alternatives, seed data, logic
  public/
    404.html        # GitHub Pages SPA routing
  index.html        # HTML shell
  vite.config.js    # Build config
  package.json
```

## Updating Exercises

All exercise definitions are in `src/data.js`. To add a new alternative:

1. Add it to the `ALTS` object under the exercise slot it replaces
2. Give it a unique `id`, `name`, `cue`, `notes`, and `video` URL

To change the default program, edit `DAY_SLOTS` and `DEFAULT_EX`.
