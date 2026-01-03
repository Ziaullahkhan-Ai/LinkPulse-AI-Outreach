
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

// --- Error Boundary ---

interface ErrorBoundaryProps { 
  children?: ReactNode; 
}
interface ErrorBoundaryState { 
  hasError: boolean; 
  error: Error | null; 
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm border border-red-100">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Interface Error</h1>
            <p className="text-slate-500 mb-6 text-sm">{this.state.error?.message || 'A rendering error occurred.'}</p>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all"
            >
              Reset Cache & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UI Components ---

const StatBox = ({ label, val, color }: { label: string, val: number, color: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200">
    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{label}</div>
    <div className={`text-2xl font-black text-${color}-600`}>{String(val)}</div>
  </div>
);

const SidebarLink = ({ icon, label, active, onClick, count }: { icon: ReactNode, label: string, active: boolean, onClick: () => void, count?: number }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
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

// --- Subviews ---

const DashboardView = ({ stats }: { stats: OutreachStats }) => (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBox label="Total Leads" val={stats.totalLeads} color="blue" />
      <StatBox label="Qualified" val={stats.qualified} color="emerald" />
      <StatBox label="Pending" val={stats.pendingApproval} color="amber" />
      <StatBox label="Sent" val={stats.sent} color="indigo" />
    </div>
    <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80 shadow-sm">
      <h3 className="font-bold text-sm mb-6 text-slate-900">Qualification Funnel</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[
          {n:'Qual', v:stats.qualified}, 
          {n:'Pend', v:stats.pendingApproval}, 
          {n:'Sent', v:stats.sent}
        ]}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="n" hide />
          <Tooltip />
          <Area type="monotone" dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const LeadsView = ({ leads, qualify, remove }: { leads: Lead[], qualify: (id: string) => void, remove: (id: string) => void }) => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-fade-in shadow-sm">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase text-[10px] tracking-wider">
          <th className="px-6 py-4">Lead</th>
          <th className="px-6 py-4">Analysis</th>
          <th className="px-6 py-4">Status</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {leads.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No leads in the explorer.</td>
          </tr>
        ) : (
          leads.map((l: Lead) => (
            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-bold text-slate-900">{l.name}</div>
                <div className="text-[10px] text-indigo-600 font-bold">{l.company}</div>
              </td>
              <td className="px-6 py-4">
                {typeof l.score === 'number' ? (
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-bold ${l.score > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{l.score}%</div>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{width: `${l.score}%`}} />
                    </div>
                  </div>
                ) : <span className="text-slate-300 italic text-[10px]">Unscored</span>}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-tight ${l.status === LeadStatus.NEW ? 'bg-slate-100' : 'bg-indigo-50 text-indigo-700'}`}>
                  {String(l.status)}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                {l.status === LeadStatus.NEW && (
                  <button onClick={() => qualify(l.id)} className="text-xs font-bold text-indigo-600 hover:underline">Qualify</button>
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
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
      <h2 className="text-xl font-bold mb-2 text-slate-900">Import Leads</h2>
      <p className="text-slate-400 text-sm mb-6">Format: Name, Company, Headline (CSV)</p>
      <textarea 
        value={val} 
        onChange={e => setVal(e.target.value)} 
        placeholder="Jane Doe, Acme Corp, CEO&#10;John Smith, GlobalTech, VP Marketing"
        className="w-full h-48 bg-slate-50 rounded-2xl p-4 text-sm border-none focus:ring-2 focus:ring-indigo-500 mb-6 font-mono outline-none" 
      />
      <button 
        onClick={process} 
        disabled={!val.trim()} 
        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
      >
        Import Data
      </button>
    </div>
  );
};

const ApprovalView = ({ leads, approve }: { leads: Lead[], approve: (id: string) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
    {leads.length === 0 ? (
      <div className="col-span-2 py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed">No leads waiting for outreach.</div>
    ) : (
      leads.map((l: Lead) => (
        <div key={l.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col shadow-sm">
          <div className="flex justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-900">{l.name}</h4>
              <p className="text-[10px] text-indigo-600 font-bold uppercase">{l.company}</p>
            </div>
            <div className="bg-indigo-50 text-indigo-700 font-black text-xs px-2 py-1 rounded-lg h-fit">{String(l.score)}%</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 mb-4 flex-1 border border-slate-100">
            <div className="font-bold text-[9px] text-slate-400 uppercase mb-2 tracking-wider">AI Generated Message</div>
            <p className="italic leading-relaxed">"{l.generatedMessage || 'Drafting...'}"</p>
          </div>
          <button onClick={() => approve(l.id)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all">
            <Send size={14} /> Send Outreach
          </button>
        </div>
      ))
    )}
  </div>
);

// --- Main Application Components ---

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
    { role: 'assistant', text: "Hello! I'm your LinkPulse strategist. How can I help you today?" }
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
    qualified: leads.filter(l => l.score && l.score > 70).length,
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
      name: l.name || 'Unknown Prospect',
      headline: l.headline || 'LinkedIn Professional',
      profileUrl: l.url || '#',
      company: l.company || 'Company',
      location: l.location || 'Unknown',
      recentPost: l.recentPost || '',
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
      alert("AI analysis failed. Check console for details.");
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
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Strategy engine is offline." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">LinkPulse AI</h1>
          </div>
          <nav className="space-y-1">
            <SidebarLink icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarLink icon={<Users size={18} />} label="Leads Explorer" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
            <SidebarLink icon={<FileUp size={18} />} label="Import" active={activeTab === 'import'} onClick={() => setActiveTab('import')} />
            <SidebarLink icon={<CheckSquare size={18} />} label="Approvals" active={activeTab === 'approval'} onClick={() => setActiveTab('approval')} count={stats.pendingApproval} />
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-100">
          <button 
            onClick={() => {if(confirm("Wipe all leads?")) setLeads([])}} 
            className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-2 transition-colors w-full px-3 py-2"
          >
            <Trash2 size={14} /> Clear All Data
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter leads..." 
              className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="max-w-6xl mx-auto pb-10">
            {activeTab === 'dashboard' && <DashboardView stats={stats} />}
            {activeTab === 'leads' && <LeadsView leads={filteredLeads} qualify={qualifyLead} remove={deleteLead} />}
            {activeTab === 'import' && <ImportView onImport={handleImport} />}
            {activeTab === 'approval' && <ApprovalView leads={leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL)} approve={approveLead} />}
          </div>
        </main>
      </div>

      {/* Assistant */}
      <div className={`fixed bottom-6 right-6 transition-all duration-300 z-50 ${isChatOpen ? 'w-80 h-[500px]' : 'w-14 h-14'}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <span className="font-bold text-sm">Strategist</span>
              <button onClick={() => setIsChatOpen(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-100'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex justify-start">
                  <div className="p-3 bg-white border border-slate-100 rounded-2xl flex gap-1">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t bg-white flex gap-2">
              <input 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask me..." 
                className="flex-1 text-xs p-2 bg-slate-50 rounded-lg outline-none" 
              />
              <button onClick={handleChatSend} className="p-2 bg-indigo-600 text-white rounded-lg">
                <Send size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)} 
            className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          >
            <MessageCircle size={24} />
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
