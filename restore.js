// ===============================
// Photo Tools MN - restore.js
// Apply / Presets / Download / AI Restore
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  // ===== Elements =====
  const fileR = document.getElementById("fileR");
  const canvas = document.getElementById("canvasR");
  const ctx = canvas?.getContext("2d");

  const autoBtn  = document.getElementById("autoBtn");
  const faceBtn  = document.getElementById("faceBtn");
  const oldBtn   = document.getElementById("oldBtn");
  const applyBtn = document.getElementById("applyBtn");
  const aiBtn    = document.getElementById("aiRestoreBtn");

  const downloadR = document.getElementById("downloadR");
  const statusEl  = document.getElementById("status");
  const aiStatus  = document.getElementById("aiStatus");
  const aiResult  = document.getElementById("aiResult");

  const sharpenEl  = document.getElementById("sharpen");
  const denoiseEl  = document.getElementById("denoise");
  const brightEl   = document.getElementById("bright");
  const contrastEl = document.getElementById("contrast");
  const satEl      = document.getElementById("sat");

  // ===== Guard =====
  const required = ["fileR","canvasR","autoBtn","faceBtn","oldBtn","applyBtn","aiRestoreBtn","status","aiStatus","aiResult"];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length) {
    console.error("Missing IDs:", missing);
    alert("❌ restore.html дээр эдгээр id алга байна: " + missing.join(", "));
    return;
  }
  if (!canvas || !ctx) {
    alert("❌ Canvas олдсонгүй. canvasR шалга.");
    return;
  }

  let baseImg = null;

  // ===== Helpers =====
  const setText = (el, t) => { if (el) el.textContent = t; };

  function loadImage(file){
    return new Promise((resolve, reject) => {
      if (!file) return reject("Зургаа сонгоорой.");
      // Зураг форматыг түр шалгана
      if (!file.type?.startsWith("image/")) {
        return reject("Зураг файл сонгоорой (.jpg/.png).");
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject("Зураг уншиж чадсангүй.");
      img.src = URL.createObjectURL(file);
    });
  }

  function setPreset(preset){
    if (preset === "auto") {
      sharpenEl.value = 35; denoiseEl.value = 25;
      brightEl.value = 105; contrastEl.value = 120; satEl.value = 112;
    } else if (preset === "face") {
      sharpenEl.value = 45; denoiseEl.value = 15;
      brightEl.value = 108; contrastEl.value = 125; satEl.value = 115;
    } else if (preset === "old") {
      sharpenEl.value = 30; denoiseEl.value = 40;
      brightEl.value = 110; contrastEl.value = 135; satEl.value = 118;
    }
  }

  function tryEnhance(denoise, sharpen){
    // Энгийн denoise + sharpen (client-side)
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imgData.data;
    const w = canvas.width, h = canvas.height;
    const idx = (x,y)=> (y*w + x)*4;

    // Denoise
    const d = Math.min(1, denoise/100);
    if (d>0){
      const copy = new Uint8ClampedArray(data);
      const r = d>0.66 ? 2 : 1;
      for (let y=r; y<h-r; y++){
        for (let x=r; x<w-r; x++){
          let R=0,G=0,B=0,C=0;
          for (let yy=-r; yy<=r; yy++){
            for (let xx=-r; xx<=r; xx++){
              const i=idx(x+xx,y+yy);
              R+=copy[i]; G+=copy[i+1]; B+=copy[i+2]; C++;
            }
          }
          const i=idx(x,y);
          data[i]   = data[i]*(1-d)   + (R/C)*d;
          data[i+1] = data[i+1]*(1-d) + (G/C)*d;
          data[i+2] = data[i+2]*(1-d) + (B/C)*d;
        }
      }
    }

    // Sharpen
    const s = Math.min(1, sharpen/100);
    if (s>0){
      const copy = new Uint8ClampedArray(data);
      for (let y=1; y<h-1; y++){
        for (let x=1; x<w-1; x++){
          const c=idx(x,y), l=idx(x-1,y), r=idx(x+1,y), u=idx(x,y-1), d2=idx(x,y+1);
          for (let ch=0; ch<3; ch++){
            const v = copy[c+ch]*5 - copy[l+ch] - copy[r+ch] - copy[u+ch] - copy[d2+ch];
            data[c+ch] = copy[c+ch]*(1-s) + Math.max(0,Math.min(255,v))*s;
          }
        }
      }
    }

    ctx.putImageData(imgData,0,0);
  }

  function applyFilters(){
    if (!baseImg) return;

    const bright = Number(brightEl.value);
    const contrast = Number(contrastEl.value);
    const sat = Number(satEl.value);

    ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    tryEnhance(Number(denoiseEl.value), Number(sharpenEl.value));

    // Download link
    downloadR.href = canvas.toDataURL("image/png");
    downloadR.style.display = "inline-flex";
  }

  // ===== Events: File change =====
  fileR.addEventListener("change", async () => {
    try{
      const img = await loadImage(fileR.files[0]);
      baseImg = img;

      // Canvas хэмжээг хэт том байвал browser гацаж магадгүй тул resize хийнэ (safe)
      const maxW = 1600;
      const scale = img.width > maxW ? (maxW / img.width) : 1;
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      setText(statusEl, "✅ Зураг бэлэн. Preset сонгоод Apply дар.");
      downloadR.style.display = "none";

      aiResult.style.display = "none";
      setText(aiStatus, "");
    }catch(e){
      setText(statusEl, "❌ " + e);
    }
  });

  // ===== Presets =====
  autoBtn.addEventListener("click", (e)=>{ e.preventDefault(); setPreset("auto"); setText(statusEl,"✨ Auto Enhance preset"); });
  faceBtn.addEventListener("click", (e)=>{ e.preventDefault(); setPreset("face"); setText(statusEl,"🙂 Face Focus preset"); });
  oldBtn .addEventListener("click", (e)=>{ e.preventDefault(); setPreset("old");  setText(statusEl,"🕰️ Old Photo preset"); });

  // ===== Apply =====
  applyBtn.addEventListener("click", (e)=> {
    e.preventDefault();
    if (!baseImg){ alert("Эхлээд зураг сонгоорой."); return; }
    applyFilters();
  });

  // ===== AI Restore (POST -> Netlify Function) =====
  aiBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!fileR?.files?.[0]) {
      alert("Эхлээд зураг сонгоорой");
      return;
    }

    setText(aiStatus, "🤖 AI сэргээж байна... (10–30 сек)");
    aiResult.style.display = "none";

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

        if (!data) {
          setText(aiStatus, `❌ Function JSON биш буцаалаа (status ${r.status}). ` + raw.slice(0, 160));
          return;
        }

        if (!r.ok) {
          setText(aiStatus, "❌ Алдаа:\n" + JSON.stringify(data, null, 2));
          return;
        }

        const out = Array.isArray(data.output) ? data.output[data.output.length - 1] : data.output;
        if (!out) {
          setText(aiStatus, "❌ AI output олдсонгүй.");
          console.log("AI response:", data);
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

});
