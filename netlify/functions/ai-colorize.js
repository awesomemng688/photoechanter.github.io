// netlify/functions/ai-colorize.js
// Replicate DDColor -> image colorization (B/W -> color)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  try {
    // GET шалгалт (browser-оор нээхэд OK гэж буцаана)
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, msg: "ai-colorize is alive. Use POST with { image }." }),
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing REPLICATE_API_TOKEN in Netlify env vars" }),
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const { image } = payload;
    if (!image) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "image is required" }),
      };
    }

    // ✅ DDColor version (64-char). Хэрвээ 422 "Invalid version" гарвал
    // replicate.com дээрх DDColor model -> Versions табаас шинэ hash аваад солих хэрэгтэй.
    const version = "ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695";

    // --- helper: create prediction with 429 retry ---
    async function createPrediction() {
      const startResp = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "netlify-function-ai-colorize",
        },
        body: JSON.stringify({
          version,
          input: {
            image,          // dataURL OK
            render_factor: 35,
          },
        }),
      });

      const startJson = await startResp.json().catch(() => ({}));

      // 429 throttling -> retry_after-г дагаж 1 удаа дахин оролдоно
      if (startResp.status === 429) {
        const retryAfter = Number(startJson?.retry_after ?? startJson?.detail?.retry_after ?? 8);
        const wait = Math.max(3, retryAfter) + 1;
        await sleep(wait * 1000);

        const startResp2 = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "netlify-function-ai-colorize",
          },
          body: JSON.stringify({
            version,
            input: { image, render_factor: 35 },
          }),
        });

        const startJson2 = await startResp2.json().catch(() => ({}));
        return { resp: startResp2, json: startJson2 };
      }

      return { resp: startResp, json: startJson };
    }

    // 1) Start
    const { resp: startResp, json: prediction0 } = await createPrediction();

    if (!startResp.ok) {
      return {
        statusCode: startResp.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Replicate start failed", details: prediction0 }),
      };
    }

    let prediction = prediction0;

    // 2) Poll
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await sleep(1500);

      const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          Authorization: `Token ${token}`,
          "User-Agent": "netlify-function-ai-colorize",
        },
      });

      const pollJson = await pollResp.json().catch(() => ({}));

      if (!pollResp.ok) {
        return {
          statusCode: pollResp.status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Replicate poll failed", details: pollJson }),
        };
      }

      prediction = pollJson;
    }

    if (prediction.status === "failed") {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Colorize failed", details: prediction }),
      };
    }

    // 3) Success: output заримдаа array, заримдаа string байдаг -> хамгийн сүүлийн URL-г буцаая
    const out = Array.isArray(prediction.output)
      ? prediction.output[prediction.output.length - 1]
      : prediction.output;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output: out, raw: prediction.output }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: e?.message || "Unknown error" }),
    };
  }
};
