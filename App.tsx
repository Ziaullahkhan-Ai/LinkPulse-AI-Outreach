
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  FileUp, 
  CheckSquare, 
  LayoutDashboard,
  LogOut,
  Bell,
  Search,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  Filter,
  RefreshCw,
  Send,
  MoreVertical,
  MessageCircle,
  X,
  Sparkles,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Lead, LeadStatus, OutreachStats } from './types';
import { scoreLead, generateOutreach, chatWithAssistant } from './services/geminiService';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

const App: React.FC = () => {
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
    localStorage.setItem('linkpulse_leads', JSON.stringify(leads));
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
      alert("AI Qualification failed. Please check your API key.");
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
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
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vercel Edge Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10">
          <div className="relative w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads, companies, or titles..." 
              className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded-2xl py-2.5 pl-12 pr-4 text-sm transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">Outreach Admin</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active Plan</p>
              </div>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-11 h-11 rounded-2xl bg-indigo-50 border-2 border-slate-100 p-0.5 shadow-sm" alt="Avatar" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'dashboard' && <Dashboard stats={stats} />}
            {activeTab === 'leads' && <LeadsExplorer leads={filteredLeads} qualifyLead={qualifyLead} deleteLead={deleteLead} />}
            {activeTab === 'import' && <LeadImporter onImport={handleImport} />}
            {activeTab === 'approval' && <ApprovalQueue leads={leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL)} approve={approveLead} />}
          </div>
        </main>
      </div>

      {/* Floating Chatbot Assistant */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${isChatOpen ? 'w-[450px] h-[650px] scale-100 opacity-100' : 'w-16 h-16 scale-90 opacity-100'}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">LinkPulse Assistant</h3>
                  <p className="text-xs text-indigo-100 opacity-80">AI Strategy Co-pilot</p>
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
                placeholder="Ask about your pipeline strategy..."
                className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 px-5 text-sm outline-none"
              />
              <button 
                onClick={handleChatSend}
                disabled={!chatInput.trim() || isChatTyping}
                className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full h-full bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-200 hover:scale-110 hover:rotate-6 transition-all active:scale-95 group"
          >
            <MessageCircle size={32} className="group-hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard: React.FC<{ stats: OutreachStats }> = ({ stats }) => {
  const chartData = [
    { name: 'Qualified', value: stats.qualified },
    { name: 'Pending', value: stats.pendingApproval },
    { name: 'Sent', value: stats.sent },
    { name: 'Replied', value: stats.replied },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campaign Pulse</h2>
        <p className="text-slate-500 font-medium">Tracking your conversion funnel in real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label="Pipeline Total" value={stats.totalLeads} icon={<Users className="text-blue-600" />} color="blue" />
        <StatCard label="Qualified" value={stats.qualified} icon={<CheckCircle2 className="text-emerald-600" />} color="emerald" />
        <StatCard label="Waiting Approval" value={stats.pendingApproval} icon={<ClockIcon className="text-amber-600" />} color="amber" />
        <StatCard label="Messages Sent" value={stats.sent} icon={<Send className="text-indigo-600" />} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm min-h-[450px] flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-8">Performance Distribution</h3>
          <div className="flex-1">
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
              Growth Intelligence
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Health Score</span>
                <span className="text-emerald-400 font-black">94% Excellent</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Your high-intent leads are responding at twice the industry average. We recommend qualifying 5 more leads today to maintain momentum.
              </p>
            </div>
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40">
            Generate Report <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Sidebar Item Component ---
const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }> = ({ icon, label, active, onClick, count }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-2' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <div className="flex items-center gap-4">
      <span className={active ? 'text-white' : 'text-slate-400'}>{icon}</span>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${active ? 'bg-indigo-400 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
        {count}
      </span>
    )}
  </button>
);

