// zoomService.js
const axios = require('axios');

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// جلب access token من Zoom (Server-to-Server OAuth)
async function getZoomAccessToken() {
  const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    'https://zoom.us/oauth/token',
    null,
    {
      params: {
        grant_type: 'account_credentials',
        account_id: ZOOM_ACCOUNT_ID,
      },
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return response.data.access_token;
}



async function deleteZoomMeeting(meetingId) {
  const accessToken = await getZoomAccessToken();

  await axios.delete(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}
// إنشاء اجتماع زوم
async function createZoomMeeting({ topic, startTime, duration }) {
  const accessToken = await getZoomAccessToken();

  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2, // اجتماع مجدول بوقت محدد
      start_time: new Date(startTime).toISOString(),
      duration, // بالدقائق
      timezone: 'Asia/Hebron',
      settings: {
        join_before_host: true,
        waiting_room: false,
        approval_type: 2, // بدون تسجيل مسبق
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data; // فيه join_url, start_url, id, ...
}

module.exports = { createZoomMeeting ,deleteZoomMeeting };