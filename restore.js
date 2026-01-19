const aiBtn = document.getElementById("aiRestoreBtn");
const aiStatus = document.getElementById("aiStatus");
const aiResult = document.getElementById("aiResult");

aiBtn.onclick = async () => {
  if (!fileR.files[0]) {
    alert("Эхлээд зураг сонгоорой");
    return;
  }

  aiStatus.textContent = "🤖 AI сэргээж байна... (10–20 сек)";
  aiResult.style.display = "none";

  // файл → base64
  const file = fileR.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const r = await fetch("/.netlify/functions/ai-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: reader.result })
      });

      const data = await r.json();
      if (!data.output) {
        aiStatus.textContent = "❌ AI сэргээж чадсангүй";
        return;
      }

      // Replicate ихэнхдээ URL array буцаадаг
      aiResult.src = Array.isArray(data.output)
        ? data.output[data.output.length - 1]
        : data.output;

      aiResult.style.display = "block";
      aiStatus.textContent = "✅ AI сэргээлт бэлэн!";

    } catch (e) {
      aiStatus.textContent = "❌ Алдаа: " + e.message;
    }
  };
  reader.readAsDataURL(file);
};