const StatCard: React.FC<{ label: string, value: number | string, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-default">
    <div className={`p-3 bg-${color}-50 w-fit rounded-2xl mb-5 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
    <p className="text-3xl font-black mt-2 text-slate-900">{value}</p>
  </div>
);

// --- Lead Importer Component ---
const LeadImporter: React.FC<{ onImport: (data: any[]) => void }> = ({ onImport }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = () => {
    if (!pasteData.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const lines = pasteData.split('\n').filter(l => l.trim());
      const data = lines.map(line => {
        // Handle common formats: "Name, Company, Title" or just "Name"
        const parts = line.includes(',') ? line.split(',').map(p => p.trim()) : [line];
        return {
          name: parts[0] || 'Unknown',
          company: parts[1] || 'TBD',
          headline: parts[2] || 'Professional',
          recentPost: parts[3] || '',
        };
      });
      onImport(data);
      setPasteData('');
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Expand Your Network</h2>
        <p className="text-slate-500 mt-3 font-medium text-lg">Input your prospect lists and let LinkPulse AI do the heavy lifting.</p>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100">
        <div className="relative group">
          <textarea 
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Format: Name, Company, Headline, Recent Post...&#10;Ex: Sarah Chen, Stripe, VP Engineering, Speaking at WebSummit"
            className="w-full h-80 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] focus:border-indigo-500 focus:bg-white transition-all outline-none font-mono text-sm mb-8 placeholder:text-slate-300 resize-none leading-relaxed"
          />
          {pasteData.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center opacity-40">
               <FileUp size={48} className="mx-auto text-slate-400 mb-4" />
               <p className="text-slate-500 font-bold">Paste lead data or CSV content</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-8">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Supports CSV, Text, and Manual Entry</p>
          <button 
            onClick={handleProcess}
            disabled={!pasteData.trim() || isProcessing}
            className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-base hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {isProcessing ? <RefreshCw size={22} className="animate-spin" /> : <Sparkles size={22} />}
            {isProcessing ? 'Processing...' : 'Run Analysis Engine'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Leads Explorer Component ---
const LeadsExplorer: React.FC<{ leads: Lead[], qualifyLead: (id: string) => void, deleteLead: (id: string) => void }> = ({ leads, qualifyLead, deleteLead }) => (
  <div className="space-y-10 animate-in fade-in duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Pipeline</h2>
        <p className="text-slate-500 font-medium">Manage and qualify your outreach prospects.</p>
      </div>
      <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"><Filter size={18}/> Filters</button>
    </div>

    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <th className="px-8 py-6">Prospect</th>
            <th className="px-8 py-6">AI Prediction</th>
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
                  <h3 className="font-bold text-slate-900 text-lg">No prospects found</h3>
                  <p className="text-sm text-slate-400">Try importing a new list or clearing your search filters.</p>
                </div>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-7">
                  <div className="flex items-center gap-5">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}&backgroundColor=6366f1`} className="w-12 h-12 rounded-2xl border border-slate-100" />
                    <div className="max-w-[300px]">
                      <p className="font-black text-slate-900 text-base">{lead.name}</p>
                      <p className="text-xs font-bold text-indigo-600 mb-0.5">{lead.company}</p>
                      <p className="text-[11px] text-slate-400 truncate font-medium">{lead.headline}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-7">
                  {lead.score ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                        <span className={lead.score > 70 ? 'text-emerald-600' : lead.score > 40 ? 'text-amber-600' : 'text-rose-600'}>
                          {lead.intentLevel} Intent
                        </span>
                        <span className="text-slate-900">{lead.score}%</span>
                      </div>
                      <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${lead.score > 70 ? 'bg-emerald-500' : lead.score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                    </div>
                  ) : <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Waiting for AI...</span>}
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
                        Analyze
                      </button>
                    )}
                    {lead.status === LeadStatus.QUALIFYING && (
                      <RefreshCw size={18} className="animate-spin text-indigo-500 mr-2" />
                    )}
                    <button 
                      onClick={() => deleteLead(lead.id)}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
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

// --- Approval Queue Component ---
const ApprovalQueue: React.FC<{ leads: Lead[], approve: (id: string) => void }> = ({ leads, approve }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-700">
     <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Review Queue</h2>
        <p className="text-slate-500 font-medium">Verify AI-drafted messages before launching.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {leads.length === 0 ? (
          <div className="xl:col-span-2 py-32 text-center bg-white rounded-[40px] border border-slate-200 shadow-sm border-dashed">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto mb-8">
               <CheckCircle2 size={48} />
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Queue Empty</h3>
             <p className="text-slate-400 font-medium">Excellent work! No messages are pending approval.</p>
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}&backgroundColor=6366f1`} className="w-16 h-16 rounded-[24px]" />
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{lead.name}</h3>
                    <p className="text-sm font-bold text-indigo-600">{lead.company}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">{lead.headline}</p>
                  </div>
                </div>
                <div className="text-right p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-lg font-black text-indigo-600 leading-none mb-1">{lead.score}%</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                </div>
              </div>

              <div className="bg-indigo-600/5 p-6 rounded-[24px] text-sm text-indigo-900 border border-indigo-100 mb-8">
                <div className="flex items-center gap-2 mb-3">
                   <Sparkles size={14} className="text-indigo-600" />
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Reasoning</span>
                </div>
                <p className="font-medium italic leading-relaxed">"{lead.aiReasoning}"</p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personalized Outreach</label>
                <textarea 
                  defaultValue={lead.generatedMessage}
                  className="w-full h-44 p-6 text-sm bg-slate-50/50 border border-slate-100 rounded-[28px] focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => approve(lead.id)}
                  className="flex-1 bg-slate-900 text-white font-black py-5 rounded-[24px] hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
                >
                  <Send size={20} /> Approve & Send
                </button>
                <button className="px-6 border border-slate-200 rounded-[24px] hover:bg-slate-50 text-slate-400 transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
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
    [LeadStatus.SENT]: 'bg-emerald-600 text-white shadow-sm',
    [LeadStatus.REPLIED]: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest w-fit shadow-sm ${styles[status]}`}>
      {status.replace('_', ' ')}
    </div>
  );
};

// --- Helper Icons ---
const ClockIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

export default App;
