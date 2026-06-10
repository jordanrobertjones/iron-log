import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Each user gets one document with all their data
// Path: users/{uid}
// Structure: { workouts: {...}, cardio: [...], goal: "full", swaps: {...} }

let lastErrorCode = null;

function recordError(label, error) {
  lastErrorCode = error?.code || 'unknown';
  console.error(`${label}:`, error);
}

export function getLastDbErrorCode() {
  return lastErrorCode;
}

export async function loadUserData(uid) {
  try {
    lastErrorCode = null;
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    recordError('Load error', e);
    return null;
  }
}

export async function saveUserData(uid, data) {
  try {
    lastErrorCode = null;
    const ref = doc(db, 'users', uid);
    await setDoc(ref, data, { merge: true });
    return true;
  } catch (e) {
    recordError('Save error', e);
    return false;
  }
}

export async function updateField(uid, field, value) {
  try {
    lastErrorCode = null;
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { [field]: value });
    return true;
  } catch (e) {
    recordError('Update error', e);
    return false;
  }
}
