import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  "apiKey": "AIzaSyD9NXHZIQgnKNwCBsPTB3dbnBbx6MMFeuc",
  "authDomain": "studio-2181157065-1eeef.firebaseapp.com",
  "databaseURL": "https://studio-2181157065-1eeef-default-rtdb.europe-west1.firebasedatabase.app",
  "projectId": "studio-2181157065-1eeef",
  "storageBucket": "studio-2181157065-1eeef.firebasestorage.app",
  "messagingSenderId": "441437458465",
  "appId": "1:441437458465:web:e567aaf8547cf859099360"
};


// Initialize Firebase
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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
