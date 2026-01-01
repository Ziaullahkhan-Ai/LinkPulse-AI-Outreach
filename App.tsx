
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  FileUp, 
  CheckSquare, 
  Settings as SettingsIcon,
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
  MoreVertical
} from 'lucide-react';
import { Lead, LeadStatus, OutreachStats } from './types';
import { scoreLead, generateOutreach } from './services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const INITIAL_STATS: OutreachStats = {
  totalLeads: 0,
  qualified: 0,
  pendingApproval: 0,
  sent: 0,
  replied: 0
};

const SAMPLE_DATA = [
  { name: 'Mon', sent: 12, replies: 2 },
  { name: 'Tue', sent: 19, replies: 4 },
  { name: 'Wed', sent: 15, replies: 3 },
  { name: 'Thu', sent: 22, replies: 7 },
  { name: 'Fri', sent: 30, replies: 12 },
  { name: 'Sat', sent: 5, replies: 1 },
  { name: 'Sun', sent: 2, replies: 0 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'import' | 'approval'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<OutreachStats>(INITIAL_STATS);

  // Auto-recalculate stats whenever leads change
  useEffect(() => {
    const newStats: OutreachStats = {
      totalLeads: leads.length,
      qualified: leads.filter(l => l.score && l.score > 70).length,
      pendingApproval: leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL).length,
      sent: leads.filter(l => l.status === LeadStatus.SENT).length,
      replied: leads.filter(l => l.status === LeadStatus.REPLIED).length,
    };
    setStats(newStats);
  }, [leads]);

  const handleImport = (rawLeads: any[]) => {
    const formatted: Lead[] = rawLeads.map(l => ({
      id: Math.random().toString(36).substr(2, 9),
      name: l.name || 'Anonymous',
      headline: l.headline || 'Professional',
      profileUrl: l.url || '#',
      company: l.company || 'Unknown',
      location: l.location || 'Remote',
      recentPost: l.recentPost || '',
      status: LeadStatus.NEW,
      createdAt: new Date().toISOString()
    }));
    setLeads(prev => [...prev, ...formatted]);
    setActiveTab('leads');
  };

  const qualifyLead = async (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.QUALIFYING } : l));

    try {
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
      console.error("Scoring failed", error);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.NEW } : l));
    }
  };

  const approveLead = (id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: LeadStatus.SENT } : l));
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Users className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              LinkPulse AI
            </h1>
          </div>

          <nav className="space-y-1">
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

        <div className="mt-auto p-6 border-t border-slate-100 space-y-4">
          <div className="bg-indigo-50 p-4 rounded-xl">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Hackathon Mode</p>
            <p className="text-sm text-indigo-900 leading-tight">Gemini Decision-Based Engine Active</p>
          </div>
          <button className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors w-full px-2">
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search leads, companies..." 
              className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-full py-2 pl-10 pr-4 text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">Senior Outreach Pro</p>
                <p className="text-xs text-slate-500">Premium Account</p>
              </div>
              <img src="https://picsum.photos/seed/user/40" className="w-10 h-10 rounded-full border border-slate-200" alt="Avatar" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard stats={stats} data={SAMPLE_DATA} />}
          {activeTab === 'leads' && <LeadsExplorer leads={leads} qualifyLead={qualifyLead} />}
          {activeTab === 'import' && <LeadImporter onImport={handleImport} />}
          {activeTab === 'approval' && <ApprovalQueue leads={leads.filter(l => l.status === LeadStatus.WAITING_APPROVAL)} approve={approveLead} />}
        </div>
      </main>
    </div>
  );
};

// --- Sub-Components ---

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, count?: number }> = ({ icon, label, active, onClick, count }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
      <span className="font-semibold text-sm">{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
        {count}
      </span>
    )}
  </button>
);

