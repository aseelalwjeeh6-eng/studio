import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

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

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database: Database = getDatabase(app);

const getAnalyticsInstance = async () => {
    if (typeof window !== 'undefined') {
        const supported = await isSupported();
        if (supported) {
            return getAnalytics(app);
        }
    }
    return null;
}

export { app, database, getAnalyticsInstance };
