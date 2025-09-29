// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-2181157065-1eeef",
  "appId": "1:441437458465:web:e567aaf8547cf859099360",
  "apiKey": "AIzaSyD9NXHZIQgnKNwCBsPTB3dbnBbx6MMFeuc",
  "authDomain": "studio-2181157065-1eeef.firebaseapp.com",
  "databaseURL": "https://studio-2181157065-1eeef-default-rtdb.firebaseio.com",
  "storageBucket": "studio-2181157065-1eeef.appspot.com",
  "messagingSenderId": "441437458465",
  "measurementId": "G-5G3W9K5153"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let firestore: Firestore;
let database: Database;
let analytics: Analytics | undefined;

function getFirestoreInstance() {
    if (!firestore) {
        firestore = getFirestore(app);
    }
    return firestore;
}

function getDatabaseInstance() {
    if (!database) {
        database = getDatabase(app);
    }
    return database;
}

function getAnalyticsInstance() {
    if (typeof window !== 'undefined' && !analytics) {
        isSupported().then((supported) => {
            if (supported) {
                analytics = getAnalytics(app);
            }
        });
    }
    return analytics;
}

// Call this once to initialize analytics if needed
getAnalyticsInstance();


export { app, getFirestoreInstance as firestore, getDatabaseInstance as database, getAnalyticsInstance as analytics };
