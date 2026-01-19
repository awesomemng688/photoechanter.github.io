exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing REPLICATE_API_TOKEN in Netlify env vars" })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid JSON body" })
      };
    }

    const { image } = payload;
    if (!image) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "image is required" })
      };
    }

    // 1) start prediction
    const startResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "8af9d9c39bca9c8b6d2e8d2e4b1c7c3c7f65a0c6b93e5d4d3a4e8b7f3e0a1c9",
        input: {
          image,
          fidelity: 0.7,
          upscale: 2
        }
      })
    });

    let prediction = await startResp.json();

    if (!startResp.ok) {
      return {
        statusCode: startResp.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Replicate start failed", details: prediction })
      };
    }

    // 2) poll
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise((r) => setTimeout(r, 1500));

      const pollResp = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        { headers: { Authorization: `Token ${token}` } }
      );

      prediction = await pollResp.json();

      if (!pollResp.ok) {
        return {
          statusCode: pollResp.status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Replicate poll failed", details: prediction })
        };
      }
    }

    if (prediction.status === "failed") {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI restore failed", details: prediction })
      };
    }

    // 3) success
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output: prediction.output })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: e?.message || "Unknown error" })
    };
  }
};
