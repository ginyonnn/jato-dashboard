// ==============================================================================
// File:        pages/index.js
// Deskripsi:   Halaman utama untuk JATO Framework Dashboard.
//              Menampilkan data real-time dari Firebase dan streaming
//              video langsung dari Kamera IP.
// Versi:       2.0 (Final - Perbaikan Bug & Penambahan Fitur)
// ==============================================================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';

// --- BAGIAN 1: KONFIGURASI FIREBASE ---
// Next.js akan secara otomatis memuat variabel dari file .env.local di sini.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- BAGIAN 2: KOMPONEN UTAMA DASBOR ---
export default function Dashboard() {
  // State untuk menyimpan data real-time dari Firebase
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  // useEffect "hook" untuk berlangganan data Firebase saat komponen pertama kali dimuat
  useEffect(() => {
    // Referensi ke 'node' data di Firebase yang ingin kita 'dengarkan'
    const statusRef = ref(database, 'status');
    const logsQuery = query(ref(database, 'logs'), orderByChild('timestamp'), limitToLast(10));

    // Membuat 'listener' untuk data status. 'onValue' akan terpicu
    // setiap kali data di 'statusRef' berubah.
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      setStatus(data);
    });

    // Membuat 'listener' untuk 10 log peristiwa terakhir
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Mengubah objek dari Firebase menjadi array, lalu membaliknya
        // agar data terbaru selalu berada di paling atas.
        const formattedLogs = Object.values(data).reverse();
        setLogs(formattedLogs);
      }
    });

    // Fungsi 'cleanup'. Ini akan dijalankan saat komponen ditutup
    // untuk menghentikan 'listener', mencegah kebocoran memori.
    return () => {
      unsubscribeStatus();
      unsubscribeLogs();
    };
  }, []); // Array kosong `[]` berarti `useEffect` hanya berjalan sekali saat komponen dimuat.

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 font-sans">
      <Head>
        <title>JATO Framework Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">JATO Framework Dashboard</h1>
        <div className="flex items-center space-x-2 text-green-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span>Live</span>
        </div>
      </header>

      {/* Grid untuk Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard title="JATO's Last Decision" value={status?.jato_decision || 'Waiting for data...'} />
        <StatusCard title="End-to-End Latency" value={status?.end_to_end_latency_ms !== 'N/A' && status?.end_to_end_latency_ms ? `${parseFloat(status.end_to_end_latency_ms).toFixed(2)} ms` : 'N/A'} />
        <StatusCard title="Source Server" value={status?.source_server || 'N/A'} />
        <MultiDetectionCard title="Last Detection(s) [Conf ≥ 0.5]" detections={status?.detections} />
      </div>

      {/* Bagian Baru untuk Live Stream dan Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Live Stream */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Camera Feed</h2>
          <div className="bg-black rounded-lg overflow-hidden border-2 border-gray-700">
            {/* !!! PENTING: Ganti URL ini dengan URL STREAMING MJPEG kamera Anda !!! */}
            {/* Ini BUKAN URL RTSP. Cari "MJPEG stream URL" untuk model kamera Anda. */}
            <img 
              src="http://172.20.10.4:8080/stream/image.jpg"
              alt="Live camera stream. If this is not showing, please ensure you are on the same local network as the camera and the MJPEG stream URL is correct." 
              className="w-full h-auto"
              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
            />
            <div style={{display: 'none'}} className="p-8 text-center text-gray-400">
                <p>Could not load live stream.</p>
                <p className="text-xs">Please check the MJPEG URL in the code and your network connection.</p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Event Log */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Event Log (Last 10 Events)</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-400 font-bold border-b border-gray-600 pb-2">
              <p>Time & Decision</p><p>Latency</p><p>Detection(s)</p>
            </div>
            {logs.length > 0 ? logs.map((log, index) => <LogItem key={index} log={log} />) : <p className="text-gray-500 pt-4">Waiting for events...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- BAGIAN 3: KOMPONEN PEMBANTU (Untuk Kebersihan Kode) ---

// Komponen Kartu Status Sederhana
function StatusCard({ title, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 flex flex-col justify-between">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// Komponen Kartu Deteksi (untuk menampilkan multiple detections)
function MultiDetectionCard({ title, detections }) {
  const filtered = detections?.filter(d => parseFloat(d.confidence) >= 0.5) || [];
  const hasFall = filtered.some(d => d.label.toLowerCase().includes('fall'));

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      {filtered.length > 0 ? (
        <div className="space-y-1">
          {filtered.map((d, i) => (
            <p key={i} className={`text-xl font-bold ${d.label.toLowerCase().includes('fall') ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
              {d.label} ({d.confidence})
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xl font-bold text-gray-500">None</p>
      )}
    </div>
  );
}

// Komponen untuk setiap item di dalam Log
function LogItem({ log }) {
  const filtered = log.detections?.filter(d => parseFloat(d.confidence) >= 0.5) || [];
  const hasFall = filtered.some(d => d.label.toLowerCase().includes('fall'));

  return (
    <div className="grid grid-cols-3 gap-4 items-center p-2 rounded-md text-sm hover:bg-gray-700">
      <div>
        <p className="font-semibold">{log.jato_decision}</p>
        <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
      </div>
      <p>{log.end_to_end_latency_ms !== 'N/A' ? `${parseFloat(log.end_to_end_latency_ms).toFixed(0)} ms` : 'N/A'}</p>
      <div className={hasFall ? 'text-red-400 font-semibold' : 'text-gray-300'}>
        {filtered.length > 0 ? filtered.map(d => `${d.label} (${d.confidence})`).join(', ') : 'None'}
      </div>
    </div>
  );
}