const webpush = require('web-push');
require('dotenv').config();

// Log VAPID configuration on startup
console.log('🔑 ====== VAPID CONFIGURATION ======');
console.log('🔑 VAPID Subject:', process.env.VAPID_SUBJECT || 'NOT SET');
console.log('🔑 VAPID Public Key exists:', !!process.env.VAPID_PUBLIC_KEY);
console.log('🔑 VAPID Private Key exists:', !!process.env.VAPID_PRIVATE_KEY);
if (process.env.VAPID_PUBLIC_KEY) {
  console.log(`🔑 Public Key (first 20 chars): ${process.env.VAPID_PUBLIC_KEY.substring(0, 20)}...`);
}
console.log('🔑 =================================');

// Set VAPID details from environment variables
try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:tharunkumarreddy1212@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ VAPID details configured successfully');
} catch (error) {
  console.error('❌ Failed to set VAPID details:', error);
}

async function sendPushToUser(queryAsync, userId, userType, title, body, url = '/') {
  try {
    console.log(`📤 ====== SENDING PUSH ======`);
    console.log(`📤 To: ${userType} ${userId}`);
    console.log(`📤 Title: ${title}`);
    console.log(`📤 Body: ${body ? body.substring(0, 50) + (body.length > 50 ? '...' : '') : '(empty)'}`);
    console.log(`📤 URL: ${url}`);
    console.log(`📤 Timestamp: ${new Date().toISOString()}`);

    // Get all push subscriptions for this user
    const subs = await queryAsync(
      'SELECT * FROM push_subscriptions WHERE user_id = ? AND user_type = ?',
      [userId.toString(), userType]
    );

    console.log(`📊 Found ${subs ? subs.length : 0} subscription(s)`);

    if (!subs || subs.length === 0) {
      console.log(`📭 No push subscriptions found for ${userType} ${userId}`);
      return { sent: 0, total: 0, message: 'No subscriptions found' };
    }

    // Log subscription details
    subs.forEach((sub, index) => {
      console.log(`   [${index + 1}] Endpoint: ${sub.endpoint.substring(0, 50)}...`);
      console.log(`       p256dh: ${sub.p256dh ? sub.p256dh.substring(0, 20) + '...' : 'missing'}`);
      console.log(`       auth: ${sub.auth ? sub.auth.substring(0, 20) + '...' : 'missing'}`);
    });

    const payload = JSON.stringify({ 
      title: title || 'Jiyaa Jewels', 
      body: body || 'You have a new notification',
      url: url || '/',
      timestamp: Date.now()
    });

    console.log(`📤 Payload size: ${payload.length} bytes`);

    let sentCount = 0;
    let failCount = 0;

    for (const sub of subs) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { 
            p256dh: sub.p256dh, 
            auth: sub.auth 
          }
        };
        
        // Validate subscription has required keys
        if (!subscription.keys.p256dh || !subscription.keys.auth) {
          console.warn(`⚠️ Subscription missing keys, skipping: ${sub.id}`);
          failCount++;
          continue;
        }

        console.log(`📤 Sending push to endpoint: ${sub.endpoint.substring(0, 60)}...`);
        
        const startTime = Date.now();
        const response = await webpush.sendNotification(subscription, payload);
        const endTime = Date.now();
        
        console.log(`✅ Push sent successfully (${endTime - startTime}ms)`);
        console.log(`   Status: ${response.statusCode || 'OK'}`);
        sentCount++;
        
      } catch (err) {
        console.error(`❌ Push send error for subscription ${sub.id}:`);
        console.error(`   Status: ${err.statusCode || 'unknown'}`);
        console.error(`   Message: ${err.message}`);
        
        // Handle expired or invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🗑️ Removing expired subscription (ID: ${sub.id})`);
          try {
            await queryAsync('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
            console.log(`✅ Deleted expired subscription ${sub.id}`);
          } catch (deleteError) {
            console.error(`❌ Failed to delete subscription: ${deleteError.message}`);
          }
        } else if (err.statusCode === 401 || err.statusCode === 403) {
          console.log(`⚠️ VAPID authentication error - subscription may need to be recreated`);
          console.log(`   Check that VAPID keys match between server and client`);
        } else {
          console.error('❌ Full error object:', err);
        }
        failCount++;
      }
    }

    console.log(`📊 Push results: ${sentCount} sent, ${failCount} failed`);
    console.log(`📤 ====== PUSH COMPLETE ======`);

    return { sent: sentCount, failed: failCount, total: subs.length };
    
  } catch (error) {
    console.error('❌ sendPushToUser error:', error.message);
    console.error('   Stack:', error.stack);
    return { sent: 0, total: 0, error: error.message };
  }
}

module.exports = { sendPushToUser };