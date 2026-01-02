
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
  ChevronRight
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

const INITIAL_STATS: OutreachStats = {
  totalLeads: 0,
  qualified: 0,
  pendingApproval: 0,
  sent: 0,
  replied: 0
};

const SAMPLE_DATA = [
  { name: 'Mon', sent: 4, replies: 1 },
  { name: 'Tue', sent: 12, replies: 2 },
  { name: 'Wed', sent: 18, replies: 5 },
  { name: 'Thu', sent: 15, replies: 3 },
  { name: 'Fri', sent: 22, replies: 8 },
  { name: 'Sat', sent: 8, replies: 2 },
  { name: 'Sun', sent: 5, replies: 1 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'import' | 'approval'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('linkpulse_leads');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: "Hello! I'm your LinkPulse AI Assistant. How can I help you manage your outreach today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('linkpulse_leads', JSON.stringify(leads));
  }, [leads]);

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
    return leads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.headline.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const handleImport = (rawLeads: any[]) => {
    const formatted: Lead[] = rawLeads.map(l => ({
      id: Math.random().toString(36).substr(2, 9),
      name: l.name || 'Anonymous',
      headline: l.headline || 'Professional',
      profileUrl: l.url || '#',
      company: l.company || 'N/A',
      location: l.location || 'Remote',
      recentPost: l.recentPost || '',
      status: LeadStatus.NEW,
      createdAt: new Date().toISOString()
    }));
    setLeads(prev => [...prev, ...formatted]);
    setActiveTab('leads');
  };

  const qualifyLead = async (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.QUALIFYING } : l));
    try {
      const lead = leads.find(l => l.id === id);
      if (!lead) return;
      const result = await scoreLead(lead);
      const outreachMsg = result.score > 60 ? await generateOutreach(lead) : '';
      
      setLeads(prev => prev.map(l => l.id === id ? { 
        ...l, 
        score: result.score,
        aiReasoning: result.reasoning,
        intentLevel: result.intent as any,
        status: result.score > 60 ? LeadStatus.WAITING_APPROVAL : LeadStatus.DISQUALIFIED,
        generatedMessage: outreachMsg
      } : l));
    } catch (error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.NEW } : l));
    }
  };

  const approveLead = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.SENT } : l));
  };

  const clearLeads = () => {
    if (confirm("Are you sure you want to clear all lead data?")) {
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
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting to my brain right now." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10 group cursor-default">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">LinkPulse <span className="text-indigo-600">AI</span></h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Outreach Suite</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
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
              label="Lead Importer" 
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
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usage Credits</p>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-slate-700">Gemini 3 Pro</span>
              <span className="text-xs font-bold text-indigo-600">98%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full w-[98%] transition-all duration-1000"></div>
            </div>
          </div>
          <button 
            onClick={clearLeads}
            className="flex items-center gap-3 text-slate-400 hover:text-red-500 transition-colors w-full px-2 text-sm font-semibold"
          >
            <XCircle size={18} />
            <span>Reset Database</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10">
          <div className="relative w-[450px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads by name, company, or job title..." 
              className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded-2xl py-2.5 pl-12 pr-4 text-sm transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white animate-pulse"></span>
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Alex Mitchell</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Growth Lead</p>
              </div>
              <div className="relative">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" className="w-11 h-11 rounded-2xl bg-indigo-50 border-2 border-slate-100 p-0.5 shadow-sm" alt="Avatar" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'dashboard' && <Dashboard stats={stats} data={SAMPLE_DATA} />}
            {activeTab === 'leads' && <LeadsExplorer leads={filteredLeads} qualifyLead={qualifyLead} />}
            {activeTab === 'import' && <LeadImporter onImport={handleImport} />}
            {activeTab === 'approval' && <ApprovalQueue leads={leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL)} approve={approveLead} />}
          </div>
        </main>
      </div>

      {/* Floating Chatbot Assistant */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${isChatOpen ? 'w-[400px] h-[600px] scale-100 opacity-100' : 'w-16 h-16 scale-90 opacity-100'}`}>
        {isChatOpen ? (
          <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">LinkPulse Assistant</h3>
                  <p className="text-[10px] text-indigo-100 opacity-80">AI Sales Co-pilot</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
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
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask about your leads..."
                className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 rounded-xl py-2 px-4 text-sm outline-none"
              />
              <button 
                onClick={handleChatSend}
                disabled={!chatInput.trim()}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full h-full bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 hover:scale-110 hover:rotate-6 transition-all active:scale-95 group"
          >
            <MessageCircle size={30} className="group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce">1</div>
          </button>
        )}
      </div>
    </div>
  );
};

// --- Helper Components ---

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }> = ({ icon, label, active, onClick, count }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 translate-x-1' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <div className="flex items-center gap-4">
      <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 transition-colors'}>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center ${active ? 'bg-indigo-400 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
        {count}
      </span>
    )}
  </button>
);

const Dashboard: React.FC<{ stats: OutreachStats, data: any[] }> = ({ stats, data }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campaign Pulse</h2>
        <p className="text-slate-500 font-medium">Monitoring real-time performance of your AI outreach strategy.</p>
      </div>
      <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          {[1, 2, 3].map(i => (
            <img key={i} src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${i}`} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" />
          ))}
        </div>
        <p className="text-xs font-bold text-slate-600">3 Experts Online</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard label="Pipeline Total" value={stats.totalLeads} icon={<Users className="text-blue-600" />} color="blue" />
      <StatCard label="Qualified by AI" value={stats.qualified} icon={<CheckCircle2 className="text-emerald-600" />} color="emerald" />
      <StatCard label="Messages Sent" value={stats.sent} icon={<Send className="text-indigo-600" />} color="indigo" />
      <StatCard label="Response Rate" value={stats.sent > 0 ? `${Math.round((stats.replied/stats.sent)*100)}%` : '0%'} icon={<MessageSquareText className="text-purple-600" />} color="purple" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-900">Conversion Velocity</h3>
          <div className="flex gap-2">
            <button className="text-xs font-bold bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg">Week</button>
            <button className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg">Month</button>
          </div>
        </div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: '800' }}
              />
              <Area type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSent)" />
              <Area type="monotone" dataKey="replies" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReplies)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
          <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            AI Summary
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Your outreach to <span className="text-white font-bold italic">Software Engineers</span> in the <span className="text-white font-bold italic">Fintech</span> sector is performing 3.4x better than average.
          </p>
          <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl border border-white/20 transition-all text-sm flex items-center justify-center gap-2">
            View Analysis <ChevronRight size={16} />
          </button>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Lead Quality</h3>
          <div className="space-y-6">
            <IntentMetric label="Verified ICP" percentage={78} color="bg-indigo-600" />
            <IntentMetric label="Recent Activity" percentage={45} color="bg-amber-500" />
            <IntentMetric label="Low Fit" percentage={22} color="bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string, value: number | string, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-7 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
    <div className={`p-3 bg-${color}-50 w-fit rounded-2xl mb-5 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
    <p className="text-3xl font-black mt-2 text-slate-900">{value}</p>
  </div>
);

const IntentMetric: React.FC<{ label: string, percentage: number, color: string }> = ({ label, percentage, color }) => (
  <div>
    <div className="flex justify-between text-xs font-bold mb-2">
      <span className="text-slate-700">{label}</span>
      <span className="text-slate-400">{percentage}%</span>
    </div>
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

const LeadImporter: React.FC<{ onImport: (data: any[]) => void }> = ({ onImport }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const lines = pasteData.split('\n').filter(l => l.trim());
      const data = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        // Simple mapping: Name, Company, Title, Context
        return {
          name: parts[0] || 'N/A',
          company: parts[1] || 'N/A',
          headline: parts[2] || 'Professional',
          recentPost: parts[3] || '',
        };
      });
      onImport(data);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Expand Your Pipeline</h2>
        <p className="text-slate-500 mt-3 font-medium text-lg">Bring in fresh prospects from LinkedIn to start the AI engine.</p>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100">
        <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
          <button className="px-6 py-2.5 bg-white shadow-sm rounded-xl font-bold text-sm text-indigo-600">Manual Paste</button>
          <button className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-colors">Google Sheet</button>
          <button className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-colors">Apollo Sync</button>
        </div>

        <div className="relative group">
          <textarea 
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Elon Musk, Tesla, CEO, Building Mars ships...&#10;Jensen Huang, NVIDIA, CEO, Creating AI future..."
            className="w-full h-80 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] focus:border-indigo-500 focus:bg-white transition-all outline-none font-mono text-sm mb-8 placeholder:text-slate-300 resize-none"
          />
          {pasteData.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
               <FileUp size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-bold">Paste CSV data here</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Processing Engine</p>
              <p className="text-sm font-bold text-slate-700">Gemini Lead Analysis v2.1</p>
            </div>
          </div>
          <button 
            onClick={handleProcess}
            disabled={!pasteData.trim() || isProcessing}
            className="px-10 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            {isProcessing ? 'Analyzing Data...' : 'Start AI Qualification'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadsExplorer: React.FC<{ leads: Lead[], qualifyLead: (id: string) => void }> = ({ leads, qualifyLead }) => (
  <div className="space-y-10 animate-in fade-in duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Leads Database</h2>
        <p className="text-slate-500 font-medium">Refining and managing your outreach prospects.</p>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"><Filter size={18}/> Filters</button>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"><Sparkles size={18}/> Bulk Action</button>
      </div>
    </div>

    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <th className="px-8 py-5">Prospect Information</th>
            <th className="px-8 py-5">AI Predictor</th>
            <th className="px-8 py-5">Status</th>
            <th className="px-8 py-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-8 py-20 text-center">
                <div className="max-w-xs mx-auto">
                  <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5 text-slate-300">
                    <Search size={32} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">No leads found</h3>
                  <p className="text-sm text-slate-400">Try importing some data or adjusting your search filters.</p>
                </div>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} className="w-12 h-12 rounded-2xl bg-indigo-50 border border-slate-100 transition-transform group-hover:scale-110" />
                    <div className="max-w-[300px]">
                      <p className="font-black text-slate-900">{lead.name}</p>
                      <p className="text-xs font-bold text-indigo-600 mb-1">{lead.company}</p>
                      <p className="text-[11px] text-slate-400 truncate font-medium">{lead.headline}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  {lead.score ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                        <span className={lead.score > 70 ? 'text-emerald-600' : lead.score > 40 ? 'text-amber-600' : 'text-red-600'}>
                          {lead.intentLevel} Intent
                        </span>
                        <span className="text-slate-900">{lead.score}%</span>
                      </div>
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${lead.score > 70 ? 'bg-emerald-500' : lead.score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                    </div>
                  ) : <span className="text-[10px] font-bold text-slate-300 uppercase italic">Pending AI analysis</span>}
                </td>
                <td className="px-8 py-6">
                   <StatusBadge status={lead.status} />
                </td>
                <td className="px-8 py-6 text-right">
                  {lead.status === LeadStatus.NEW && (
                    <button 
                      onClick={() => qualifyLead(lead.id)}
                      className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      Analyze
                    </button>
                  )}
                  {lead.status === LeadStatus.QUALIFYING && (
                    <div className="flex items-center gap-2 justify-end text-indigo-600">
                      <RefreshCw size={16} className="animate-spin" />
                      <span className="text-xs font-black uppercase tracking-widest">AI Hub</span>
                    </div>
                  )}
                  {lead.status !== LeadStatus.QUALIFYING && lead.status !== LeadStatus.NEW && (
                    <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"><MoreVertical size={18}/></button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const ApprovalQueue: React.FC<{ leads: Lead[], approve: (id: string) => void }> = ({ leads, approve }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-700">
     <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Message Approval Queue</h2>
        <p className="text-slate-500 font-medium">Verify AI-drafted messages before they land in LinkedIn inboxes.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {leads.length === 0 ? (
          <div className="xl:col-span-2 py-32 text-center bg-white rounded-[40px] border border-slate-200 shadow-sm">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
               <CheckCircle2 size={48} />
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Zero Friction Pipeline</h3>
             <p className="text-slate-400 font-medium">No messages are currently waiting for your human touch.</p>
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col group transition-all hover:-translate-y-2">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} className="w-16 h-16 rounded-3xl bg-indigo-50 border-2 border-slate-50 p-0.5 shadow-sm" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-2xl border-4 border-white"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{lead.name}</h3>
                    <p className="text-sm font-bold text-indigo-600">{lead.company}</p>
                    <p className="text-xs text-slate-400 font-medium">{lead.headline}</p>
                  </div>
                </div>
                <div className="text-right p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-lg font-black text-indigo-600 leading-none mb-1">{lead.score}%</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match</p>
                </div>
              </div>

              <div className="bg-indigo-600/5 p-6 rounded-[24px] text-sm text-indigo-900 border border-indigo-100 mb-8 relative">
                <div className="absolute -top-3 left-6 bg-white border border-indigo-100 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Insight</div>
                <p className="font-medium italic leading-relaxed">"{lead.aiReasoning}"</p>
              </div>

              <div className="flex-1 space-y-3 mb-8">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Crafted Message</label>
                  <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Regenerate</button>
                </div>
                <div className="relative h-full">
                  <textarea 
                    defaultValue={lead.generatedMessage}
                    className="w-full h-40 p-6 text-sm bg-slate-50/50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all font-medium leading-relaxed resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => approve(lead.id)}
                  className="flex-1 bg-slate-900 text-white font-black py-4 rounded-[20px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                >
                  <Send size={18} className="rotate-12" /> Send Message
                </button>
                <button className="px-5 border border-slate-200 rounded-[20px] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all text-slate-400">
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
    [LeadStatus.QUALIFYING]: 'bg-indigo-100 text-indigo-600',
    [LeadStatus.QUALIFIED]: 'bg-emerald-100 text-emerald-600',
    [LeadStatus.DISQUALIFIED]: 'bg-rose-100 text-rose-600',
    [LeadStatus.READY_FOR_OUTREACH]: 'bg-indigo-500 text-white',
    [LeadStatus.WAITING_APPROVAL]: 'bg-amber-100 text-amber-700',
    [LeadStatus.SENT]: 'bg-emerald-600 text-white',
    [LeadStatus.REPLIED]: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit shadow-sm ${styles[status]}`}>
      {status.replace('_', ' ')}
    </div>
  );
};

export default App;
