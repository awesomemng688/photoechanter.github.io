// netlify/functions/ai-colorize.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Missing REPLICATE_API_TOKEN in Netlify env vars" }) };
    }

    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); } catch {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { image } = payload;
    if (!image) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "image is required" }) };
    }

    // DDColor latest version (full 64-char id from Replicate versions page)
    const version = "ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695";

    // start
    const startResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version,
        input: {
          image,       // dataURL OK
          render_factor: 35 // (зарим зурагт сайн таардаг дундаж)
        }
      })
    });

    let prediction = await startResp.json();
    if (!startResp.ok) {
      return { statusCode: startResp.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Replicate start failed", details: prediction }) };
    }

    // poll
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise((r) => setTimeout(r, 1500));
      const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${token}` }
      });
      prediction = await pollResp.json();
      if (!pollResp.ok) {
        return { statusCode: pollResp.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Replicate poll failed", details: prediction }) };
      }
    }

    if (prediction.status === "failed") {
      return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Colorize failed", details: prediction }) };
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ output: prediction.output }) };

  } catch (e) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e?.message || "Unknown error" }) };
  }
};
