exports.handler = async (event) => {
  const { token, newPassword } = JSON.parse(event.body);

  const record = await getTokenRecord(token); // DB-ээс token татах

  if (!record || record.expires < Date.now()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Token буруу эсвэл хугацаа нь дууссан." })
    };
  }

  // New password hash
  const hashed = await hashPassword(newPassword);

  // DB update (user password)
  await updateUserPassword(record.email, hashed);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Нууц үг амжилттай солиогдлоо." })
  };
};
