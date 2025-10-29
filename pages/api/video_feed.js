// File: pages/api/video_feed.js
// Deskripsi: API Route ini bertindak sebagai proxy pintar untuk
// mengambil stream dari ngrok dan meneruskannya ke frontend.

import axios from 'axios';

// Pastikan URL di sini sudah benar, tetapi sebaiknya kita gunakan Environment Variable
// Ini BUKAN URL MJPEG/HLS, ini adalah URL dasar dari NGINX di port 8088
const NGROK_TARGET_URL = "https://jensen-zoonal-terresa.ngrok-free.dev/live/playlist.m3u8";

export default async function handler(req, res) {
  console.log("Proxy API hit! Fetching stream from ngrok...");

  try {
    const response = await axios({
      method: 'get',
      url: NGROK_TARGET_URL,
      responseType: 'stream',
      headers: {
        // INILAH KUNCINYA: Menambahkan header untuk melewati peringatan ngrok
        'ngrok-skip-browser-warning': 'true'
      }
    });

    // Memberi tahu browser bahwa kita mengirim stream video
    res.setHeader('Content-Type', response.headers['content-type']);
    
    // "Menyalurkan" data stream dari ngrok langsung ke respons browser
    response.data.pipe(res);

  } catch (error) {
    console.error("[JATO DASHBOARD API ERROR] Failed to proxy stream:", error.message);
    res.status(500).json({ 
      error: 'Failed to connect to the backend stream.', 
      details: 'Please ensure the ngrok and ffmpeg/nginx services are running correctly.'
    });
  }
}