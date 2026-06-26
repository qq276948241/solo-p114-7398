const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/send-code', validate('sendCode'), authController.sendCode);
router.post('/login', validate('login'), authController.login);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
