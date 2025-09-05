// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "excel-insights-qcu6e",
  "appId": "1:371473431007:web:96672b4aface6e06296c6a",
  "storageBucket": "excel-insights-qcu6e.firebasestorage.app",
  "apiKey": "AIzaSyAfInve2z7YKMcEHe0UzSYils0jPFbQysU",
  "authDomain": "excel-insights-qcu6e.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "371473431007"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
