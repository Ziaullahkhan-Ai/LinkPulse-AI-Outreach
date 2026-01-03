
import React, { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Users, 
  FileUp, 
  CheckSquare, 
  LayoutDashboard,
  LogOut,
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

// Define explicit interfaces for ErrorBoundary props and state
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to handle runtime errors gracefully.
 * Fix: Explicitly define generics and implement correct React class patterns.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-sm">
              The application encountered an unexpected error. This might be due to a configuration issue or a temporary service disruption.
            </p>
            <div className="bg-red-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-700">{this.state.error?.message}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'import' | 'approval'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('linkpulse_leads');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load leads from localStorage", e);
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: "Hello! I'm your LinkPulse AI Assistant. I can help you analyze your leads or draft better messages. What's on your mind?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('linkpulse_leads', JSON.stringify(leads));
    } catch (e) {
      console.error("Failed to save leads", e);
    }
  }, [leads]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const stats = useMemo(() => {
    return {
      totalLeads: leads.length,
      qualified: leads.filter(l => l.score && l.score > 70).length,
      pendingApproval: leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL).length,
      sent: leads.filter(l => l.status === LeadStatus.SENT).length,
      replied: leads.filter(l => l.status === LeadStatus.REPLIED).length,
    };
  }, [leads]);

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
      company: l.company || 'Private Company',
      location: l.location || 'Remote',
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
      console.error("Qualification failed", error);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.NEW } : l));
      alert("AI Qualification failed. Check your API key or console.");
    }
  };

  const approveLead = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.SENT } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const clearDatabase = () => {
    if (confirm("This will permanently delete all leads. Continue?")) {
      setLeads([]);
      localStorage.removeItem('linkpulse_leads');
    }
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
      setChatMessages(prev => [...prev, { role: 'assistant', text: "I'm having a technical glitch. Try again in a moment!" }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0 z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10 group cursor-default">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">LinkPulse <span className="text-indigo-600">AI</span></h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Growth Engine</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Overview" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<Users size={20} />} 
              label="Leads Explorer" 
              active={activeTab === 'leads'} 
              onClick={() => setActiveTab('leads')} 
            />
            <SidebarItem 
              icon={<FileUp size={20} />} 
              label="Bulk Import" 
              active={activeTab === 'import'} 
              onClick={() => setActiveTab('import')} 
            />
            <SidebarItem 
              icon={<CheckSquare size={20} />} 
              label="Approval Queue" 
              active={activeTab === 'approval'} 
              onClick={() => setActiveTab('approval')} 
              count={stats.pendingApproval}
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100 space-y-4 bg-slate-50/50">
          <button 
            onClick={clearDatabase}
            className="flex items-center gap-3 text-slate-400 hover:text-red-500 transition-colors w-full px-2 text-xs font-bold uppercase tracking-wider"
          >
            <Trash2 size={16} />
            <span>Wipe Database</span>
          </button>
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Production Mode</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
          <div className="relative flex-1 max-w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads..." 
              className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded-2xl py-2.5 pl-12 pr-4 text-sm transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-4 ml-4">
            <button className="hidden sm:flex p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-slate-900">Admin User</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Plan</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/30">
          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'dashboard' && <Dashboard stats={stats} />}
            {activeTab === 'leads' && <LeadsExplorer leads={filteredLeads} qualifyLead={qualifyLead} deleteLead={deleteLead} />}
            {activeTab === 'import' && <LeadImporter onImport={handleImport} />}
            {activeTab === 'approval' && <ApprovalQueue leads={leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL)} approve={approveLead} />}
          </div>
        </main>
      </div>

      {/* Chatbot Assistant */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${isChatOpen ? 'w-[calc(100vw-3rem)] md:w-[450px] h-[600px] scale-100 opacity-100' : 'w-16 h-16 scale-100 opacity-100'}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">LinkPulse AI</h3>
                  <p className="text-xs text-indigo-100 opacity-80">Online & Ready</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-5 bg-white border-t border-slate-100 flex items-center gap-3">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask your strategist..."
                className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 px-5 text-sm outline-none"
              />
              <button 
                onClick={handleChatSend}
                disabled={!chatInput.trim() || isChatTyping}
                className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-95 group"
          >
            <MessageCircle size={28} />
          </button>
        )}
      </div>
    </div>
  );
};

// Main App component wrapped in ErrorBoundary
const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

// --- Sub-components ---

