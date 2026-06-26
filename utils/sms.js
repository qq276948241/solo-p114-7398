function generateCode(length = 6) {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function sendVerificationCode(phone, code) {
  console.log(`[短信模拟] 发送给 ${phone} 的验证码是: ${code}`);
  return Promise.resolve({
    success: true,
    message: `验证码已发送（模拟）：${code}`
  });
}

module.exports = {
  generateCode,
  sendVerificationCode
};
