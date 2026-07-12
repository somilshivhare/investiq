import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ── JWT helper ───────────────────────────────────────────────────────────────
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: '7d' }
  );

// ── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ email: emailLower, passwordHash });
    await newUser.save();

    return res.status(201).json({ success: true, token: generateToken(newUser), email: newUser.email });
  } catch (err) {
    console.error('[auth/signup]', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    return res.status(200).json({ success: true, token: generateToken(user), email: user.email });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// ── GET /api/auth/google ─────────────────────────────────────────────────────
// Redirects the browser to Google's OAuth consent screen
router.get('/google', (req, res) => {
  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(
    `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`
  );
  const scope = encodeURIComponent('openid email profile');

  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=select_account`;

  res.redirect(googleAuthUrl);
});

// ── GET /api/auth/google/callback ────────────────────────────────────────────
// Google redirects here after the user consents
router.get('/google/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (oauthError || !code) {
    console.error('[auth/google/callback] OAuth error:', oauthError);
    return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }

  try {
    const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:5001';
    const redirectUri = `${backendUrl}/api/auth/google/callback`;

    // 1. Exchange auth code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[auth/google/callback] Token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // 2. Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    const emailLower = profile.email.toLowerCase().trim();

    // 3. Find or create user
    let user = await User.findOne({ email: emailLower });

    if (!user) {
      // New user via Google
      user = new User({
        email:       emailLower,
        googleId:    profile.id,
        displayName: profile.name  || emailLower,
        avatar:      profile.picture || null,
        passwordHash: null,
      });
      await user.save();
      console.log(`[auth/google] New Google user created: ${emailLower}`);
    } else if (!user.googleId) {
      // Existing email/password user — link Google account
      user.googleId    = profile.id;
      user.displayName = user.displayName || profile.name;
      user.avatar      = user.avatar      || profile.picture;
      await user.save();
      console.log(`[auth/google] Linked Google to existing user: ${emailLower}`);
    }

    // 4. Issue InvestIQ JWT and redirect to frontend
    const jwtToken = generateToken(user);
    return res.redirect(
      `${frontendUrl}/oauth/callback?token=${encodeURIComponent(jwtToken)}&email=${encodeURIComponent(emailLower)}`
    );
  } catch (err) {
    console.error('[auth/google/callback] Unexpected error:', err);
    return res.redirect(`${frontendUrl}/login?error=server_error`);
  }
});

export default router;
