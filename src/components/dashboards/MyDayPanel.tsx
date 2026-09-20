import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { scoreLead, isAIConfigured } from '../../lib/aiClient';
import {
  Target,
  Briefcase,
  FileText,
  CheckSquare,
  Mail,
  CalendarClock,
  Sparkles,
  Circle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const isTodayOrOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return d.getTime() <= now.getTime();
};

/**
 * "My Day" — the per-salesperson (and per-role) daily work queue: today's
 * new/assigned leads, opportunities needing action, quotes pending, tasks
 * due, top important synced emails, and today's calendar events. Scoped to
 * currentUser + currentCompanyId so switching company or persona re-slices it.
 */
export const MyDayPanel: React.FC = () => {
  const {
    currentUser,
    accessibleLeads,
    accessibleOpportunities,
    accessibleQuotes,
    accessibleTasks,
    syncedEmails,
    syncedEvents,
    completeTask,
    googleAccount,
    isGoogleOAuthConfigured,
    isGoogleSyncing,
    syncGoogleEmailsNow,
    connectGoogleWorkspace
  } = useCRM();

  const myLeadsToday = accessibleLeads.filter(
    l => l.workingSalespersonId === currentUser.id && (isToday(l.createdDate) || isTodayOrOverdue(l.nextActionDate))
  ).slice(0, 5);

  const myOppsNeedingAction = accessibleOpportunities.filter(
    o => o.ownerId === currentUser.id && o.stage !== 'Closed Won' && o.stage !== 'Closed Lost' && isTodayOrOverdue(o.nextActionDate)
  ).slice(0, 5);

  const myQuotesPending = accessibleQuotes.filter(
    q => q.salespersonId === currentUser.id && (q.status === 'Draft' || q.status === 'Pending Internal Approval' || q.status === 'Approved by Sales Manager')
  ).slice(0, 5);

  const myTasksToday = accessibleTasks.filter(
    t => t.assignedToId === currentUser.id && t.status !== 'Completed' && t.status !== 'Cancelled' && isTodayOrOverdue(t.dueDate)
  ).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 6);

  const importantEmails = syncedEmails.filter(e => e.isHighPriority).slice(0, 4);

  const todaysEvents = syncedEvents.filter(e => isToday(e.startDateTime)).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>My Day</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Good to see you, {currentUser.name.split(' ')[0]}</h2>
          <p className="text-slate-400 text-xs mt-0.5">Everything that needs your attention today, in one place.</p>
        </div>

        <div className="flex items-center gap-2">
          {googleAccount.isConnected ? (
            <button
              onClick={() => syncGoogleEmailsNow()}
              disabled={isGoogleSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              {isGoogleSyncing ? 'Syncing Gmail & Calendar...' : 'Sync Gmail & Calendar'}
            </button>
          ) : isGoogleOAuthConfigured ? (
            <button
              onClick={() => connectGoogleWorkspace()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" /> Connect Google Account
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">Google sync not configured (see SETUP.md)</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DaySection icon={<Target className="w-4 h-4 text-emerald-400" />} title="Today's Leads" count={myLeadsToday.length}>
          {myLeadsToday.map(l => (
            <LeadRowWithScore key={l.id} lead={l} />
          ))}
          {myLeadsToday.length === 0 && <EmptyRow text="No new or due leads today" />}
        </DaySection>

        <DaySection icon={<Briefcase className="w-4 h-4 text-purple-400" />} title="Opportunities Needing Action" count={myOppsNeedingAction.length}>
          {myOppsNeedingAction.map(o => (
            <RowItem key={o.id} title={o.title} sub={o.nextAction} tag={o.stage.split('/')[0].trim()} />
          ))}
          {myOppsNeedingAction.length === 0 && <EmptyRow text="Nothing overdue — great pace" />}
        </DaySection>

        <DaySection icon={<FileText className="w-4 h-4 text-blue-400" />} title="Quotes Pending" count={myQuotesPending.length}>
          {myQuotesPending.map(q => (
            <RowItem key={q.id} title={q.quoteNumber} sub={q.accountName} tag={q.status} />
          ))}
          {myQuotesPending.length === 0 && <EmptyRow text="No quotes awaiting action" />}
        </DaySection>

        <DaySection icon={<CheckSquare className="w-4 h-4 text-amber-400" />} title="Tasks Due" count={myTasksToday.length}>
          {myTasksToday.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-1.5 group">
              <button onClick={() => completeTask(t.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                <Circle className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-200 truncate">{t.title}</span>
              </button>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${t.priority === 'Urgent' ? 'bg-rose-500/20 text-rose-300' : t.priority === 'High' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>
                {t.priority}
              </span>
            </div>
          ))}
          {myTasksToday.length === 0 && <EmptyRow text="No tasks due today" />}
        </DaySection>

        <DaySection icon={<Mail className="w-4 h-4 text-sky-400" />} title="Important Emails" count={importantEmails.length}>
          {importantEmails.map(e => (
            <RowItem key={e.id} title={e.subject} sub={e.senderName} tag={e.category} />
          ))}
          {importantEmails.length === 0 && <EmptyRow text={googleAccount.isConnected ? 'No high-priority emails right now' : 'Connect Google to see important emails here'} />}
        </DaySection>

        <DaySection icon={<CalendarClock className="w-4 h-4 text-teal-400" />} title="Today's Calendar" count={todaysEvents.length}>
          {todaysEvents.map(ev => (
            <RowItem
              key={ev.id}
              title={ev.title}
              sub={new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              tag={ev.createdVia === 'Gmail AI Parser' ? 'AI-created' : ev.createdVia}
            />
          ))}
          {todaysEvents.length === 0 && <EmptyRow text="No meetings scheduled today" />}
        </DaySection>
      </div>
    </div>
  );
};

const DaySection: React.FC<{ icon: React.ReactNode; title: string; count: number; children: React.ReactNode }> = ({ icon, title, count, children }) => (
  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">{title}</h4>
      </div>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{count}</span>
    </div>
    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">{children}</div>
  </div>
);

const LeadRowWithScore: React.FC<{ lead: any }> = ({ lead }) => {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScore = async () => {
    setLoading(true);
    const result = await scoreLead(lead);
    setLoading(false);
    setScore(result ? result.score : -1); // -1 = not configured
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-100 truncate">{lead.companyName}</p>
        <p className="text-[10px] text-slate-400 truncate">{lead.contactName}</p>
      </div>
      {score === null ? (
        <button
          onClick={handleScore}
          disabled={loading}
          title={isAIConfigured() ? 'Score this lead with Claude' : 'AI not configured — see SETUP.md'}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 hover:bg-white/20 shrink-0 flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
          AI Score
        </button>
      ) : score === -1 ? (
        <span className="text-[9px] text-slate-500 shrink-0">AI not configured</span>
      ) : (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${score >= 70 ? 'bg-emerald-500/20 text-emerald-300' : score >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
          {score}/100
        </span>
      )}
    </div>
  );
};

const RowItem: React.FC<{ title: string; sub?: string; tag?: string }> = ({ title, sub, tag }) => (
  <div className="flex items-center justify-between gap-2 py-1 group cursor-default">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-100 truncate">{title}</p>
      {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
    </div>
    {tag && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0 max-w-[90px] truncate">{tag}</span>}
  </div>
);

const EmptyRow: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center gap-2 py-2 text-slate-500">
    <CheckCircle2 className="w-3.5 h-3.5" />
    <span className="text-[11px]">{text}</span>
  </div>
);
