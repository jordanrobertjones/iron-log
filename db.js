import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Each user gets one document with all their data
// Path: users/{uid}
// Structure: { workouts: {...}, cardio: [...], goal: "full", swaps: {...} }

export async function loadUserData(uid) {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    console.error('Load error:', e);
    return null;
  }
}

export async function saveUserData(uid, data) {
  try {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, data, { merge: true });
    return true;
  } catch (e) {
    console.error('Save error:', e);
    return false;
  }
}

export async function updateField(uid, field, value) {
  try {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { [field]: value });
    return true;
  } catch (e) {
    console.error('Update error:', e);
    return false;
  }
}
