// Shared types
export type ID = string;

export interface User {
  id: ID;
  email: string;
  name?: string;
}

export interface Workspace {
  id: ID;
  name: string;
  ownerId: ID;
}

export interface Meeting {
  id: ID;
  workspaceId: ID;
  title: string;
  transcriptUrl?: string;
  transcriptText?: string;
  calendarEventId?: string;
  createdAt: string;
}

export interface Summary {
  id: ID;
  meetingId: ID;
  content: string;
  createdAt: string;
}

export interface ActionItem {
  id: ID;
  meetingId: ID;
  text: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'done';
}

export interface Integration {
  id: ID;
  workspaceId: ID;
  type: 'slack' | 'notion' | 'google';
  data: Record<string, any>;
}

export interface AuditLog {
  id: ID;
  workspaceId: ID;
  actorId: ID;
  action: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
