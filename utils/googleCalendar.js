const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.warn('⚠️ Google Calendar credentials not configured.');
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
if (REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

async function createCalendarEvent(assignment, salesmanEmail, fromStockPoint) {
  if (!salesmanEmail) {
    console.warn('⚠️ Salesman email missing – skipping calendar invite.');
    return;
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn('⚠️ Google Calendar not configured – skipping.');
    return;
  }

  const { assigned_number, transfer_date, total_items, remarks } = assignment;

  const summary = `📦 Stock Assignment #${assigned_number}`;
  const description = `
Items assigned: ${total_items} product(s)
From: ${fromStockPoint || 'Stock Room'}
Remarks: ${remarks || 'N/A'}

Please review and accept this assignment in the Jiya ERP application.
  `.trim();

  let startDateTime;
  if (transfer_date) {
    startDateTime = new Date(transfer_date);
    startDateTime.setHours(9, 0, 0);
  } else {
    startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
  }
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);

  const event = {
    summary,
    description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    attendees: [{ email: salesmanEmail }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all',
    });
    console.log(`✅ Calendar event created: ${response.data.htmlLink}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create calendar event:', error.message);
    return null;
  }
}

module.exports = { createCalendarEvent };