const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function listAliases() {
  try {
    const res = await gmail.users.settings.sendAs.list({
      userId: 'me',
    });
    console.log('--- Authorized "Send Mail As" Aliases ---');
    if (res.data.sendAs) {
      res.data.sendAs.forEach((alias) => {
        console.log(`- ${alias.displayName} <${alias.sendAsEmail}> (Default: ${alias.isDefault})`);
      });
    } else {
      console.log('No custom aliases found.');
    }
    console.log('-----------------------------------------');
  } catch (error) {
    console.error('Error listing aliases:', error.message);
  }
}

listAliases();
