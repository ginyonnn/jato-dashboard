// ==============================================================================
// File:        pages/index.js
// Deskripsi:   Dasbor JATO dengan Live Stream HLS melalui React Player.
// Versi:       2.1 (Final - Perbaikan Struktur Komponen)
// ==============================================================================

// --- BAGIAN 1: Impor Library ---
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

// --- BAGIAN 2: Konfigurasi Firebase ---
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

// --- BAGIAN 3: DEFINISI KOMPONEN PEMBANTU (Helper Components) ---
// Komponen-komponen ini harus didefinisikan di luar komponen utama.

function StatusCard({ title, value }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 flex flex-col justify-between">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MultiDetectionCard({ title, detections }) {
  const filtered = detections?.filter(d => parseFloat(d.confidence) >= 0.5) || [];
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
      ) : <p className="text-xl font-bold text-gray-500">None</p>}
    </div>
  );
}

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


// --- BAGIAN 4: KOMPONEN UTAMA DASBOR (Komponen Default Export) ---
export default function Dashboard() {
  // (useState untuk status dan logs tetap sama)
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // State untuk melacak apakah kita berada di sisi klien (wajib untuk video)
  const [isClient, setIsClient] = useState(false);

  // State untuk mencegah hydration error pada React Player
  const [hasWindow, setHasWindow] = useState(false);

  useEffect(() => {
    // Tandai bahwa kita sekarang berada di sisi klien setelah render pertama
     setIsClient(true);
    // Jalankan listener Firebase
    const statusRef = ref(database, 'status');
    const logsQuery = query(ref(database, 'logs'), orderByChild('timestamp'), limitToLast(10));
    const unsubscribeStatus = onValue(statusRef, (snapshot) => setStatus(snapshot.val()));
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
      if (snapshot.val()) {
        setLogs(Object.values(snapshot.val()).reverse());
      }
    });

    // Cek jika window sudah tersedia (untuk SSR)
    if (typeof window !== "undefined") {
        setHasWindow(true);
    }
    
    return () => {
      unsubscribeStatus();
      unsubscribeLogs();
    };
  }, []);

  // URL Stream (tempatkan di satu tempat agar mudah diubah)
  const streamUrl = "https://jensen-zoonal-terresa.ngrok-free.dev/live/playlist.m3u8";

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
        <StatusCard title="JATO's Last Decision" value={status?.jato_decision || 'N/A'} />
        <StatusCard title="End-to-End Latency" value={status?.end_to_end_latency_ms ? `${parseFloat(status.end_to_end_latency_ms).toFixed(2)} ms` : 'N/A'} />
        <StatusCard title="Source Server" value={status?.source_server || 'N/A'} />
        <MultiDetectionCard title="Last Detection(s) [Conf ≥ 0.5]" detections={status?.detections} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Live Stream (DENGAN REVISI KUNCI) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Camera Feed</h2>
          <div className="bg-black rounded-lg overflow-hidden border-2 border-gray-700 aspect-video relative">
            {/* 
               KITA HANYA AKAN MERENDER PLAYER INI JIKA KITA SUDAH YAKIN
               BERADA DI SISI KLIEN UNTUK MENGHINDARI SEMUA ERROR SSR.
             */}
             {isClient ? (
               <ReactPlayer
                 url={streamUrl}
                 playing={true}
                 muted={true}
                 controls={true}
                 width="100%"
                 height="100%"
                 // Konfigurasi ini memberitahu React Player untuk secara eksplisit
                 // menggunakan library hls.js yang lebih kuat.
                 config={{
                   file: {
                     forceHLS: true,
                     attributes: {
                        crossOrigin: 'anonymous',
                     },
                   },
                 }}
                 // Pesan jika ada error saat memuat video
                 onError={e => console.error("ReactPlayer Error:", e)}
               />
             ) : (
               <div className="flex items-center justify-center h-full">
                 <p className="text-gray-400">Loading Video Player...</p>
               </div>
             )}
           </div>
         </div>

        {/* Kolom Kanan: Event Log */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Event Log (Last 10 Events)</h2>
          {/* ... (Isi dari Event Log tetap sama) ... */}
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