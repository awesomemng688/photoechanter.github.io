// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// 🔥 ЧИНИЙ FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAOMhKD0hW1vhSBLg0WUieeOI39ntsClms",
  authDomain: "awesome-c8d33.firebaseapp.com",
  projectId: "awesome-c8d33",
  storageBucket: "awesome-c8d33.firebasestorage.app",
  messagingSenderId: "35203029718",
  appId: "1:35203029718:web:6980a5699f859545ae4777",
  measurementId: "G-9QSY00THKR"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ===== UI helper =====
function updateAuthUI(user) {
  const el = document.getElementById("authStatus");
  if (!el) return;
  el.textContent = user ? `👤 ${user.email}` : "👤 Guest";
}

// ===== Global functions (HTML-ээс дуудахын тулд) =====
window.firebaseLogin = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

window.firebaseSignup = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
};

window.firebaseLogout = async () => {
  await signOut(auth);
};

window.requireAuthOrRedirect = (redirect = "login.html") => {
  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
    if (!user) window.location.href = redirect;
  });
};

window.watchAuth = (cb) => {
  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
    cb && cb(user);
  });
};

// Auto update header
onAuthStateChanged(auth, (user) => updateAuthUI(user));
