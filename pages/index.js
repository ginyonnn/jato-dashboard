// ==============================================================================
// File:        pages/index.js (FINAL - v2.3)
// Deskripsi:   Versi paling tangguh dari Dasbor JATO, dengan penanganan SSR
//              yang eksplisit untuk React Player.
// ==============================================================================

// --- BAGIAN 1: Impor Library ---
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import dynamic from 'next/dynamic';

// --- Impor React Player dengan cara paling aman ---
// 'ssr: false' adalah kunci untuk mencegah rendering di sisi server.
const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

// --- (Sisa dari Bagian Konfigurasi & Komponen Pembantu TETAP SAMA) ---
const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
function StatusCard({ title, value }) { /* ... */ }
function MultiDetectionCard({ title, detections }) { /* ... */ }
function LogItem({ log }) { /* ... */ }

// --- BAGIAN UTAMA DASBOR (DENGAN REVISI PENTING) ---
export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // --- PERUBAHAN DI SINI: State baru untuk pelacakan sisi klien ---
  // State ini akan bernilai `false` di server, dan `true` setelah komponen dimuat di browser.
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Memberitahu React bahwa kita sekarang berada di sisi klien (browser)
    setIsClient(true);
    
    const statusRef = ref(database, 'status');
    const logsQuery = query(ref(database, 'logs'), orderByChild('timestamp'), limitToLast(10));
    
    const unsubscribeStatus = onValue(statusRef, (snapshot) => setStatus(snapshot.val()));
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
      if (snapshot.val()) {
        setLogs(Object.values(snapshot.val()).reverse());
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeLogs();
    };
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 font-sans">
      <Head>
        <title>JATO Framework Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* (Header dan Status Cards tidak berubah) */}
      <header className="flex justify-between items-center mb-8">
        {/* ... */}
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* ... */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Live Stream (DENGAN REVISI KUNCI) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Camera Feed</h2>
          <div className="bg-black rounded-lg overflow-hidden border-2 border-gray-700 aspect-video relative">
            {/* 
              PERUBAHAN UTAMA: Komponen ReactPlayer HANYA di-render 
              jika kita 100% yakin kita berada di sisi klien.
            */}
            {isClient ? (
              <ReactPlayer
                url="https://jensen-zoonal-terresa.ngrok-free.dev/live/playlist.m3u8"
                playing={true}   
                muted={true}     
                controls={true}  
                width="100%"
                height="100%"
                // Tambahkan fallback error handling
                onError={e => console.error('ReactPlayer Error', e)}
                config={{
                  file: {
                    hlsOptions: {
                      // Opsi ini bisa membantu jika stream sering berhenti
                      liveSyncDurationCount: 7,
                    }
                  },
                }}
              />
            ) : (
              // Tampilkan pesan loading saat rendering di server
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-400">Loading Player...</p>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Event Log (Tidak ada perubahan) */}
        <div className="bg-gray-800 rounded-lg p-6">
           {/* ... */}
        </div>
      </div>
    </div>
  );
}