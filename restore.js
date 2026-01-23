document.addEventListener("DOMContentLoaded", () => {

  // ===== ELEMENTS =====
  const fileR = document.getElementById("fileR");
  const canvas = document.getElementById("canvasR");
  const ctx = canvas.getContext("2d");

  const autoBtn = document.getElementById("autoBtn");
  const faceBtn = document.getElementById("faceBtn");
  const oldBtn  = document.getElementById("oldBtn");
  const applyBtn = document.getElementById("applyBtn");

  const aiBtn = document.getElementById("aiRestoreBtn");
  const colorizeBtn = document.getElementById("colorizeBtn");

  const downloadR = document.getElementById("downloadR");
  const statusEl = document.getElementById("status");
  const aiStatus = document.getElementById("aiStatus");
  const aiResult = document.getElementById("aiResult");

  const sharpenEl = document.getElementById("sharpen");
  const denoiseEl = document.getElementById("denoise");
  const brightEl  = document.getElementById("bright");
  const contrastEl= document.getElementById("contrast");
  const satEl     = document.getElementById("sat");

  let baseImg = null;

  // ===== HELPERS =====
  const setText = (el, t) => { if (el) el.textContent = t; };

  function loadImage(file){
    return new Promise((resolve, reject) => {
      if (!file) return reject("Зургаа сонгоорой");
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject("Зураг уншиж чадсангүй");
      img.src = URL.createObjectURL(file);
    });
  }

  function fileToDataURL(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject("FileReader error");
      reader.readAsDataURL(file);
    });
  }

  function setPreset(p){
    if (p==="auto"){ sharpenEl.value=35; denoiseEl.value=25; brightEl.value=105; contrastEl.value=120; satEl.value=112; }
    if (p==="face"){ sharpenEl.value=45; denoiseEl.value=15; brightEl.value=108; contrastEl.value=125; satEl.value=115; }
    if (p==="old"){  sharpenEl.value=30; denoiseEl.value=40; brightEl.value=110; contrastEl.value=135; satEl.value=118; }
  }

  // ===== CANVAS FILTER =====
  function tryEnhance(denoise, sharpen){
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const d = Math.min(1, denoise/100);
    const s = Math.min(1, sharpen/100);

    if (d>0){
      const copy = new Uint8ClampedArray(imgData.data);
      for (let i=0;i<imgData.data.length;i+=4){
        imgData.data[i]   = imgData.data[i]*(1-d) + copy[i]*d;
        imgData.data[i+1] = imgData.data[i+1]*(1-d) + copy[i+1]*d;
        imgData.data[i+2] = imgData.data[i+2]*(1-d) + copy[i+2]*d;
      }
    }
    if (s>0){
      for (let i=0;i<imgData.data.length;i+=4){
        imgData.data[i]   = Math.min(255, imgData.data[i]*(1+s));
        imgData.data[i+1] = Math.min(255, imgData.data[i+1]*(1+s));
        imgData.data[i+2] = Math.min(255, imgData.data[i+2]*(1+s));
      }
    }
    ctx.putImageData(imgData,0,0);
  }

  function applyFilters(){
    if (!baseImg) return;
    ctx.filter = `brightness(${brightEl.value}%) contrast(${contrastEl.value}%) saturate(${satEl.value}%)`;
    ctx.drawImage(baseImg,0,0,canvas.width,canvas.height);
    ctx.filter = "none";
    tryEnhance(Number(denoiseEl.value), Number(sharpenEl.value));
    downloadR.href = canvas.toDataURL("image/png");
    downloadR.style.display="inline-flex";
  }

  // ===== RATE LIMIT LOCK =====
  let aiBusy = false;
  const COOLDOWN = 10;

  async function withLock(btn, fn){
    if (aiBusy){
      setText(aiStatus,"⏳ Түр хүлээгээрэй…");
      return;
    }
    aiBusy = true;
    aiBtn.disabled = true;
    colorizeBtn.disabled = true;

    try{
      await fn(); // 🔥 ЭНЭ ЧУХАЛ
    }finally{
      let left = COOLDOWN;
      setText(aiStatus,`⏳ ${left}s хүлээгээд дахин туршаарай`);
      const t = setInterval(()=>{
        left--;
        if (left<=0){
          clearInterval(t);
          aiBusy=false;
          aiBtn.disabled=false;
          colorizeBtn.disabled=false;
          setText(aiStatus,"");
        }else{
          setText(aiStatus,`⏳ ${left}s хүлээгээд дахин туршаарай`);
        }
      },1000);
    }
  }

  // ===== CALL NETLIFY FUNCTION =====
  async function callFn(url, image, msg){
    setText(aiStatus,msg);
    aiResult.style.display="none";

    const r = await fetch(url,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ image })
    });

    const data = await r.json();
    if (!r.ok){
      throw new Error(JSON.stringify(data));
    }

    const out = Array.isArray(data.output) ? data.output.at(-1) : data.output;
    aiResult.src = out;
    aiResult.style.display="block";
    setText(aiStatus,"✅ Бэлэн!");
  }

  // ===== EVENTS =====
  fileR.addEventListener("change", async ()=>{
    const img = await loadImage(fileR.files[0]);
    baseImg = img;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img,0,0);
    setText(statusEl,"✅ Зураг бэлэн. Preset сонгоод Apply дар.");
  });

  autoBtn.onclick = ()=>setPreset("auto");
  faceBtn.onclick = ()=>setPreset("face");
  oldBtn.onclick  = ()=>setPreset("old");
  applyBtn.onclick = applyFilters;

  aiBtn.onclick = ()=>{
    if (!fileR.files[0]) return alert("Зураг сонго");
    withLock(aiBtn, async ()=>{
      const img64 = await fileToDataURL(fileR.files[0]);
      await callFn("/.netlify/functions/ai-restore", img64, "🤖 Restore HD хийж байна…");
    });
  };

  colorizeBtn.onclick = ()=>{
    if (!fileR.files[0]) return alert("Зураг сонго");
    withLock(colorizeBtn, async ()=>{
      const img64 = await fileToDataURL(fileR.files[0]);
      await callFn("/.netlify/functions/ai-colorize", img64, "🎨 Colorize хийж байна…");
    });
  };

});
