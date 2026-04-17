const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Import and use routes
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const userRoutes = require('./routes/users');
const emailRoutes = require('./routes/email');
const logRoutes = require('./routes/logs');
const adminRoutes = require('./routes/admins');
const webhookRoutes = require('./routes/webhooks');

app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admins', adminRoutes);
// Webhook routes are unauthenticated (secured via x-webhook-secret header)
app.use('/api/webhooks', webhookRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
