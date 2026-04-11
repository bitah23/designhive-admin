const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

// Secure login using database and hashing
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fallback to environment variables if database is not configured
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ id: 'admin-fallback', email: email }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '1d' });
      return res.json({ token });
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
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

// Admin Password Update Route
router.put('/password', authenticateAdmin, async (req, res) => {
  const { current, new: newPass } = req.body;
  const adminEmail = req.admin.email;

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (error || !admin) return res.status(404).json({ error: 'Admin not found' });

    const isMatch = await bcrypt.compare(current, admin.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPass, salt);

    const { error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: hashedPassword })
      .eq('id', admin.id);

    if (updateError) throw updateError;

    res.json({ message: 'Authority key updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

module.exports = router;