const Dashboard: React.FC<{ stats: OutreachStats }> = ({ stats }) => {
  const chartData = [
    { name: 'Qualified', value: stats.qualified },
    { name: 'Pending', value: stats.pendingApproval },
    { name: 'Sent', value: stats.sent },
    { name: 'Replied', value: stats.replied },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Pipeline Pulse</h2>
          <p className="text-slate-500 font-medium">Real-time performance metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <StatCard label="Total Leads" value={stats.totalLeads} icon={<Users className="text-blue-600" />} color="blue" />
        <StatCard label="Qualified" value={stats.qualified} icon={<CheckCircle2 className="text-emerald-600" />} color="emerald" />
        <StatCard label="Pending Approval" value={stats.pendingApproval} icon={<CheckSquare className="text-amber-600" />} color="amber" />
        <StatCard label="Sent Out" value={stats.sent} icon={<Send className="text-indigo-600" />} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-8">Performance Distribution</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
          <div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              AI Strategy Tip
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Health Check</span>
                <span className="text-emerald-400 font-black">Stable</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                High-intent leads are peaking this week. We recommend batch-processing the approval queue to maintain a high response rate.
              </p>
            </div>
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg mt-6">
            View Analytics <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadsExplorer: React.FC<{ leads: Lead[], qualifyLead: (id: string) => void, deleteLead: (id: string) => void }> = ({ leads, qualifyLead, deleteLead }) => (
  <div className="space-y-10 animate-fade-in">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Explorer</h2>
        <p className="text-slate-500 font-medium">Analyze and manage your prospects</p>
      </div>
      <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"><Filter size={18}/> Filters</button>
    </div>

    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <th className="px-8 py-6">Prospect</th>
            <th className="px-8 py-6">Intelligence</th>
            <th className="px-8 py-6">Status</th>
            <th className="px-8 py-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-8 py-24 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center mx-auto text-slate-300">
                    <Users size={32} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">No prospects yet</h3>
                  <p className="text-sm text-slate-400">Import your first lead list to get started with AI outreach.</p>
                </div>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-7">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="max-w-[250px]">
                      <p className="font-black text-slate-900 text-base">{lead.name}</p>
                      <p className="text-xs font-bold text-indigo-600 truncate">{lead.company}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-7">
                  {lead.score ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                        <span className={lead.score > 70 ? 'text-emerald-600' : 'text-amber-600'}>{lead.intentLevel} Intent</span>
                        <span className="text-slate-900">{lead.score}%</span>
                      </div>
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${lead.score > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                    </div>
                  ) : <span className="text-[10px] font-bold text-slate-300 uppercase italic">Waiting Analysis</span>}
                </td>
                <td className="px-8 py-7">
                   <StatusBadge status={lead.status} />
                </td>
                <td className="px-8 py-7 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {lead.status === LeadStatus.NEW && (
                      <button 
                        onClick={() => qualifyLead(lead.id)}
                        className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-5 py-2.5 rounded-xl transition-all"
                      >
                        Qualify
                      </button>
                    )}
                    {lead.status === LeadStatus.QUALIFYING && (
                      <RefreshCw size={18} className="animate-spin text-indigo-500" />
                    )}
                    <button 
                      onClick={() => deleteLead(lead.id)}
                      className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const LeadImporter: React.FC<{ onImport: (data: any[]) => void }> = ({ onImport }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = () => {
    if (!pasteData.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const lines = pasteData.split('\n').filter(l => l.trim());
      const data = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          name: parts[0] || 'Unknown',
          company: parts[1] || 'Private',
          headline: parts[2] || 'Professional',
          recentPost: parts[3] || '',
        };
      });
      onImport(data);
      setPasteData('');
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
      <div className="text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Expand Database</h2>
        <p className="text-slate-500 mt-2 font-medium">Paste CSV formatted lead data to start automated analysis</p>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl border border-slate-100">
        <textarea 
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder="Name, Company, Headline, Recent Activity...&#10;Ex: Jane Doe, Acme Corp, CEO, Post about AI"
          className="w-full h-80 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] focus:border-indigo-500 focus:bg-white transition-all outline-none font-mono text-sm mb-8 placeholder:text-slate-300"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">CSV Format: Name, Company, Headline, Post</p>
          <button 
            onClick={handleProcess}
            disabled={!pasteData.trim() || isProcessing}
            className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-base hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw size={22} className="animate-spin" /> : <Sparkles size={22} />}
            {isProcessing ? 'Importing...' : 'Batch Import Leads'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ApprovalQueue: React.FC<{ leads: Lead[], approve: (id: string) => void }> = ({ leads, approve }) => (
  <div className="space-y-10 animate-fade-in">
     <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Approvals</h2>
        <p className="text-slate-500 font-medium">Review and launch generated messages</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
        {leads.length === 0 ? (
          <div className="lg:col-span-2 py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
             <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-6" />
             <h3 className="text-2xl font-black text-slate-900">All caught up!</h3>
             <p className="text-slate-400 font-medium mt-2">No outreach messages pending approval.</p>
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-200 shadow-xl flex flex-col hover:shadow-2xl transition-all">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{lead.name}</h3>
                    <p className="text-sm font-bold text-indigo-600">{lead.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-indigo-600">{lead.score}%</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Fit Score</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
                <p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-wider">AI Analysis</p>
                <p className="text-sm text-slate-700 font-medium italic">"{lead.aiReasoning}"</p>
              </div>

              <div className="flex-1 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">Personalized Message</label>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-[28px] text-sm text-slate-800 leading-relaxed min-h-[120px]">
                  {lead.generatedMessage}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => approve(lead.id)}
                  className="flex-1 bg-slate-900 text-white font-black py-4 rounded-[24px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} /> Send Outreach
                </button>
                <button className="px-6 border border-slate-200 rounded-[24px] hover:bg-slate-100 transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
  </div>
);

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }> = ({ icon, label, active, onClick, count }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <div className="flex items-center gap-4">
      <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-indigo-400 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
        {count}
      </span>
    )}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className={`p-3 bg-${color}-50 w-fit rounded-2xl mb-4`}>
      {icon}
    </div>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
    <p className="text-3xl font-black mt-1 text-slate-900">{value}</p>
  </div>
);

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const styles = {
    [LeadStatus.NEW]: 'bg-slate-100 text-slate-500',
    [LeadStatus.QUALIFYING]: 'bg-indigo-50 text-indigo-600',
    [LeadStatus.QUALIFIED]: 'bg-emerald-50 text-emerald-600',
    [LeadStatus.DISQUALIFIED]: 'bg-rose-50 text-rose-500',
    [LeadStatus.READY_FOR_OUTREACH]: 'bg-indigo-500 text-white',
    [LeadStatus.WAITING_APPROVAL]: 'bg-amber-50 text-amber-700',
    [LeadStatus.SENT]: 'bg-emerald-600 text-white',
    [LeadStatus.REPLIED]: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest w-fit shadow-sm ${styles[status]}`}>
      {status.replace('_', ' ')}
    </div>
  );
};

export default App;