const Dashboard: React.FC<{ stats: OutreachStats, data: any[] }> = ({ stats, data }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div>
      <h2 className="text-2xl font-bold">Campaign Performance</h2>
      <p className="text-slate-500">Track your high-intent LinkedIn outreach metrics.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard label="Total Leads Ingested" value={stats.totalLeads} icon={<Users className="text-blue-600" />} trend="+12%" />
      <StatCard label="AI Qualified" value={stats.qualified} icon={<CheckCircle2 className="text-emerald-600" />} trend="+8%" />
      <StatCard label="Messages Sent" value={stats.sent} icon={<Send className="text-indigo-600" />} trend="+24%" />
      <StatCard label="Replied / Interested" value={stats.replied} icon={<MessageSquareText className="text-purple-600" />} trend="+5%" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Outreach & Reply Velocity</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSent)" />
              <Area type="monotone" dataKey="replies" stroke="#10b981" strokeWidth={3} fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Intent Breakdown</h3>
        <div className="space-y-6">
          <IntentMetric label="High Intent" percentage={65} color="bg-emerald-500" />
          <IntentMetric label="Medium Intent" percentage={25} color="bg-amber-500" />
          <IntentMetric label="Low Intent" percentage={10} color="bg-slate-300" />
          
          <div className="pt-6 border-t border-slate-100 mt-auto">
            <h4 className="text-sm font-bold mb-2">Key AI Insight</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Leads matching "Chief Technology Officer" and "Founder" keywords are seeing a 40% higher response rate when personalized around recent funding news.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, trend: string }> = ({ label, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <p className="text-slate-500 text-sm font-medium">{label}</p>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

const IntentMetric: React.FC<{ label: string, percentage: number, color: string }> = ({ label, percentage, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1.5">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="text-slate-400">{percentage}%</span>
    </div>
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full`} style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

const LeadImporter: React.FC<{ onImport: (data: any[]) => void }> = ({ onImport }) => {
  const [pasteData, setPasteData] = useState('');

  const handleProcess = () => {
    // Basic parser for Demo
    const lines = pasteData.split('\n').filter(l => l.trim());
    const data = lines.map(line => {
      const parts = line.split(',');
      return {
        name: parts[0]?.trim(),
        company: parts[1]?.trim(),
        headline: parts[2]?.trim(),
        recentPost: parts[3]?.trim(),
      };
    });
    onImport(data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Import Leads</h2>
        <p className="text-slate-500 mt-2">Paste a CSV format or raw list of LinkedIn prospects to begin AI processing.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="flex gap-4 mb-4 text-sm">
          <button className="px-4 py-2 bg-slate-100 rounded-full font-semibold">Paste List</button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-600">Upload CSV</button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-600">Google Sheets Sync</button>
        </div>

        <textarea 
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder="Name, Company, Headline, Recent Post Context..."
          className="w-full h-64 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-mono text-sm mb-6"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Supported: CSV, TXT, JSON</p>
          <button 
            onClick={handleProcess}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            Start Qualification Engine
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadsExplorer: React.FC<{ leads: Lead[], qualifyLead: (id: string) => void }> = ({ leads, qualifyLead }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-2xl font-bold">Leads Explorer</h2>
        <p className="text-slate-500">Manage and manually trigger AI qualification.</p>
      </div>
      <div className="flex gap-2">
        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600"><Filter size={20}/></button>
        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600"><RefreshCw size={20}/></button>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <th className="px-6 py-4">Contact</th>
            <th className="px-6 py-4">AI Score</th>
            <th className="px-6 py-4">Intent</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                No leads imported yet. Head to the Import tab to get started.
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={`https://picsum.photos/seed/${lead.id}/40`} className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all" />
                    <div>
                      <p className="font-bold text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500 truncate w-48">{lead.headline}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {lead.score ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${lead.score > 70 ? 'bg-emerald-500' : lead.score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{lead.score}</span>
                    </div>
                  ) : <span className="text-slate-300">--</span>}
                </td>
                <td className="px-6 py-4">
                  {lead.intentLevel ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      lead.intentLevel === 'High' ? 'bg-emerald-100 text-emerald-700' : 
                      lead.intentLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {lead.intentLevel}
                    </span>
                  ) : <span className="text-slate-300">--</span>}
                </td>
                <td className="px-6 py-4">
                   <StatusBadge status={lead.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  {lead.status === LeadStatus.NEW && (
                    <button 
                      onClick={() => qualifyLead(lead.id)}
                      className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                    >
                      Qualify
                    </button>
                  )}
                  {lead.status === LeadStatus.QUALIFYING && <RefreshCw size={16} className="animate-spin text-indigo-500 inline" />}
                  <button className="ml-2 text-slate-400 hover:text-slate-600"><MoreVertical size={16}/></button>
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
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
     <div>
        <h2 className="text-2xl font-bold">Approval Queue</h2>
        <p className="text-slate-500">Review and approve AI-generated outreach messages.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {leads.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center bg-white rounded-3xl border border-slate-200">
             <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
             <h3 className="text-lg font-bold">All caught up!</h3>
             <p className="text-slate-500">There are no outreach messages pending your approval.</p>
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={`https://picsum.photos/seed/${lead.id}/40`} className="w-10 h-10 rounded-full" />
                  <div>
                    <h3 className="font-bold">{lead.name}</h3>
                    <p className="text-xs text-slate-500">{lead.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-600">Score: {lead.score}</p>
                  <p className="text-[10px] text-slate-400">AI Verified Intent</p>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-xl text-sm italic text-indigo-900 border border-indigo-100">
                <span className="font-bold block mb-1 not-italic text-xs uppercase text-indigo-600">AI Reasoning</span>
                "{lead.aiReasoning}"
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Personalized Message</label>
                <div className="relative">
                  <textarea 
                    defaultValue={lead.generatedMessage}
                    className="w-full h-32 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button className="p-1 hover:bg-slate-200 rounded text-slate-400"><RefreshCw size={14}/></button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => approve(lead.id)}
                  className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Approve & Send
                </button>
                <button className="px-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
                  <XCircle size={18} />
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
    [LeadStatus.NEW]: 'bg-slate-100 text-slate-600',
    [LeadStatus.QUALIFYING]: 'bg-blue-100 text-blue-700 animate-pulse',
    [LeadStatus.QUALIFIED]: 'bg-emerald-100 text-emerald-700',
    [LeadStatus.DISQUALIFIED]: 'bg-red-100 text-red-700',
    [LeadStatus.READY_FOR_OUTREACH]: 'bg-indigo-100 text-indigo-700',
    [LeadStatus.WAITING_APPROVAL]: 'bg-amber-100 text-amber-700',
    [LeadStatus.SENT]: 'bg-purple-100 text-purple-700',
    [LeadStatus.REPLIED]: 'bg-pink-100 text-pink-700',
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default App;
