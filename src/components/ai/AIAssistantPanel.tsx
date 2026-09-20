import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { chatWithAssistant, isAIConfigured, ChatTurn } from '../../lib/aiClient';
import { Sparkles, X, Send, Bot, Loader2 } from 'lucide-react';

/**
 * Floating AI assistant, mounted once at the app shell level so it's
 * available from every screen. Grounds Claude with a short live summary of
 * the current user's accessible pipeline so answers are CRM-aware without
 * shipping the whole dataset to the model on every turn.
 */
export const AIAssistantPanel: React.FC = () => {
  const {
    currentUser,
    currentCompany,
    accessibleLeads,
    accessibleOpportunities,
    accessibleQuotes,
    accessibleOrders
  } = useCRM();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, open]);

  const buildContextSummary = () => {
    const openOpps = accessibleOpportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost');
    const pipelineValue = openOpps.reduce((s, o) => s + o.totalValue, 0);
    const breachedLeads = accessibleLeads.filter(l => l.slaStatus === 'SLA Breached').length;
    const pendingQuotes = accessibleQuotes.filter(q => q.status === 'Pending Internal Approval' || q.status === 'Draft').length;
    return [
      `User: ${currentUser.name} (${currentUser.role}) at ${currentCompany.name}.`,
      `Accessible pipeline: ${accessibleLeads.length} leads (${breachedLeads} SLA-breached), ${openOpps.length} open opportunities worth ~${(pipelineValue / 100000).toFixed(1)} lakhs, ${pendingQuotes} quotes pending approval, ${accessibleOrders.length} orders on record.`,
      `Top 5 open opportunities: ${openOpps.slice(0, 5).map(o => `"${o.title}" (${o.stage}, ${(o.totalValue / 100000).toFixed(1)}L)`).join('; ') || 'none'}.`
    ].join('\n');
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: text }];
    setTurns(nextTurns);
    setInput('');
    setLoading(true);

    const result = await chatWithAssistant(nextTurns, buildContextSummary());
    setLoading(false);

    if (result) {
      setTurns(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } else {
      setTurns(prev => [...prev, {
        role: 'assistant',
        content: 'The AI backend isn\'t configured yet in this environment. Once VITE_AI_FUNCTION_URL is set (see SETUP.md), I\'ll be able to answer questions about your pipeline, draft emails, and summarize deals right here.'
      }]);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-600/30 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        title="AI Assistant"
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-gradient-to-r from-indigo-950 to-slate-900 text-white px-4 py-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><Bot className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-bold leading-tight">Amrut CRM Assistant</p>
              <p className="text-[10px] text-indigo-300 leading-tight">{isAIConfigured() ? 'Powered by Claude' : 'AI backend not configured'}</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {turns.length === 0 && (
              <div className="text-center text-slate-400 text-xs pt-10 px-4">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-indigo-300" />
                Ask me about your pipeline, e.g. "Which of my deals are at risk this week?" or "Draft a follow-up email for TCS."
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  t.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200 shadow-xs'
                }`}>
                  {t.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 border-t border-slate-100 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your pipeline..."
              className="flex-1 text-xs bg-slate-100 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button type="submit" disabled={loading || !input.trim()} className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
