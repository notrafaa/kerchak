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
    document.title = "KERCHAK ENGINE v2.0";
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
    <div style={{ backgroundColor: 'black', color: '#ff0000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #f00, transparent)', animation: 'scan 4s linear infinite', opacity: 0.5 }}></div>
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '15px' }}>ESTABLISHING NEURAL LINK...</div>
        <div style={{ fontSize: '8px', opacity: 0.4, letterSpacing: '2px' }}>KERCHAK CORE ENGINE v3.0 // ENCRYPTED SESSION</div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '4px', justifyContent: 'center' }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ width: '3px', height: '12px', backgroundColor: '#f00', animation: `wave 1s ease-in-out infinite ${i*0.1}s` }}></div>)}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
          @keyframes wave { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(2); opacity: 0.3; } }
          body { cursor: none; background: #000; }
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
