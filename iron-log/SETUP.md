# Iron Log -- Setup Guide

## 1. Create a Firebase Project (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Name it `iron-log` (or whatever you like)
4. Disable Google Analytics (not needed) and click **Create**
5. Wait for it to provision

## 2. Enable Authentication

1. In the Firebase console sidebar, click **Build > Authentication**
2. Click **"Get started"**
3. Under "Sign-in method", click **Google**
4. Toggle it **ON**
5. Set your project support email (your Gmail)
6. Click **Save**

## 3. Create Firestore Database

1. In sidebar, click **Build > Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll lock it down after)
4. Pick a region close to you (us-central1 is fine for Utah)
5. Click **Enable**

## 4. Set Firestore Rules

1. In Firestore, click the **Rules** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

This ensures each user can only read/write their own data.

## 5. Get Your Firebase Config

1. In the Firebase console, click the **gear icon** (top left) > **Project settings**
2. Scroll down to "Your apps" section
3. Click the **web icon** (`</>`) to add a web app
4. Name it `Iron Log` and click **Register app**
5. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "iron-log-xxxxx.firebaseapp.com",
  projectId: "iron-log-xxxxx",
  storageBucket: "iron-log-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Copy these values into the `index.html` file where indicated (line ~30)

## 6. Add Authorized Domain

1. In Firebase console > Authentication > Settings > Authorized domains
2. Add `jordanrobertjones.github.io` (your GitHub Pages domain)

## 7. Deploy to GitHub Pages

1. Create a new repo on GitHub called `iron-log`
2. Push the `index.html` file to the repo
3. Go to repo Settings > Pages
4. Set Source to "Deploy from branch", branch `main`, folder `/ (root)`
5. Save

Your app will be live at: `https://jordanrobertjones.github.io/iron-log/`

## 8. Lock Down Firestore (after confirming it works)

The test mode rules expire after 30 days. The rules from step 4 are already secure -- they ensure each user can only access their own data. No further lockdown needed.

## Cost

Firebase free tier (Spark plan) includes:
- 50K reads/day, 20K writes/day, 20K deletes/day
- 1 GiB stored
- Unlimited auth users

For a personal workout tracker, you'll never come close to these limits. Even if 100 people used it daily, you'd still be well within free tier.
