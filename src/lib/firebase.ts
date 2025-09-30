import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  "projectId": "studio-2181157065-1eeef",
  "appId": "1:441437458465:web:e567aaf859099360",
  "apiKey": "AIzaSyD9NXHZIQgnKNwCBsPTB3dbnBbx6MMFeuc",
  "authDomain": "studio-2181157065-1eeef.firebaseapp.com",
  "databaseURL": "https://studio-2181157065-1eeef-default-rtdb.firebaseio.com",
  "storageBucket": "studio-2181157065-1eeef.appspot.com",
  "messagingSenderId": "441437458465",
  "measurementId": "G-5G3W9K5153"
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
let firestore: Firestore;
let database: Database;
let analytics: Analytics | undefined;

function getFirestoreInstance(): Firestore {
  if (!firestore) {
    firestore = getFirestore(app);
  }
  return firestore;
}

function getDatabaseInstance(): Database {
  if (!database) {
    database = getDatabase(app);
  }
  return database;
}

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported && !analytics) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, getFirestoreInstance, getDatabaseInstance, analytics };
