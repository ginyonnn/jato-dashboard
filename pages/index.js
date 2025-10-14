// File: pages/index.js

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';

// Konfigurasi Firebase dari file .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function Dashboard() {
  // State untuk menyimpan data real-time
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  // useEffect untuk berlangganan data Firebase saat komponen dimuat
  useEffect(() => {
    const statusRef = ref(database, 'status');
    const logsQuery = query(ref(database, 'logs'), orderByChild('timestamp'), limitToLast(10));

    // Listener untuk data status terakhir
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      setStatus(data);
    });

    // Listener untuk 10 log terakhir
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formattedLogs = Object.values(data).reverse(); // Urutkan terbaru di atas
        setLogs(formattedLogs);
      }
    });

    // Cleanup function untuk berhenti berlangganan saat komponen ditutup
    return () => {
      unsubscribeStatus();
      unsubscribeLogs();
    };
  }, []);

  // Fungsi untuk menentukan warna status deteksi
  const getDetectionColor = (detections) => {
    if (!detections) return 'text-gray-400';
    const hasFall = detections.some(d => d.label.toLowerCase() === 'person' && d.confidence > 0.5); // Sesuaikan logika ini!
    return hasFall ? 'text-red-500 font-bold' : 'text-green-500';
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold">JATO Framework Dashboard</h1>
        <div className="flex items-center space-x-2 text-green-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span>Live</span>
        </div>
      </header>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard title="JATO's Last Decision" value={status?.decision || 'N/A'} />
        <StatusCard title="End-to-End Latency" value={status ? `${parseFloat(status.latency_ms).toFixed(2)} ms` : 'N/A'} />
        <StatusCard title="Last Detection" value={status?.detections?.[0]?.label || 'None'} color={getDetectionColor(status?.detections)} />
        <StatusCard title="Source Server" value={status?.source_server || 'N/A'} />
      </div>

      {/* Event Log */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Event Log</h2>
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={index} className="grid grid-cols-3 sm:grid-cols-4 gap-4 items-center p-3 bg-gray-700 rounded-md">
              <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
              <p className="font-semibold">{log.decision}</p>
              <p>{parseFloat(log.latency_ms).toFixed(0)} ms</p>
              <p className={`hidden sm:block ${getDetectionColor(log.detections)}`}>{log.detections?.[0]?.label || 'None'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Komponen untuk Status Card (untuk kebersihan kode)
function StatusCard({ title, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}