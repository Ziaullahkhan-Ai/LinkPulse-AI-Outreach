
import React, { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Users, 
  FileUp, 
  CheckSquare, 
  LayoutDashboard,
  Bell,
  Search,
  CheckCircle2,
  Filter,
  RefreshCw,
  Send,
  MessageCircle,
  X,
  Sparkles,
  ChevronRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Lead, LeadStatus, OutreachStats } from './types.ts';
import { scoreLead, generateOutreach, chatWithAssistant } from './services/geminiService.ts';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// --- Shared UI Components ---

const StatBox = ({ label, val, color }: { label: string, val: number, color: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{label}</div>
    <div className={`text-2xl font-black text-${color}-600`}>{String(val)}</div>
  </div>
);

const SidebarLink = ({ icon, label, active, onClick, count }: { icon: ReactNode, label: string, active: boolean, onClick: () => void, count?: number }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </div>
    {typeof count === 'number' && count > 0 && (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-indigo-400 text-white' : 'bg-indigo-600 text-white'}`}>
        {String(count)}
      </span>
    )}
  </button>
);

// --- View Components ---

const DashboardView = ({ stats }: { stats: OutreachStats }) => (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBox label="Total Leads" val={stats.totalLeads} color="blue" />
      <StatBox label="Qualified" val={stats.qualified} color="emerald" />
      <StatBox label="Pending" val={stats.pendingApproval} color="amber" />
      <StatBox label="Sent" val={stats.sent} color="indigo" />
    </div>
    <div className="bg-white p-6 rounded-3xl border border-slate-200 h-80 shadow-sm relative overflow-hidden">
      <div className="relative z-10">
        <h3 className="font-bold text-sm mb-6 text-slate-900 flex items-center gap-2">
          <RefreshCw size={14} className="text-indigo-500" /> Outreach Growth
        </h3>
      </div>
      <div className="absolute inset-0 pt-16 px-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[
            {n:'Qualified', v:stats.qualified}, 
            {n:'Pending', v:stats.pendingApproval}, 
            {n:'Sent', v:stats.sent}
          ]}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="n" hide />
            <Tooltip />
            <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const LeadsView = ({ leads, qualify, remove }: { leads: Lead[], qualify: (id: string) => void, remove: (id: string) => void }) => (
  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden animate-fade-in shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <th className="px-6 py-5">Profile</th>
            <th className="px-6 py-5">AI Score</th>
            <th className="px-6 py-5">Status</th>
            <th className="px-6 py-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic font-medium">No prospects in current list.</td>
            </tr>
          ) : (
            leads.map((l: Lead) => (
              <tr key={l.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-6 py-5">
                  <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{l.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{l.company}</div>
                </td>
                <td className="px-6 py-5">
                  {typeof l.score === 'number' ? (
                    <div className="flex items-center gap-3">
                      <div className={`text-xs font-black ${l.score > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{String(l.score)}%</div>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${l.score > 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                          style={{width: `${String(l.score)}%`}} 
                        />
                      </div>
                    </div>
                  ) : <span className="text-slate-300 text-[10px] uppercase font-bold tracking-tighter">Needs Scan</span>}
                </td>
                <td className="px-6 py-5">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tight ${l.status === LeadStatus.NEW ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>
                    {String(l.status)}
                  </span>
                </td>
                <td className="px-6 py-5 text-right space-x-3">
                  {l.status === LeadStatus.NEW && (
                    <button 
                      onClick={() => qualify(l.id)} 
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Analyze
                    </button>
                  )}
                  <button onClick={() => remove(l.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const ImportView = ({ onImport }: { onImport: (data: any[]) => void }) => {
  const [val, setVal] = useState('');
  const process = () => {
    const lines = val.split('\n').filter(l => l.trim());
    const data = lines.map(line => {
      const p = line.split(',').map(s => s.trim());
      return { name: p[0], company: p[1], headline: p[2] || 'LinkedIn Professional' };
    });
    onImport(data);
    setVal('');
  };
  return (
    <div className="max-w-2xl mx-auto bg-white p-10 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-2 text-slate-900 tracking-tight">Bulk Import</h2>
        <p className="text-slate-400 text-sm leading-relaxed">Paste your LinkedIn prospect list below.<br/>Format: <span className="font-mono text-indigo-500">Name, Company, Headline</span> (One per line)</p>
      </div>
      <textarea 
        value={val} 
        onChange={e => setVal(e.target.value)} 
        placeholder="Jane Doe, Acme Corp, CEO&#10;John Smith, GlobalTech, VP Marketing"
        className="w-full h-56 bg-slate-50 rounded-2xl p-5 text-sm border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 mb-6 font-mono outline-none transition-all" 
      />
      <button 
        onClick={process} 
        disabled={!val.trim()} 
        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
      >
        <FileUp size={20} /> Import CSV Data
      </button>
    </div>
  );
};

const ApprovalView = ({ leads, approve }: { leads: Lead[], approve: (id: string) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
    {leads.length === 0 ? (
      <div className="col-span-2 py-24 text-center text-slate-400 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-200" />
        <p className="font-medium">All clear! No pending approvals.</p>
      </div>
    ) : (
      leads.map((l: Lead) => (
        <div key={l.id} className="bg-white p-7 rounded-[32px] border border-slate-200 flex flex-col shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h4 className="font-black text-slate-900 text-lg tracking-tight">{l.name}</h4>
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{l.company}</p>
            </div>
            <div className="bg-indigo-50 text-indigo-700 font-black text-xs px-3 py-1.5 rounded-full ring-1 ring-indigo-100">{String(l.score)}%</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl text-xs text-slate-600 mb-6 flex-1 border border-slate-100/50">
            <div className="font-black text-[9px] text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-1.5">
              <Sparkles size={10} className="text-amber-500" /> AI Drafted Outreach
            </div>
            <p className="italic leading-relaxed text-slate-700">"{l.generatedMessage || 'Drafting personal intro...'}"</p>
          </div>
          <button onClick={() => approve(l.id)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100">
            <Send size={16} /> Send Approved Outreach
          </button>
        </div>
      ))
    )}
  </div>
);

// --- Error Boundary ---

interface ErrorBoundaryProps { 
  children?: ReactNode; 
}
interface ErrorBoundaryState { 
  hasError: boolean; 
  error: Error | null; 
}

// Fix: Explicitly extending React.Component and typing the state property to resolve "Property 'state' does not exist" errors.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("LinkPulse critical error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
          <div className="bg-white p-10 rounded-[32px] shadow-2xl max-w-sm border border-red-100">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-xl font-black text-slate-900 mb-2 tracking-tight">System Crash</h1>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">{this.state.error?.message || 'Interface rendering failed.'}</p>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
            >
              Reset App Data
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main Application ---

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'import' | 'approval'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('linkpulse_leads');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: "Ready to optimize your LinkedIn funnel. How can I help?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('linkpulse_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const stats = useMemo(() => ({
    totalLeads: leads.length,
    qualified: leads.filter(l => (l.score || 0) > 70).length,
    pendingApproval: leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL).length,
    sent: leads.filter(l => l.status === LeadStatus.SENT).length,
    replied: leads.filter(l => l.status === LeadStatus.REPLIED).length,
  }), [leads]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter(l => 
      l.name.toLowerCase().includes(lower) ||
      l.company.toLowerCase().includes(lower) ||
      l.headline.toLowerCase().includes(lower)
    );
  }, [leads, searchTerm]);

  const handleImport = (rawLeads: any[]) => {
    const formatted: Lead[] = rawLeads.map(l => ({
      id: Math.random().toString(36).substr(2, 9),
      name: l.name || 'Anonymous',
      headline: l.headline || 'Professional',
      profileUrl: l.url || '#',
      company: l.company || 'Unknown Org',
      location: l.location || 'Remote',
      status: LeadStatus.NEW,
      createdAt: new Date().toISOString()
    }));
    setLeads(prev => [...formatted, ...prev]);
    setActiveTab('leads');
  };

  const qualifyLead = async (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.QUALIFYING } : l));
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      const result = await scoreLead(lead);
      const outreachMsg = result.score > 50 ? await generateOutreach(lead) : '';
      setLeads(prev => prev.map(l => l.id === id ? { 
        ...l, 
        score: result.score,
        aiReasoning: result.reasoning,
        intentLevel: result.intent as any,
        status: result.score > 50 ? LeadStatus.WAITING_APPROVAL : LeadStatus.DISQUALIFIED,
        generatedMessage: outreachMsg
      } : l));
    } catch (error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.NEW } : l));
      alert("AI service interruption. Retrying...");
    }
  };

  const approveLead = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.SENT } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatTyping(true);
    try {
      const response = await chatWithAssistant(userMsg, leads);
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting right now." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">LinkPulse <span className="text-indigo-600">AI</span></h1>
          </div>
          <nav className="space-y-2">
            <SidebarLink icon={<LayoutDashboard size={20} />} label="Analytics" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarLink icon={<Users size={20} />} label="Prospect Explorer" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
            <SidebarLink icon={<FileUp size={20} />} label="Import Leads" active={activeTab === 'import'} onClick={() => setActiveTab('import')} />
            <SidebarLink icon={<CheckSquare size={20} />} label="Review Drafts" active={activeTab === 'approval'} onClick={() => setActiveTab('approval')} count={stats.pendingApproval} />
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-slate-50">
          <button 
            onClick={() => {if(confirm("Permanently wipe local lead database?")) setLeads([])}} 
            className="text-[10px] font-black text-slate-300 hover:text-red-400 flex items-center gap-2 transition-colors w-full px-3 py-2 uppercase tracking-widest"
          >
            <Trash2 size={12} /> Purge Database
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0 z-10">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads..." 
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-slate-900">Admin</span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">Pro Plan</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-lg">AZ</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
          <div className="max-w-6xl mx-auto pb-20">
            {activeTab === 'dashboard' && <DashboardView stats={stats} />}
            {activeTab === 'leads' && <LeadsView leads={filteredLeads} qualify={qualifyLead} remove={deleteLead} />}
            {activeTab === 'import' && <ImportView onImport={handleImport} />}
            {activeTab === 'approval' && <ApprovalView leads={leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL)} approve={approveLead} />}
          </div>
        </main>
      </div>

      {/* Floating Assistant */}
      <div className={`fixed bottom-8 right-8 transition-all duration-500 z-50 ${isChatOpen ? 'w-[360px] h-[540px]' : 'w-16 h-16'}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-[32px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in ring-8 ring-indigo-50/50">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="font-black text-sm tracking-tight">AI Strategist</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:rotate-90 transition-transform"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-[20px] text-xs max-w-[90%] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex justify-start">
                  <div className="p-4 bg-white border border-slate-100 rounded-[20px] rounded-tl-none flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-5 border-t bg-white flex gap-3">
              <input 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Type strategy request..." 
                className="flex-1 text-xs p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" 
              />
              <button onClick={handleChatSend} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)} 
            className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-indigo-200"
          >
            <MessageCircle size={28} />
          </button>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
