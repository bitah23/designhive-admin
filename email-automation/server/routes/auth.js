const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

// One-time setup: create the first admin account (disabled once any admin exists)
router.post('/setup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: existing, error: countError } = await supabase
      .from('admins')
      .select('id')
      .limit(1);

    if (countError) throw countError;

    if (existing && existing.length > 0) {
      return res.status(403).json({ error: 'Setup already completed. Use the login endpoint.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data: admin, error: insertError } = await supabase
      .from('admins')
      .insert([{ email: email.trim().toLowerCase(), password_hash, name: name || null, is_active: true }])
      .select()
      .single();

    if (insertError) throw insertError;

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ message: 'Admin account created successfully', token });
  } catch (err) {
    return res.status(500).json({ error: 'Setup failed: ' + err.message });
  }
});

// Login using database credentials only
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Fetch admin by email — treat is_active NULL as active (backwards-compatible)
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .neq('is_active', false)
      .maybeSingle();

    if (error) {
      console.error('Login DB error:', error);
      return res.status(500).json({ error: 'Authentication engine error' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication engine error' });
  }
});

const { sendAdminPasswordReset } = require('../services/emailService');

// Request OTP for password reset
// OTP is persisted in the DB (otp_code + otp_expires columns) so server restarts don't wipe it.
router.post('/reset-request', authenticateAdmin, async (req, res) => {
  const adminEmail = req.admin.email;
  const adminId = req.admin.id;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min from now

    // Persist OTP in DB so it survives server restarts
    const { error: updateError } = await supabase
      .from('admins')
      .update({ otp_code: otp, otp_expires: otpExpires })
      .eq('id', adminId);

    if (updateError) {
      console.error('Failed to save OTP to DB:', updateError);
      return res.status(500).json({ error: 'Failed to initiate password reset' });
    }

    await sendAdminPasswordReset(adminEmail, otp);

    return res.json({ message: 'Reset code sent to your email.' });
  } catch (err) {
    console.error('Reset request error:', err);
    return res.status(500).json({ error: 'Failed to send reset email: ' + err.message });
  }
});

// Confirm OTP and update password
router.post('/reset-password', authenticateAdmin, async (req, res) => {
  const { otp, newPassword } = req.body;
  const adminId = req.admin.id;

  if (!otp || !newPassword) {
    return res.status(400).json({ error: 'OTP and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const { data: admin, error: fetchError } = await supabase
      .from('admins')
      .select('otp_code, otp_expires')
      .eq('id', adminId)
      .single();

    if (fetchError || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (!admin.otp_code || admin.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if (!admin.otp_expires || new Date() > new Date(admin.otp_expires)) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: hashedPassword, otp_code: null, otp_expires: null })
      .eq('id', adminId);

    if (updateError) throw updateError;

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
