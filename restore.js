// ===== AI Restore (POST -> Netlify Function) =====
aiBtn && aiBtn.addEventListener("click", async (e) => {
  e.preventDefault(); // form submit-ээс хамгаална

  if (!fileR?.files?.[0]) {
    alert("Эхлээд зураг сонгоорой");
    return;
  }

  setText(aiStatus, "🤖 AI сэргээж байна... (10–30 сек)");
  if (aiResult) aiResult.style.display = "none";

  const file = fileR.files[0];

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const fnUrl = "/.netlify/functions/ai-restore";

      const r = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: reader.result })
      });

      const raw = await r.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      // JSON биш (ихэвчлэн 404/405 HTML)
      if (!data) {
        setText(aiStatus, `❌ Function JSON биш буцаалаа (status ${r.status}). ` + raw.slice(0, 140));
        return;
      }

      // Алдаа бол дэлгэрэнгүй харуул
      if (!r.ok) {
        setText(aiStatus, "❌ Алдаа:\n" + JSON.stringify(data, null, 2));
        return;
      }

      const out = Array.isArray(data.output) ? data.output[data.output.length - 1] : data.output;
      if (!out) {
        setText(aiStatus, "❌ AI output олдсонгүй.");
        console.log(data);
        return;
      }

      aiResult.src = out;
      aiResult.style.display = "block";
      setText(aiStatus, "✅ AI сэргээлт бэлэн!");
    } catch (err) {
      setText(aiStatus, "❌ Failed to fetch: " + (err?.message || err));
    }
  };

  reader.readAsDataURL(file);
});
