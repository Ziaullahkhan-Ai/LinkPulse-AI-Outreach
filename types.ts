
export enum LeadStatus {
  NEW = 'NEW',
  QUALIFYING = 'QUALIFYING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  DISQUALIFIED = 'DISQUALIFIED',
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
  status: LeadStatus;
  score?: number;
  aiReasoning?: string;
  generatedMessage?: string;
  intentLevel?: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

export interface OutreachStats {
  totalLeads: number;
  qualified: number; // Score > 70
  pendingApproval: number;
  sent: number;
  replied: number;
}
