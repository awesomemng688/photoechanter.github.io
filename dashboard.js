const email = getUser();
if (!email) {
  alert("Нэвтэрч орно уу");
  location.href = "login.html";
}

document.getElementById("userEmail").textContent = "Email: " + email;

// Fake data (дараа Firebase-с ирнэ)
document.getElementById("proStatus").textContent = "Free";
document.getElementById("xp").textContent = "10 XP";
