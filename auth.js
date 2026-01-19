// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// 🔥 FIREBASE CONFIG
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

// ===== Error helper (сонголтоор) =====
function friendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("auth/invalid-email")) return "Имэйл буруу байна.";
  if (code.includes("auth/user-not-found")) return "Энэ имэйлээр бүртгэл олдсонгүй.";
  if (code.includes("auth/wrong-password")) return "Нууц үг буруу байна.";
  if (code.includes("auth/invalid-credential")) return "Имэйл эсвэл нууц үг буруу байна.";
  if (code.includes("auth/too-many-requests")) return "Олон удаа оролдлоо. Түр хүлээгээд дахин оролдоорой.";
  return e?.message || "Алдаа гарлаа.";
}

// ===== Global functions (HTML-ээс дуудахын тулд) =====
window.firebaseLogin = async (email, password) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (e) {
    // Login page дээр e.message биш, ойлгомжтой текст хэрэгтэй бол:
    e.message = friendlyAuthError(e);
    throw e;
  }
};

window.firebaseSignup = async (email, password) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (e) {
    e.message = friendlyAuthError(e);
    throw e;
  }
};

window.firebaseLogout = async () => {
  await signOut(auth);
};

// ✅ Forgot password
window.firebaseSendPasswordReset = async (email) => {
  try {
    // Firebase өөрөө имэйл явуулна (Authentication -> Templates тохируулна)
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (e) {
    e.message = friendlyAuthError(e);
    throw e;
  }
};

// ✅ Page хамгаалах (redirect нэг л удаа хийхээр)
window.requireAuthOrRedirect = (redirect = "login.html") => {
  const unsub = onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
    if (!user) window.location.href = redirect;
    unsub(); // нэг удаа шалгаад болиулна
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
