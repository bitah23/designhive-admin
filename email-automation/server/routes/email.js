const express = require('express');
const router = express.Router();
const { sendBulkEmails, sendDirectEmail } = require('../services/emailService');
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

// POST /api/email/send-direct — send a one-off email to a single user
// Body: { to, subject, body, attachments?: [{ name, mimeType, data }] }
router.post('/send-direct', async (req, res) => {
  const { to, subject, body, attachments = [] } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  try {
    await sendDirectEmail(to, subject, body, attachments);
    return res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Direct email error:', err);
    return res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

module.exports = router;
