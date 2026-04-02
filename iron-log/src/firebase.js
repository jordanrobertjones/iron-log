import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6fCguQf1PfW6n0hXwffslYoKqW7etLH0",
  authDomain: "iron-log-b7f71.firebaseapp.com",
  projectId: "iron-log-b7f71",
  storageBucket: "iron-log-b7f71.firebasestorage.app",
  messagingSenderId: "327011491449",
  appId: "1:327011491449:web:e3a157846fd2c855a73ea8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
```

Save the file.

**Step 2: Open your terminal**

Open Terminal (Mac) or Command Prompt (Windows). Navigate to the iron-log folder:
```
cd path/to/iron-log
```

For example if you unzipped it on your Desktop it might be:
```
cd ~/Desktop/iron-log
```

**Step 3: Install and run**
```
npm install
```

Wait for it to finish (might take a minute), then:
```
npm run dev