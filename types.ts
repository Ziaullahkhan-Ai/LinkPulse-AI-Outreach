
export enum LeadStatus {
  NEW = 'NEW',
  QUALIFYING = 'QUALIFYING',
  QUALIFIED = 'QUALIFIED',
  DISQUALIFIED = 'DISQUALIFIED',
  READY_FOR_OUTREACH = 'READY_FOR_OUTREACH',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  SENT = 'SENT',
  REPLIED = 'REPLIED'
}

export interface Lead {
  id: string;
  name: string;
  headline: string;
  profileUrl: string;
  company: string;
  location: string;
  recentPost?: string;
  status: LeadStatus;
  score?: number;
  aiReasoning?: string;
  generatedMessage?: string;
  intentLevel?: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

export interface OutreachStats {
  totalLeads: number;
  qualified: number;
  pendingApproval: number;
  sent: number;
  replied: number;
}
