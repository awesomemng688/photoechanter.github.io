const crypto = require("crypto");
const sendEmail = require("./sendEmail"); // өөрээ бичих эсвэл email API

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);

  // 1) token үүсгэх
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 3600000; // 1 цаг хүчинтэй

  // 2) Токеныг DB-д хадгалах (users table дээр)
  await saveTokenToDatabase(email, token, expires); // өөрөө бичнэ

  // 3) И-мэйл явуулах (reset линктэй)
  const resetLink = `https://photoechanter.netlify.app/reset.html?token=${token}`;
  await sendEmail(email, "Password Reset", `Click here: ${resetLink}`);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "И-мэйл явууллаа!" })
  }
};
