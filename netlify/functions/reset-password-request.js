// netlify/functions/reset-password-request.js

const crypto = require("crypto");
const { Client } = require("pg");
const sendEmail = require("./sendEmail");

// Netlify + Neon
const DB_URL =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // Зөвхөн POST зөвшөөрнө
  if (event.httpMethod !== "POST") {
    return response(405, { message: "Method Not Allowed" });
  }

  // Body parse
  let email;
  try {
    const body = JSON.parse(event.body || "{}");
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return response(400, { message: "Invalid JSON body" });
  }

  if (!email) {
    return response(400, { message: "Email шаардлагатай" });
  }

  if (!DB_URL) {
    return response(500, { message: "Database URL тохируулаагүй байна" });
  }

  // Token үүсгэх
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 цаг

  const client = new Client({ connectionString: DB_URL });

  try {
    await client.connect();

    // Token хадгалах
    await client.query(
      `
      INSERT INTO password_resets (email, token, expires_at)
      VALUES ($1, $2, $3)
      `,
      [email, token, expiresAt]
    );
  } catch (err) {
    console.error("DB error:", err);
    return response(500, { message: "DB хадгалах үед алдаа гарлаа" });
  } finally {
    try { await client.end(); } catch {}
  }

  // Reset линк
  const resetLink =
    `https://photoechanter.netlify.app/reset.html?token=${token}`;

  // Email явуулах
  try {
    await sendEmail(
      email,
      "Password Reset",
      `
        <h3>Нууц үг сэргээх</h3>
        <p>Доорх линк дээр дарж нууц үгээ солино уу.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>⏰ Энэ линк 1 цаг хүчинтэй.</p>
      `
    );
  } catch (err) {
    console.error("Email error:", err);
    return response(500, { message: "Имэйл илгээж чадсангүй" });
  }

  // Security: email байгаа/байхгүйг ил гаргахгүй
  return response(200, {
    message: "Хэрвээ энэ email бүртгэлтэй бол reset линк илгээгдсэн."
  });
};
