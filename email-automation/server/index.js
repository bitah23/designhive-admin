const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Placeholder routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import and use routes
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const userRoutes = require('./routes/users');
const emailRoutes = require('./routes/email');
const logRoutes = require('./routes/logs');

app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/logs', logRoutes);

// Setup Realtime Listener for new signups
const supabase = require('./config/supabase');
const { sendBulkEmails } = require('./services/emailService');

const startRealtimeListener = async () => {
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .ilike('title', '%Welcome%')
    .limit(1)
    .single();

  if (template) {
    supabase
      .channel('profile-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, async (payload) => {
        const newUser = payload.new;
        if (newUser && newUser.email) {
          console.log(`Automatic Trigger: Sending welcome email to new user: ${newUser.email}`);
          await sendBulkEmails(template, [newUser]);
        }
      })
      .subscribe();
    console.log('Automated Welcome Email Listener: ACTIVE (Watching for new signups)');
  } else {
    console.log('Automated Welcome Email Listener: INACTIVE (No template with "Welcome" in title found)');
  }
};

startRealtimeListener();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
