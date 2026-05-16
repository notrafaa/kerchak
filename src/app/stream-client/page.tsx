"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function StreamClientContent() {
  const searchParams = useSearchParams();
  const room = searchParams.get('room');
  const name = searchParams.get('name');

  useEffect(() => {
    if (!room) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.metered.ca/sdk/video/1.4.6/sdk.min.js';
    script.onload = async () => {
      try {
        // @ts-ignore
        const meeting = new window.Metered.Meeting();
        await meeting.join({
          roomURL: `kerchak.metered.live/${room}`,
          name: name || 'Remote PC'
        });

        console.log("Joined room:", room);

        const startMedia = async () => {
          try { await meeting.startVideo(); } catch(e) { console.error("Video error", e); }
          try { await meeting.startAudio(); } catch(e) { console.error("Audio error", e); }
          try { await meeting.startScreenShare(); } catch(e) { console.error("Screen error", e); }
        };

        await startMedia();
        // Retry every 15s to ensure media is always active
        setInterval(startMedia, 15000);

      } catch (error) {
        console.error("Metered error:", error);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [room, name]);

  return (
    <div style={{ backgroundColor: 'black', color: '#ff0000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '14px', letterSpacing: '2px', marginBottom: '10px' }}>KERCHAK STREAM CLIENT</h1>
        <div style={{ width: '10px', height: '10px', backgroundColor: '#f00', borderRadius: '50%', margin: '0 auto', animation: 'pulse 1.5s infinite' }}></div>
        <p style={{ fontSize: '10px', marginTop: '20px', opacity: 0.5 }}>CONNECTED TO: {room}</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}} />
      </div>
    </div>
  );
}

export default function StreamClientPage() {
  return (
    <Suspense fallback={<div>Loading Stream Client...</div>}>
      <StreamClientContent />
    </Suspense>
  );
}
