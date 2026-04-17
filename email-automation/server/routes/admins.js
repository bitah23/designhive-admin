const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateAdmin);

// GET /api/admins — list all admins
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, name, is_active, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('List admins error:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin list' });
  }
});

// POST /api/admins — add a new admin
router.post('/', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An admin with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: admin, error: insertError } = await supabase
      .from('admins')
      .insert([{ email: normalizedEmail, password_hash, name: name?.trim() || null, is_active: true }])
      .select('id, email, name, is_active, created_at')
      .single();

    if (insertError) throw insertError;

    return res.status(201).json(admin);
  } catch (err) {
    console.error('Add admin error:', err);
    return res.status(500).json({ error: 'Failed to create admin account' });
  }
});

// PATCH /api/admins/:id/toggle — toggle active status
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const requestingAdminId = req.admin.id;

  if (id === requestingAdminId) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  try {
    const { data: target, error: fetchError } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !target) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const newStatus = target.is_active === false ? true : false;

    const { data: updated, error: updateError } = await supabase
      .from('admins')
      .update({ is_active: newStatus })
      .eq('id', id)
      .select('id, email, name, is_active, created_at')
      .single();

    if (updateError) throw updateError;

    return res.json(updated);
  } catch (err) {
    console.error('Toggle admin error:', err);
    return res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// DELETE /api/admins/:id — permanently delete an admin
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const requestingAdminId = req.admin.id;

  if (id === requestingAdminId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({ message: 'Admin account deleted successfully' });
  } catch (err) {
    console.error('Delete admin error:', err);
    return res.status(500).json({ error: 'Failed to delete admin account' });
  }
});

module.exports = router;
