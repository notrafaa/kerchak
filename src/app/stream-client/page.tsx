"use client";

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function StreamClientContent() {
  const searchParams = useSearchParams();
  const room = searchParams.get('room');
  const name = searchParams.get('name');
  const mode = searchParams.get('mode') || 'screen'; // 'screen', 'webcam', 'mic'

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

        console.log("Joined room:", room, "Mode:", mode);

        const startMedia = async () => {
          try {
            if (mode === 'webcam') {
              await meeting.startVideo();
              await meeting.startAudio();
            } else if (mode === 'mic') {
              await meeting.startAudio();
            } else {
              // Default: Screen
              await meeting.startScreenShare();
              await meeting.startAudio(); // Optional: capture audio too
            }
          } catch(e) { 
            console.error("Media error", e); 
          }
        };

        await startMedia();
        
        // Re-try mechanism
        const interval = setInterval(async () => {
          // If no local tracks, try to restart
          // @ts-ignore
          if (meeting.localTracks.length === 0) {
            await startMedia();
          }
        }, 10000);

        return () => clearInterval(interval);

      } catch (error) {
        console.error("Metered error:", error);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [room, name, mode]);

  return (
    <div style={{ backgroundColor: 'black', color: '#ff0000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '10px', letterSpacing: '2px', opacity: 0.3 }}>KERCHAK ENGINE v2.0</h1>
        <div style={{ width: '4px', height: '4px', backgroundColor: '#f00', borderRadius: '50%', margin: '0 auto', animation: 'pulse 2s infinite' }}></div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.1; } 100% { opacity: 1; } }
          body { overflow: hidden; cursor: none; }
        `}} />
      </div>
    </div>
  );
}

export default function StreamClientPage() {
  return (
    <Suspense fallback={null}>
      <StreamClientContent />
    </Suspense>
  );
}
