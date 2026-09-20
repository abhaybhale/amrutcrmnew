// ==========================================================================
// Real Gmail + Google Calendar sync, driven directly from the browser using
// the OAuth access token obtained in googleAuth.ts. Uses the plain REST
// endpoints (no client library needed) so no extra bundle weight.
// ==========================================================================

import { SyncedEmailItem, SyncedCalendarEvent } from '../types';
import { classifyEmail } from './aiClient';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary';

async function googleFetch(url: string, accessToken: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google API ${res.status}: ${text}`);
  }
  return res.json();
}

function decodeHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractEmailAddress(fromHeader: string): { name: string; email: string } {
  const match = fromHeader.match(/^(.*?)\s*<(.+)>$/);
  if (match) return { name: match[1].replace(/"/g, '').trim() || match[2], email: match[2].trim() };
  return { name: fromHeader.trim(), email: fromHeader.trim() };
}

// Lightweight local heuristic used before/alongside AI classification, so
// the feature still works even when the AI backend isn't deployed yet.
function heuristicClassify(subject: string, snippet: string): SyncedEmailItem['category'] {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (/\b(rfp|quote|quotation|pricing|proposal)\b/.test(text)) return 'RFP / Quote Request';
  if (/\b(meeting|calendar|schedule|invite|call at|demo)\b/.test(text)) return 'Meeting Request';
  if (/\b(budget|approved|timeline|decision|po |purchase order)\b/.test(text)) return 'BANT Signal';
  if (/\b(oem|vendor|partner portal|reseller)\b/.test(text)) return 'Vendor Inquiry';
  if (/\b(ticket|support|issue|delivery|deployment)\b/.test(text)) return 'Delivery / Support';
  return 'General';
}

export interface GmailSyncOptions {
  accessToken: string;
  companyId: string;
  maxResults?: number;
  afterDays?: number;
  useAI?: boolean;
}

/**
 * Fetches recent Gmail messages, classifies them (AI when available, a
 * keyword heuristic otherwise), and returns them mapped to SyncedEmailItem.
 * Does not write to any state itself — callers merge the results in via
 * CRMContext.ingestSyncedEmails.
 */
export async function syncGmailMessages(opts: GmailSyncOptions): Promise<SyncedEmailItem[]> {
  const { accessToken, maxResults = 20, afterDays = 5, useAI = true } = opts;

  const listUrl = `${GMAIL_API}/messages?maxResults=${maxResults}&q=${encodeURIComponent(`newer_than:${afterDays}d -in:chats -in:sent`)}`;
  const list = await googleFetch(listUrl, accessToken);
  const ids: string[] = (list.messages || []).map((m: any) => m.id);
  if (ids.length === 0) return [];

  const messages = await Promise.all(
    ids.map(async id => {
      try {
        return await googleFetch(
          `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          accessToken
        );
      } catch {
        return null;
      }
    })
  );

  const results: SyncedEmailItem[] = [];
  for (const msg of messages) {
    if (!msg) continue;
    const headers = msg.payload?.headers || [];
    const subject = decodeHeader(headers, 'Subject') || '(no subject)';
    const fromRaw = decodeHeader(headers, 'From');
    const toRaw = decodeHeader(headers, 'To');
    const dateHeader = decodeHeader(headers, 'Date');
    const { name: senderName, email: senderEmail } = extractEmailAddress(fromRaw);
    const { email: recipientEmail } = extractEmailAddress(toRaw);
    const snippet: string = msg.snippet || '';

    let category = heuristicClassify(subject, snippet);
    let isHighPriority = category === 'RFP / Quote Request' || category === 'BANT Signal';
    let extractedAction: SyncedEmailItem['extractedAction'] | undefined;

    if (useAI) {
      const aiResult = await classifyEmail({ subject, snippet, from: fromRaw });
      if (aiResult) {
        category = aiResult.category;
        isHighPriority = aiResult.isHighPriority;
        if (aiResult.extractedAction) {
          extractedAction = { ...aiResult.extractedAction, status: 'Pending' };
        }
      }
    }

    results.push({
      id: 'gmail_' + msg.id,
      senderEmail,
      senderName: senderName || senderEmail,
      recipientEmail,
      subject,
      snippet,
      receivedAt: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
      isHighPriority,
      category,
      extractedAction
    });
  }

  return results;
}

export interface CalendarSyncOptions {
  accessToken: string;
  userId: string;
  companyId: string;
  daysAhead?: number;
  daysBehind?: number;
}

export async function syncCalendarEvents(opts: CalendarSyncOptions): Promise<SyncedCalendarEvent[]> {
  const { accessToken, userId, companyId, daysAhead = 14, daysBehind = 1 } = opts;
  const timeMin = new Date(Date.now() - daysBehind * 86400000).toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString();

  const url = `${CALENDAR_API}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;
  const data = await googleFetch(url, accessToken);
  const items: any[] = data.items || [];

  return items
    .filter(ev => ev.status !== 'cancelled')
    .map(ev => {
      const start = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : new Date().toISOString());
      const end = ev.end?.dateTime || (ev.end?.date ? `${ev.end.date}T23:59:59` : start);
      const attendees = (ev.attendees || []).map((a: any) => ({
        name: a.displayName || a.email,
        email: a.email,
        status: (a.responseStatus === 'accepted' || a.responseStatus === 'declined' || a.responseStatus === 'tentative'
          ? a.responseStatus
          : 'needsAction') as 'accepted' | 'declined' | 'tentative' | 'needsAction'
      }));

      const evt: SyncedCalendarEvent = {
        id: 'gcal_' + ev.id,
        googleEventId: ev.id,
        userId,
        companyId,
        title: ev.summary || '(no title)',
        description: ev.description,
        startDateTime: start,
        endDateTime: end,
        location: ev.location,
        meetLink: ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri,
        attendees,
        createdVia: 'Google Sync',
        status: 'Scheduled'
      };
      return evt;
    });
}

/**
 * Creates a real event on the user's primary Google Calendar (used when the
 * AI-extracted action from an email is "Create Calendar Event" and the user
 * wants it to actually appear on their Google Calendar, not just in-CRM).
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: { title: string; description?: string; startDateTime: string; endDateTime: string; attendeeEmails?: string[] }
): Promise<{ googleEventId: string; meetLink?: string }> {
  const body = {
    summary: event.title,
    description: event.description,
    start: { dateTime: event.startDateTime },
    end: { dateTime: event.endDateTime },
    attendees: (event.attendeeEmails || []).map(email => ({ email })),
    conferenceData: {
      createRequest: { requestId: 'crm-' + Date.now(), conferenceSolutionKey: { type: 'hangoutsMeet' } }
    }
  };
  const data = await googleFetch(`${CALENDAR_API}/events?sendUpdates=all&conferenceDataVersion=1`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return {
    googleEventId: data.id,
    meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri
  };
}
