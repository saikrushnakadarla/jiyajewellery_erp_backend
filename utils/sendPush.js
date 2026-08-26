const webpush = require('web-push');
require('dotenv').config();

console.log('🔑 VAPID Public Key exists:', !!process.env.VAPID_PUBLIC_KEY);
console.log('🔑 VAPID Private Key exists:', !!process.env.VAPID_PRIVATE_KEY);
console.log('🔑 VAPID Subject:', process.env.VAPID_SUBJECT);

// Set VAPID details from environment variables
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushToUser(queryAsync, userId, userType, title, body, url = '/') {
  try {
    console.log(`📤 Attempting to send push to ${userType} ${userId}`);

    // Get all push subscriptions for this user
    const subs = await queryAsync(
      'SELECT * FROM push_subscriptions WHERE user_id = ? AND user_type = ?',
      [userId.toString(), userType]
    );

    console.log(`📊 Found ${subs ? subs.length : 0} subscriptions for ${userType} ${userId}`);

    if (!subs || subs.length === 0) {
      console.log(`📭 No push subscriptions found for ${userType} ${userId}`);
      return;
    }

    const payload = JSON.stringify({ title, body, url });

    for (const sub of subs) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { 
            p256dh: sub.p256dh, 
            auth: sub.auth 
          }
        };
        
        console.log(`📤 Sending push to ${sub.endpoint.substring(0, 50)}...`);
        await webpush.sendNotification(subscription, payload);
        console.log(`✅ Push sent successfully`);
      } catch (err) {
        console.error(`❌ Push send error:`, err.message);
        // Handle expired or invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🗑️ Removing expired subscription`);
          await queryAsync('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        } else if (err.statusCode === 401 || err.statusCode === 403) {
          console.log(`⚠️ VAPID key error - subscription may need to be recreated`);
          // Don't delete, just log - user needs to re-subscribe
        } else {
          console.error('❌ Full error:', err);
        }
      }
    }
  } catch (error) {
    console.error('❌ sendPushToUser error:', error.message);
  }
}

module.exports = { sendPushToUser };