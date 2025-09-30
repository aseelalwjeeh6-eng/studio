import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getFirestore, Firestore } from "firebase/firestore";
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

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestoreInstance: Firestore = getFirestore(app);
const databaseInstance: Database = getDatabase(app);
let analyticsInstance: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  });
}

// Export functions that return the instances
export const firestore = () => firestoreInstance;
export const database = () => databaseInstance;
export const analytics = () => analyticsInstance;
