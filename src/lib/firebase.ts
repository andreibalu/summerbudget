
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp;
let db: Database | null = null;

if (typeof window !== "undefined") { // Ensure Firebase is initialized only on the client-side
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization error:", error);
      // In case of error, firebaseApp remains uninitialized or could be a dummy
      // to prevent further crashes if not handled properly.
    }
  } else {
    firebaseApp = getApp();
  }

  if (firebaseApp! && firebaseApp.options?.projectId) {
    try {
      db = getDatabase(firebaseApp);
    } catch (error) {
      console.error("Firebase Database initialization error:", error);
    }
  } else {
    console.warn("Firebase app not fully configured or projectId is missing. Realtime Database might not work.");
  }
}


export { firebaseApp, db };
