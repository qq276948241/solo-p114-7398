const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN, VERIFICATION_CODE_EXPIRE_MINUTES } = require('../config');
const { success } = require('../utils/response');
const { generateCode, sendVerificationCode } = require('../utils/sms');
const { asyncHandler, BusinessError } = require('../middleware/errorHandler');

const sendCode = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRE_MINUTES * 60 * 1000);

  await pool.query(
    'INSERT INTO verification_codes (phone, code, expires_at) VALUES (?, ?, ?)',
    [phone, code, expiresAt]
  );

  const result = await sendVerificationCode(phone, code);

  res.json(success({ sms_sent: result.success }, result.message));
});

const login = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;

  const [codeRows] = await pool.query(
    'SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
    [phone, code]
  );

  if (codeRows.length === 0) {
    throw new BusinessError('验证码错误', 400);
  }

  const verificationCode = codeRows[0];
  if (new Date(verificationCode.expires_at) < new Date()) {
    throw new BusinessError('验证码已过期', 400);
  }

  await pool.query(
    'UPDATE verification_codes SET used = 1 WHERE id = ?',
    [verificationCode.id]
  );

  let [userRows] = await pool.query(
    'SELECT * FROM users WHERE phone = ?',
    [phone]
  );

  if (userRows.length === 0) {
    const [result] = await pool.query(
      'INSERT INTO users (phone, name, role) VALUES (?, ?, ?)',
      [phone, `用户${phone.slice(-4)}`, 'customer']
    );
    userRows = [{
      id: result.insertId,
      phone,
      name: `用户${phone.slice(-4)}`,
      role: 'customer'
    }];
  }

  const user = userRows[0];

  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json(success({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role
    }
  }, '登录成功'));
});

const getProfile = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, phone, name, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  if (rows.length === 0) {
    throw new BusinessError('用户不存在', 404);
  }

  res.json(success(rows[0]));
});

module.exports = {
  sendCode,
  login,
  getProfile
};
