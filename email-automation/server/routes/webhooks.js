const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { sendBulkEmails } = require('../services/emailService');

// POST /api/webhooks/welcome
// Called by Supabase Database Webhook on every INSERT into profiles.
// Secured with a shared secret in the x-webhook-secret header.
router.post('/welcome', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Supabase Database Webhooks send: { type, table, schema, record, old_record }
  const record = req.body?.record;
  if (!record?.email) {
    return res.status(400).json({ error: 'No user record in payload' });
  }

  try {
    // Always fetch the Welcome template fresh so template changes are picked up immediately
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .ilike('title', '%welcome%')
      .limit(1)
      .single();

    if (error || !template) {
      console.warn('Welcome webhook: no "Welcome" template found, skipping.');
      return res.status(200).json({ message: 'No welcome template configured, skipped.' });
    }

    console.log(`Welcome webhook: sending to ${record.email}`);
    await sendBulkEmails(template, [record]);

    return res.status(200).json({ message: 'Welcome email sent.' });
  } catch (err) {
    console.error('Welcome webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
