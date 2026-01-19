export default async (req, context) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "image is required" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const token = context.env.REPLICATE_API_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing API token" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    // Start prediction
    const start = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`,
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

    let prediction = await start.json();

    // Poll until finished
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        { headers: { "Authorization": `Token ${token}` } }
      );
      prediction = await poll.json();
    }

    if (prediction.status === "failed") {
      return new Response(JSON.stringify({ error: "AI restore failed" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ output: prediction.output }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
