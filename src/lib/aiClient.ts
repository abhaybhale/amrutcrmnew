import { auth } from './firebase';

// ==========================================================================
// Claude AI client — thin browser-side wrapper around the `aiProxy` Firebase
// Cloud Function (see /functions). The Anthropic API key must never reach
// the browser, so every AI call is proxied through that function.
//
// If VITE_AI_FUNCTION_URL isn't configured (e.g. functions not deployed
// yet), calls resolve to `null` and callers fall back to non-AI behavior —
// the app should never hard-fail because AI is unavailable.
// ==========================================================================

export type AITask =
  | 'score_lead'
  | 'classify_email'
  | 'summarize_thread'
  | 'chat'
  | 'campaign_copy'
  | 'next_best_action';

const AI_FUNCTION_URL: string = (import.meta as any).env?.VITE_AI_FUNCTION_URL || '';

export function isAIConfigured(): boolean {
  return !!AI_FUNCTION_URL;
}

async function callAI<T = any>(task: AITask, payload: any): Promise<T | null> {
  if (!AI_FUNCTION_URL) {
    console.warn(`[aiClient] AI not configured — skipping "${task}" call. Set VITE_AI_FUNCTION_URL (see SETUP.md).`);
    return null;
  }
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return null;
    const res = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ task, payload })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI proxy returned ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[aiClient] "${task}" call failed:`, err);
    return null;
  }
}

export interface LeadScoreResult {
  score: number; // 0-100
  summary: string;
  reasoning: string;
  suggestedActions: string[];
}

export async function scoreLead(lead: Record<string, any>): Promise<LeadScoreResult | null> {
  return callAI<LeadScoreResult>('score_lead', { lead });
}

export interface EmailClassification {
  category: 'RFP / Quote Request' | 'Meeting Request' | 'BANT Signal' | 'Vendor Inquiry' | 'Delivery / Support' | 'General';
  isHighPriority: boolean;
  extractedAction?: {
    actionType: 'Create Calendar Event' | 'Update Stage' | 'Create Task' | 'Log Activity';
    suggestedDate?: string;
    suggestedTitle?: string;
    confidenceScore: number;
  };
}

export async function classifyEmail(email: { subject: string; snippet: string; from: string }): Promise<EmailClassification | null> {
  return callAI<EmailClassification>('classify_email', { email });
}

export async function summarizeThread(messages: { from: string; snippet: string; date: string }[]): Promise<{ summary: string } | null> {
  return callAI<{ summary: string }>('summarize_thread', { messages });
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithAssistant(turns: ChatTurn[], contextSummary: string): Promise<{ reply: string } | null> {
  return callAI<{ reply: string }>('chat', { turns, contextSummary });
}

export async function generateCampaignCopy(brief: { channel: string; audience: string; product: string; goal: string }): Promise<{ copy: string } | null> {
  return callAI<{ copy: string }>('campaign_copy', { brief });
}

export async function suggestNextBestAction(entity: Record<string, any>, entityType: 'Lead' | 'Opportunity'): Promise<{ actions: string[] } | null> {
  return callAI<{ actions: string[] }>('next_best_action', { entity, entityType });
}
