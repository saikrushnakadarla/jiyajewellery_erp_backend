const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../db');
require('dotenv').config();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const queryAsync = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
  });

// Save a subscription with ON DUPLICATE KEY UPDATE
router.post('/subscribe', async (req, res) => {
  try {
    const { user_id, user_type, subscription } = req.body;
    const { endpoint, keys } = subscription;

    console.log(`📝 Saving subscription for ${user_type} ${user_id}`);
    console.log(`📝 Endpoint: ${endpoint.substring(0, 50)}...`);

    // UPSERT - Insert or Update with ON DUPLICATE KEY
    await queryAsync(
      `INSERT INTO push_subscriptions (user_id, user_type, endpoint, p256dh, auth, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
         user_id = VALUES(user_id), 
         user_type = VALUES(user_type),
         p256dh = VALUES(p256dh), 
         auth = VALUES(auth),
         updated_at = NOW()`,
      [user_id, user_type, endpoint, keys.p256dh, keys.auth]
    );

    // Verify subscription was saved
    const verify = await queryAsync(
      'SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ? AND user_type = ?',
      [user_id, user_type]
    );
    console.log(`📊 Total subscriptions for ${user_type} ${user_id}: ${verify[0].count}`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to save subscription' });
  }
});

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;