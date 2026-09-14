/**
 * LabelForge Enterprise Print Automation & Workflow Types
 */

export type TriggerType = 'file-drop' | 'webhook' | 'db-poll' | 'scheduler';

export type ActionType = 
  | 'parse-csv'
  | 'validate-data'
  | 'preflight-check'
  | 'assign-printer'
  | 'execute-print'
  | 'archive-payload'
  | 'send-webhook';

export interface WorkflowNode {
  id: string;
  type: TriggerType | ActionType;
  title: string;
  category: 'trigger' | 'transform' | 'print' | 'post-process';
  config: Record<string, any>;
  enabled: boolean;
  status?: 'idle' | 'running' | 'success' | 'failed';
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  triggerType: TriggerType;
  nodes: WorkflowNode[];
  executionCount: number;
  lastExecuted?: string;
  lastStatus?: 'success' | 'failed';
}

export interface AutomationLog {
  id: string;
  timestamp: string;
  workflowId: string;
  workflowName: string;
  event: string;
  status: 'SUCCESS' | 'ERROR' | 'INFO';
  payloadSummary: string;
  durationMs: number;
}

export interface WorkflowExecutionLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

