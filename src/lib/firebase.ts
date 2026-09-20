import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App lazily and safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Real Firebase Authentication — every signed-in user's uid is set (via the
// activateInvitedUser Cloud Function, using the Admin
// SDK) to match that user's existing CRM `usr_xxx` document id, so the rest
// of the app can keep using `currentUser.id` exactly as before.
export const auth: Auth = getAuth(app);

export default app;
