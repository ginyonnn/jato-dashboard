// File: pages/api/video_feed.js
// Deskripsi: API Route ini bertindak sebagai proxy untuk video stream dari ngrok.
// Kita butuh 'axios' karena lebih baik dalam menangani stream biner

import axios from 'axios';

export default async function handler(req, res) {
  // === PERUBAHAN UTAMA: Baca URL dari Environment Variable ===
  const ngrokHlsUrl = process.env.NEXT_PUBLIC_NGROK_STREAM_URL;

  // Cek apakah variabelnya ada, sebagai pengaman
  if (!ngrokHlsUrl) {
    console.error("CRITICAL: NEXT_PUBLIC_NGROK_STREAM_URL environment variable is not set!");
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const response = await axios({
      method: 'get',
      url: ngrokHlsUrl,
      responseType: 'stream',
      headers: {
        'ngrok-skip-browser-warning': 'true' 
      }
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    response.data.pipe(res);

  } catch (error) {
    console.error("Error proxying HLS stream:", error.message);
    res.status(500).json({ error: 'Failed to proxy HLS stream.' });
  }
}