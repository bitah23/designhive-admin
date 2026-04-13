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
      .insert([{ email, password_hash, name: name || null }])
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

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Authentication engine error' });
  }
});

const { sendAdminPasswordReset } = require('../services/emailService');

const globalOtps = new Map(); // Store OTPs in memory for now. Key: email, Value: { otp, expires }

// Request OTP for password reset
router.post('/reset-request', authenticateAdmin, async (req, res) => {
  const adminEmail = req.admin.email;
  
  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (error || !admin) return res.status(404).json({ error: 'Admin not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    globalOtps.set(adminEmail, { otp, expires });

    await sendAdminPasswordReset(adminEmail, otp);

    res.json({ message: 'Reset code sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// Confirm OTP and update password
router.post('/reset-password', authenticateAdmin, async (req, res) => {
  const { otp, newPassword } = req.body;
  const adminEmail = req.admin.email;

  try {
    const record = globalOtps.get(adminEmail);
    if (!record || record.otp !== otp || Date.now() > record.expires) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: hashedPassword })
      .eq('email', adminEmail);

    if (updateError) throw updateError;

    // Clear OTP after successful reset
    globalOtps.delete(adminEmail);

    res.json({ message: 'Password reset successfully. Db updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update credentials in db' });
  }
});

module.exports = router;
