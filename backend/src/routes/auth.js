const express = require('express');
const authService = require('../services/authService');
const activityService = require('../services/activityService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Sign up with email/password
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await authService.createUser(email, password, name);
    const token = authService.generateToken(user);

    // Log activity
    await activityService.logUserSignup(user.id, 'email', req);

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sign in with email/password
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await authService.authenticateUser(email, password);
    const token = authService.generateToken(user);

    // Log activity
    await activityService.logUserSignin(user.id, 'email', req);

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Send verification code
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.sendVerificationCode(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify code and sign in
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await authService.verifyCode(email, code);
    const token = authService.generateToken(user);

    // Log activity
    await activityService.logUserSignin(user.id, 'verification_code', req);

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Google OAuth (placeholder - implement with passport-google-oauth20)
router.get('/google', (req, res) => {
  // This would redirect to Google OAuth
  res.json({ error: 'OAuth not implemented yet - coming soon!' });
});

// Microsoft OAuth (placeholder - implement with passport-microsoft)
router.get('/microsoft', (req, res) => {
  // This would redirect to Microsoft OAuth
  res.json({ error: 'OAuth not implemented yet - coming soon!' });
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const newToken = authService.generateToken(req.user);
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;