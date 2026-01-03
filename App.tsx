import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
import { 
  Users, 
  FileUp, 
  CheckSquare, 
  LayoutDashboard,
  Search,
  CheckCircle2,
  RefreshCw,
  Send,
  MessageCircle,
  X,
  Sparkles,
  Trash2,
  AlertCircle,
  ChevronRight,
  Zap,
  Download,
  Filter,
  Plus,
  ArrowRight,
  Target
} from 'lucide-react';
import { Lead, LeadStatus, OutreachStats } from './types.ts';
import { scoreLead, generateOutreach, chatWithAssistant } from './services/geminiService.ts';
import { 
  BarChart,
  Bar,
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// --- Error Boundary ---
interface ErrorBoundaryProps { children?: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

/**
 * Standard Error Boundary for catching UI crashes.
 * Fixes TS issues with inherited properties by extending React.Component.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-12 text-center">
          <div className="bg-white p-12 rounded-[48px] shadow-3xl max-w-md border border-red-100">
            <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-8 animate-bounce" />
            <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">System Restart Needed</h1>
            <p className="text-slate-500 mb-10 text-sm leading-relaxed">We encountered a temporary rendering issue. A fresh session will fix this.</p>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-black transition-all shadow-xl"
            >
              Clear Data & Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Dashboard Sub-Components ---
const IntentChart = ({ leads }: { leads: Lead[] }) => {
  const data = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    leads.forEach(l => { 
        const intent = l.intentLevel || 'Low';
        counts[intent]++; 
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const COLORS = { High: '#6366f1', Medium: '#a5b4fc', Low: '#e2e8f0' };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- View Components ---
const DashboardView = ({ stats, leads }: { stats: OutreachStats, leads: Lead[] }) => (
  <div className="space-y-10 animate-fade-in">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Prospects</div>
        <div className="text-4xl font-black text-slate-900">{stats.totalLeads}</div>
      </div>
      <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-100">
        <div className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-4">AI Qualified</div>
        <div className="text-4xl font-black">{stats.qualified}</div>
      </div>
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sent Proposals</div>
        <div className="text-4xl font-black text-slate-900">{stats.sent}</div>
      </div>
      <div className="bg-emerald-500 p-8 rounded-[40px] text-white shadow-2xl shadow-emerald-100">
        <div className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-4">Engagements</div>
        <div className="text-4xl font-black">{stats.replied}</div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-200 h-[450px] shadow-sm">
        <div className="flex justify-between items-center mb-8 px-4">
            <h3 className="font-black text-slate-900 flex items-center gap-3">
              <Zap size={20} className="text-indigo-500" /> Qualification Funnel
            </h3>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sentiment analysis</span>
        </div>
        <div className="h-72">
          <IntentChart leads={leads} />
        </div>
      </div>
      <div className="bg-slate-900 p-12 rounded-[56px] text-white flex flex-col justify-between shadow-3xl relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000" />
        <div className="relative z-10">
          <div className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Sparkles size={14} /> AI Recommendation
          </div>
          <h4 className="text-2xl font-black mb-6 leading-tight">Prioritize the "{stats.qualified > 0 ? 'Qualified' : 'New'}" segment today.</h4>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
            Your current high-score prospects show a 3.5x higher likelihood of engagement. Execute drafts for this segment to maximize conversion velocity.
          </p>
        </div>
        <button className="relative z-10 w-full bg-white text-slate-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group">
          Execute Strategy <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  </div>
);

// --- Main App Content ---
const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'import' | 'approval'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('linkpulse_active_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: "Strategic Advisor online. How can I help you scale your outreach today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('linkpulse_active_v1', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);

  const stats = useMemo(() => ({
    totalLeads: leads.length,
    qualified: leads.filter(l => (l.score || 0) > 70).length,
    pendingApproval: leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL).length,
    sent: leads.filter(l => l.status === LeadStatus.SENT).length,
    replied: leads.filter(l => l.status === LeadStatus.REPLIED).length,
  }), [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = !searchTerm || [l.name, l.company, l.headline].some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const handleImport = (raw: any[]) => {
    const formatted: Lead[] = raw.map(l => ({
      id: Math.random().toString(36).substring(2, 11),
      name: l.name || 'Anonymous',
      headline: l.headline || 'Professional',
      profileUrl: '#',
      company: l.company || 'TBD',
      location: 'Global',
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
      const outreachMsg = result.score > 40 ? await generateOutreach(lead) : '';
      setLeads(prev => prev.map(l => l.id === id ? { 
        ...l, 
        score: result.score,
        aiReasoning: result.reasoning,
        intentLevel: result.intent as any,
        status: result.score > 40 ? LeadStatus.WAITING_APPROVAL : LeadStatus.DISQUALIFIED,
        generatedMessage: outreachMsg
      } : l));
    } catch (error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.NEW } : l));
    }
  };

  const approveLead = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.SENT } : l));
  };

  const deleteLead = (id: string) => setLeads(prev => prev.filter(l => l.id !== id));

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setIsChatTyping(true);
    try {
      const resp = await chatWithAssistant(msg, leads);
      setChatMessages(prev => [...prev, { role: 'assistant', text: resp }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Strategic engine offline. Check your connection." }]);
    } finally { setIsChatTyping(false); }
  };

  const loadSampleData = () => {
      const sample = `Satya Nadella, Microsoft, CEO
Sundar Pichai, Google, CEO
Sam Altman, OpenAI, CEO
Jensen Huang, NVIDIA, CEO
Tim Cook, Apple, CEO`;
      const importArea = document.getElementById('importArea') as HTMLTextAreaElement;
      if (importArea) importArea.value = sample;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-medium selection:bg-indigo-600 selection:text-white">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col shrink-0">
        <div className="p-10 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-5 mb-16 group cursor-default">
            <div className="bg-indigo-600 w-14 h-14 rounded-[22px] text-white flex items-center justify-center shadow-2xl shadow-indigo-100 group-hover:rotate-6 transition-transform">
              <Sparkles size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">LinkPulse</h1>
              <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Scale Intelligence</div>
            </div>
          </div>
          <nav className="space-y-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <LayoutDashboard size={20} /> <span className="text-sm font-bold">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === 'leads' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Users size={20} /> <span className="text-sm font-bold">Pipeline</span>
            </button>
            <button onClick={() => setActiveTab('import')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeTab === 'import' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <FileUp size={20} /> <span className="text-sm font-bold">Importer</span>
            </button>
            <button onClick={() => setActiveTab('approval')} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${activeTab === 'approval' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4"><CheckSquare size={20} /> <span className="text-sm font-bold">Approval</span></div>
              {stats.pendingApproval > 0 && <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${activeTab === 'approval' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>{stats.pendingApproval}</span>}
            </button>
          </nav>
        </div>
        <div className="p-10 border-t border-slate-50">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
            <div className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-4">Instance Status</div>
            <div className="text-sm font-black mb-1 flex items-center gap-2">Premium Tier <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" /></div>
            <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
              <div className="w-3/4 h-full bg-indigo-500" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-28 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-12 sm:px-16 shrink-0 z-20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Query pipeline..." 
              className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] py-4 pl-16 pr-8 text-sm focus:bg-white focus:border-indigo-100 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-xs font-black text-slate-900 uppercase">Administrator</span>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Active Session</span>
            </div>
            <div className="w-14 h-14 rounded-[22px] bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xl ring-[6px] ring-slate-50">ZA</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 sm:p-16 no-scrollbar">
          <div className="max-w-6xl mx-auto pb-40">
            {activeTab === 'dashboard' && <DashboardView stats={stats} leads={leads} />}
            
            {activeTab === 'leads' && (
              <div className="animate-fade-in space-y-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lead Pipeline</h2>
                   <div className="flex gap-4 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                          value={statusFilter} 
                          onChange={e => setStatusFilter(e.target.value as any)}
                          className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-4"
                        >
                          <option value="ALL">All Status</option>
                          <option value={LeadStatus.NEW}>New</option>
                          <option value={LeadStatus.QUALIFYING}>Qualifying</option>
                          <option value={LeadStatus.WAITING_APPROVAL}>Waiting</option>
                          <option value={LeadStatus.SENT}>Sent</option>
                        </select>
                      </div>
                      <button onClick={() => setActiveTab('import')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-transform flex items-center gap-2">
                        <Plus size={16} /> Add Leads
                      </button>
                   </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <tr>
                          <th className="px-10 py-8">Prospect</th>
                          <th className="px-10 py-8">Relevance</th>
                          <th className="px-10 py-8">Status</th>
                          <th className="px-10 py-8 text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.length === 0 ? (
                          <tr><td colSpan={4} className="px-10 py-24 text-center text-slate-400 font-bold italic">No records found. Import data to begin.</td></tr>
                        ) : (
                          filteredLeads.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/40 transition-colors group">
                              <td className="px-10 py-7">
                                <div className="font-black text-slate-900 text-base">{l.name}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider truncate max-w-[240px]">{l.headline} @ {l.company}</div>
                              </td>
                              <td className="px-10 py-7">
                                {l.score !== undefined ? (
                                  <div className="flex items-center gap-4">
                                    <span className={`text-xs font-black ${l.score > 70 ? 'text-indigo-600' : 'text-slate-400'}`}>{l.score}%</span>
                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all duration-1000 ${l.score > 70 ? 'bg-indigo-500' : 'bg-slate-300'}`} style={{width: `${l.score}%`}} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">Pending AI Review</div>
                                )}
                              </td>
                              <td className="px-10 py-7">
                                <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                  l.status === LeadStatus.NEW ? 'bg-white text-slate-400 border-slate-200' :
                                  l.status === LeadStatus.QUALIFYING ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' :
                                  l.status === LeadStatus.WAITING_APPROVAL ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  l.status === LeadStatus.SENT ? 'bg-slate-900 text-white border-slate-900' :
                                  'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                                }`}>
                                  {l.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-10 py-7 text-right space-x-3">
                                {l.status === LeadStatus.NEW && (
                                  <button onClick={() => qualifyLead(l.id)} className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 hover:bg-black transition-all shadow-lg shadow-slate-200">Qualify</button>
                                )}
                                <button onClick={() => deleteLead(l.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="max-w-3xl mx-auto animate-fade-in space-y-10">
                <div className="bg-white p-12 sm:p-16 rounded-[64px] border border-slate-200 shadow-3xl">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h2 className="text-3xl font-black mb-4 tracking-tight">Ingest Lead Data</h2>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-sm">Format: <span className="font-mono bg-slate-50 px-2 py-1 rounded text-indigo-500 border border-slate-100">Name, Company, Title</span></p>
                    </div>
                    <button onClick={loadSampleData} className="px-4 py-2 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">Sample Set</button>
                  </div>
                  <textarea 
                    className="w-full h-80 bg-slate-50 rounded-[40px] p-10 text-sm outline-none focus:ring-[16px] focus:ring-indigo-500/5 border-2 border-transparent focus:border-indigo-100 transition-all font-mono mb-10 shadow-inner resize-none" 
                    placeholder="E.g. Elon Musk, Tesla, CEO" 
                    id="importArea"
                  />
                  <button 
                    onClick={() => {
                      const area = document.getElementById('importArea') as HTMLTextAreaElement;
                      if (!area.value.trim()) return;
                      handleImport(area.value.split('\n').filter(l => l.trim()).map(line => {
                        const parts = line.split(',').map(s => s.trim());
                        return { name: parts[0], company: parts[1] || 'TBD', headline: parts[2] || 'Professional' };
                      }));
                      area.value = '';
                    }}
                    className="w-full bg-indigo-600 text-white font-black py-7 rounded-[32px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 text-sm uppercase tracking-widest flex items-center justify-center gap-4 group"
                  >
                    <Download size={22} className="group-hover:translate-y-1 transition-transform" /> Deploy Pipeline
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'approval' && (
              <div className="animate-fade-in space-y-12">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Draft Approval Queue</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL).length === 0 ? (
                    <div className="col-span-2 py-48 text-center bg-white rounded-[64px] border-2 border-dashed border-slate-100 flex flex-col items-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8"><CheckSquare size={40} className="text-slate-200" /></div>
                      <div className="text-slate-300 font-black text-xl uppercase tracking-widest">Inbox Zero</div>
                      <p className="text-slate-400 text-sm mt-4 font-medium max-w-xs mx-auto">Qualify leads to generate high-intent outreach drafts.</p>
                    </div>
                  ) : (
                    leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL).map(l => (
                      <div key={l.id} className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-sm flex flex-col hover:shadow-2xl transition-all group hover:-translate-y-2 duration-500">
                        <div className="flex justify-between items-start mb-10">
                          <div className="flex-1 pr-4 min-w-0">
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight truncate">{l.name}</h4>
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2 truncate">{l.company} • {l.headline}</div>
                          </div>
                          <div className="shrink-0 bg-indigo-50 px-5 py-2.5 rounded-2xl text-indigo-700 font-black text-xs ring-1 ring-indigo-100 shadow-sm">{l.score}% Score</div>
                        </div>
                        <div className="bg-slate-50 p-10 rounded-[40px] mb-12 flex-1 border border-slate-100 text-slate-700 leading-relaxed font-medium relative group-hover:bg-indigo-50/20 transition-colors">
                          <div className="absolute top-4 right-8"><Sparkles size={16} className="text-indigo-300 animate-pulse" /></div>
                          <p className="italic text-base">"{l.generatedMessage || 'Drafting intro message...'}"</p>
                        </div>
                        <button onClick={() => approveLead(l.id)} className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl hover:bg-black transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest group">
                          <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Execute Outreach
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Chat Strategy Hub */}
      <div className={`fixed bottom-12 right-12 transition-all duration-700 ease-in-out z-50 ${isChatOpen ? 'w-[450px] h-[680px]' : 'w-24 h-24'}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-[64px] shadow-3xl border border-slate-200 flex flex-col overflow-hidden ring-[16px] ring-indigo-50/50 animate-fade-in">
            <div className="p-12 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <span className="font-black text-sm uppercase tracking-widest">Strategy AI</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:rotate-90 transition-transform bg-white/10 p-2 rounded-full relative z-10"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-slate-50/40 no-scrollbar">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-7 rounded-[32px] max-w-[85%] leading-relaxed shadow-sm font-medium text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex justify-start">
                   <div className="flex gap-2 p-4 bg-white rounded-full px-6 shadow-sm border border-slate-100">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-10 bg-white border-t border-slate-50 flex gap-4">
              <input 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask strategy advice..." 
                className="flex-1 bg-slate-50 p-6 rounded-[28px] outline-none text-[11px] font-bold border-2 border-transparent focus:border-indigo-100 transition-all shadow-inner" 
              />
              <button onClick={handleChatSend} className="bg-indigo-600 text-white p-6 rounded-[28px] shadow-2xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-transform">
                <Send size={24} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)} 
            className="w-24 h-24 bg-indigo-600 text-white rounded-[40px] shadow-3xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <MessageCircle size={36} className="relative z-10" />
            {stats.totalLeads > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-[4px] border-slate-50 animate-pulse" />}
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