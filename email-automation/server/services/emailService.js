const { google } = require('googleapis');
const pLimit = require('p-limit');
const supabase = require('../config/supabase');

// Gmail API OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const limit = pLimit(5); // Process 5 emails at a time

/**
 * Build an RFC 2822 compliant email message and encode it as base64url
 */
const buildRawEmail = (to, from, subject, htmlBody) => {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ];
  const message = messageParts.join('\r\n');

  // Base64url encode the message
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
};

const replaceVariables = (text, user) => {
  return text
    .replace(/{{name}}/g, user.name || '')
    .replace(/{{email}}/g, user.email || '')
    .replace(/{{date}}/g, new Date().toLocaleDateString());
};

const sendBulkEmails = async (template, users) => {
  const senderEmail = process.env.GMAIL_SENDER_EMAIL || 'info@designhiveai.com.au';
  const senderName = process.env.GMAIL_SENDER_NAME || 'DesignHive';

  const tasks = users.map((user) => {
    return limit(async () => {
      const htmlBody = replaceVariables(template.body, user);
      const subject = replaceVariables(template.subject, user);

      try {
        const raw = buildRawEmail(
          user.email,
          `"${senderName}" <${senderEmail}>`,
          subject,
          htmlBody
        );

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: raw,
          },
        });

        // Log success
        await supabase.from('email_logs').insert({
          user_email: user.email,
          template_id: template.id,
          status: 'sent',
          timestamp: new Date(),
        });

        return { email: user.email, status: 'sent' };
      } catch (error) {
        console.error(`Failed to send to ${user.email}:`, error.message);

        // Log failure
        await supabase.from('email_logs').insert({
          user_email: user.email,
          template_id: template.id,
          status: 'failed',
          timestamp: new Date(),
          error_message: error.message,
        });

        return { email: user.email, status: 'failed', error: error.message };
      }
    });
  });

  return Promise.all(tasks);
};

const sendAdminPasswordReset = async (email, otp) => {
  const senderEmail = process.env.GMAIL_SENDER_EMAIL || 'info@designhiveai.com.au';
  const senderName = process.env.GMAIL_SENDER_NAME || 'DesignHive Administration';
  const subject = 'Your Password Reset OTP';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
      <h2 style="color: #FACC15;">DesignHive Admin Security</h2>
      <p>A password reset was requested for your administrative account.</p>
      <p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p>
      <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  try {
    const raw = buildRawEmail(
      email,
      `"${senderName}" <${senderEmail}>`,
      subject,
      htmlBody
    );

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    return true;
  } catch (error) {
    console.error('Failed to send admin reset email:', error);
    throw error;
  }
};

/**
 * Send a direct email to one recipient, with optional base64-encoded attachments.
 * attachments: [{ name, mimeType, data }]  (data = base64 string, no data-URI prefix)
 */
const sendDirectEmail = async (to, subject, htmlBody, attachments = []) => {
  const senderEmail = process.env.GMAIL_SENDER_EMAIL || 'info@designhiveai.com.au';
  const senderName  = process.env.GMAIL_SENDER_NAME  || 'DesignHive';
  const from        = `"${senderName}" <${senderEmail}>`;
  const boundary    = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
  ];

  for (const file of attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${file.mimeType || 'application/octet-stream'}; name="${file.name}"`,
      `Content-Disposition: attachment; filename="${file.name}"`,
      'Content-Transfer-Encoding: base64',
      '',
      file.data, // already base64
    );
  }

  lines.push(`--${boundary}--`);

  const raw = Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
};

module.exports = {
  sendBulkEmails,
  replaceVariables,
  sendAdminPasswordReset,
  sendDirectEmail,
  gmail,
};
