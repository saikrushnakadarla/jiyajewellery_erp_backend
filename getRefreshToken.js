// getRefreshToken.js - Run this ONCE to get refresh token
const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Your credentials from Google Cloud Console
const credentials = {
  web: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: [process.env.GOOGLE_REDIRECT_URI],
  }
};

const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔑 Authorize this app by visiting this URL:');
console.log(authUrl);
console.log('\n👉 After granting access, you will get a code. Paste it below:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('❌ Error retrieving access token:', err);
      return;
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('✅ Token stored to', TOKEN_PATH);
    console.log('📋 Copy this refresh token to your .env file:');
    console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`);
  });
});