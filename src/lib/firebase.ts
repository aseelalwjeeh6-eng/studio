// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSm7AADP9BzbMvgRy04JSCviZUwx1KCtA",
  authDomain: "aseel-baa6e.firebaseapp.com",
  databaseURL: "https://aseel-baa6e-default-rtdb.firebaseio.com",
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
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Analytics", error);
  }
}

export { app, database, analytics };
