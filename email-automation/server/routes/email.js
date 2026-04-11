const express = require('express');
const router = express.Router();
const { sendBulkEmails } = require('../services/emailService');
const { authenticateAdmin } = require('../middleware/auth');
const supabase = require('../config/supabase');

router.use(authenticateAdmin);

router.post('/send', async (req, res) => {
  const { templateId, userIds } = req.body;

  try {
    // 1. Fetch template
    const { data: template, error: tError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (tError) throw new Error(`Template not found: ${tError.message}`);

    // 2. Fetch users
    const { data: users, error: uError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (uError) throw new Error(`Error fetching users: ${uError.message}`);

    // 3. Send emails
    // Note: This matches the bulk sending requirement. 
    // In a production app, we would use a proper background worker.
    const results = await sendBulkEmails(template, users);

    res.json({
      message: 'Processing complete',
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
