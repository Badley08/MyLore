// firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDA2NbiKTUPcLss46VuySWkudrASTqNuzs",
  authDomain: "myln-63149.firebaseapp.com",
  projectId: "myln-63149",
  storageBucket: "myln-63149.firebasestorage.app",
  messagingSenderId: "884085220163",
  appId: "1:884085220163:web:37b1c9cb01e1b61b4705f6",
  measurementId: "G-0NV9QTEVEQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Export the firestore database instance so you can use it in other files
export { db };