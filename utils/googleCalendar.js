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

/**
 * Convert a date string to IST (Asia/Kolkata) timezone
 * Handles both ISO strings with Z (UTC) and date-only strings
 */
function convertToIST(dateString) {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  // Get the time in IST
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate;
}

/**
 * Creates a calendar event for stock assignment
 * Uses the transfer_date from assignment for the event time
 */
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

  console.log(`📅 Original transfer_date: ${transfer_date}`);

  // --- FIX: Properly handle the transfer_date ---
  let startDateTime;
  
  if (transfer_date) {
    // Create date from the transfer_date string
    const dateObj = new Date(transfer_date);
    
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ Invalid transfer_date, using current time + 1 hour');
      startDateTime = new Date();
      startDateTime.setHours(startDateTime.getHours() + 1);
    } else {
      // If the date has a Z (UTC) or includes time, keep it as is
      // Google Calendar will handle the timezone conversion based on the timeZone parameter
      if (transfer_date.includes('Z') || transfer_date.includes('T')) {
        // It's an ISO string with time, use as is (UTC)
        startDateTime = new Date(transfer_date);
        console.log(`📅 Using UTC time: ${startDateTime.toISOString()}`);
      } else {
        // It's a date string without time, set to 9:00 AM local time
        startDateTime = new Date(transfer_date);
        startDateTime.setHours(9, 0, 0, 0);
        console.log(`📅 Using date-only, set to 9:00 AM: ${startDateTime.toISOString()}`);
      }
    }
  } else {
    // Fallback to current time + 1 hour
    startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
    console.log(`📅 No date provided, using fallback: ${startDateTime.toISOString()}`);
  }
  
  // Ensure we have a valid date
  if (isNaN(startDateTime.getTime())) {
    console.warn('⚠️ Invalid date object, using current time + 1 hour');
    startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
  }

  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);

  // Log the times for debugging
  console.log(`📅 Event start (UTC): ${startDateTime.toISOString()}`);
  console.log(`📅 Event end (UTC): ${endDateTime.toISOString()}`);
  console.log(`📅 Event start (IST): ${startDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`📅 Event end (IST): ${endDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

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
    console.log(`📅 Event time in IST: ${startDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} to ${endDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create calendar event:', error.message);
    if (error.response) {
      console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Alternative: Create event WITHOUT attendees (just a note on your calendar)
 */
async function createCalendarNote(assignment, fromStockPoint) {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn('⚠️ Google Calendar not configured – skipping.');
    return;
  }

  const { assigned_number, transfer_date, total_items, remarks, salesmanName } = assignment;

  const summary = `📦 Stock Assignment #${assigned_number} - ${salesmanName || 'Salesman'}`;
  const description = `
Items assigned: ${total_items} product(s)
From: ${fromStockPoint || 'Stock Room'}
Remarks: ${remarks || 'N/A'}

This is a note about the assignment. The salesman will be notified via the app.
  `.trim();

  let startDateTime;
  if (transfer_date) {
    startDateTime = new Date(transfer_date);
    if (!transfer_date.includes('T') && !transfer_date.includes('Z')) {
      startDateTime.setHours(9, 0, 0, 0);
    }
  } else {
    startDateTime = new Date();
    startDateTime.setHours(startDateTime.getHours() + 1);
  }

  if (isNaN(startDateTime.getTime())) {
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
    reminders: {
      useDefault: true,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    console.log(`✅ Calendar note created: ${response.data.htmlLink}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create calendar note:', error.message);
    return null;
  }
}

module.exports = { createCalendarEvent, createCalendarNote };