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
let firestoreInstance: Firestore;
let databaseInstance: Database;
let analyticsInstance: Analytics | undefined;

if (typeof window !== "undefined") {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        firestoreInstance = getFirestore(app);
        databaseInstance = getDatabase(app);
        isSupported().then((supported) => {
            if (supported) {
                analyticsInstance = getAnalytics(app);
            }
        });
    } else {
        app = getApp();
        firestoreInstance = getFirestore(app);
        databaseInstance = getDatabase(app);
        if (analyticsInstance === undefined) {
             isSupported().then((supported) => {
                if (supported) {
                    analyticsInstance = getAnalytics(app);
                }
            });
        }
    }
}

export const firestore = () => {
    if (!firestoreInstance) {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        firestoreInstance = getFirestore(app);
    }
    return firestoreInstance;
};

export const database = () => {
    if (!databaseInstance) {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        databaseInstance = getDatabase(app);
    }
    return databaseInstance;
};

export const analytics = () => {
    if (!analyticsInstance) {
        if (typeof window !== "undefined") {
             isSupported().then(supported => {
                if(supported) {
                    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
                    analyticsInstance = getAnalytics(app);
                }
             })
        }
    }
    return analyticsInstance;
};
