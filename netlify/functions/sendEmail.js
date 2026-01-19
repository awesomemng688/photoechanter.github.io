// netlify/functions/sendEmail.js
// Usage: const sendEmail = require("./sendEmail"); await sendEmail(to, subject, html);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Photo Tools MN <onboarding@resend.dev>";

module.exports = async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY. Add it in Netlify Environment variables.");
  }
  if (!to) throw new Error("Missing 'to' email.");
  if (!subject) throw new Error("Missing 'subject'.");
  if (!html) throw new Error("Missing 'html'.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error: ${res.status} ${text}`);
  }

  return await res.json();
};
