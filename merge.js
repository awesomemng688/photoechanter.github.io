const fileA = document.getElementById("fileA");
const fileB = document.getElementById("fileB");
const mergeBtn = document.getElementById("mergeBtn");
const swapBtn = document.getElementById("swapBtn");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Free өдөрт 1 удаа (сервергүй түр хувилбар)
function canUseToday() {
  const today = new Date().toISOString().slice(0,10);
  return localStorage.getItem("free_last_used_merge") !== today;
}
function markUsedToday() {
  const today = new Date().toISOString().slice(0,10);
  localStorage.setItem("free_last_used_merge", today);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject("2 зураг хоёуланг нь сонгоорой.");
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject("Зураг уншиж чадсангүй.");
    img.src = URL.createObjectURL(file);
  });
}

async function doMerge(){
  if (!canUseToday()) {
    alert("Free: өдөрт 1 зураг. Маргааш дахин орж ашиглаарай 😊");
    return;
  }

  const img1 = await loadImage(fileA.files[0]);
  const img2 = await loadImage(fileB.files[0]);

  const targetH = Math.max(img1.height, img2.height);
  const w1 = Math.round(img1.width * (targetH / img1.height));
  const w2 = Math.round(img2.width * (targetH / img2.height));

  canvas.width = w1 + w2;
  canvas.height = targetH;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img1, 0, 0, w1, targetH);
  ctx.drawImage(img2, w1, 0, w2, targetH);

  downloadBtn.href = canvas.toDataURL("image/png");
  downloadBtn.style.display = "inline-flex";

  markUsedToday();
}

mergeBtn.addEventListener("click", () => {
  doMerge().catch(e => alert(typeof e === "string" ? e : "Алдаа гарлаа"));
});

swapBtn.addEventListener("click", () => {
  // файл солих (input дээр шууд солих боломжгүй тул хэрэглэгчид дахин сонгуулна)
  alert("A/B солихын тулд хоёр зургаа эсрэгээр нь дахин сонгоорой. (Дараа нь auto swap хийж өгч болно)");
});
