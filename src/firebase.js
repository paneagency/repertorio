import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Configuración de Firebase Real
const firebaseConfig = {
    apiKey: "AIzaSyDWNR40NET0lvAPLnLqRC7oFhKdEBDjzgg",
    authDomain: "repertorio-c3c71.firebaseapp.com",
    projectId: "repertorio-c3c71",
    storageBucket: "repertorio-c3c71.firebasestorage.app",
    messagingSenderId: "668310388611",
    appId: "1:668310388611:web:d6d689d12a03605e0980b6",
    measurementId: "G-ZKKP4DNEDW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize Analytics (Safe check for browser environment)
if (typeof window !== "undefined") {
    try {
        const analytics = getAnalytics(app);
    } catch (e) {
        console.warn("Analytics init failed (likely adblocker or non-browser env):", e);
    }
}
