import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSm7AADP9BzbMvgRy04JSCviZUwx1KCtA",
  authDomain: "aseel-baa6e.firebaseapp.com",
  projectId: "aseel-baa6e",
  storageBucket: "aseel-baa6e.appspot.com",
  messagingSenderId: "44546543857",
  appId: "1:44546543857:web:adf604bc99b7f65def1950",
  measurementId: "G-BJGJTHGFFD"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);

// Initialize Analytics if running in the browser
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, database, analytics };
