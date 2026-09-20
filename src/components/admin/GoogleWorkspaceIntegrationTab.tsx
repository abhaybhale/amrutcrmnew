import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Mail,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Video,
  ShieldCheck,
  LogOut
} from 'lucide-react';

export const GoogleWorkspaceIntegrationTab: React.FC = () => {
  const {
    currentUser,
    currentCompany,
    googleAccount,
    syncedEmails,
    syncedEvents,
    isGoogleSyncing,
    isGoogleOAuthConfigured,
    connectGoogleWorkspace,
    disconnectGoogleWorkspace,
    syncGoogleEmailsNow,
    applyEmailActionToCalendar,
    createCalendarEvent,
    deleteCalendarEvent,
    showToast
  } = useCRM();

  const [activeSubTab, setActiveSubTab] = useState<'emails' | 'calendar' | 'settings'>('emails');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [selectedEmailFilter, setSelectedEmailFilter] = useState<string>('all');

  // Form for quick scheduling
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventAttendee, setNewEventAttendee] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');

  const filteredEmails = syncedEmails.filter(e => {
    if (selectedEmailFilter === 'all') return true;
    if (selectedEmailFilter === 'actionable') return e.extractedAction && e.extractedAction.status === 'Pending';
    if (selectedEmailFilter === 'rfp') return e.category === 'RFP / Quote Request';
    if (selectedEmailFilter === 'meeting') return e.category === 'Meeting Request';
    return true;
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) {
      showToast('Please enter an event title', 'error');
      return;
    }

    createCalendarEvent({
      userId: currentUser.id,
      companyId: currentCompany.id,
      title: newEventTitle,
      description: newEventNotes,
      startDateTime: newEventStart || new Date(Date.now() + 86400000).toISOString(),
      endDateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      location: 'Google Meet Bridge',
      meetLink: 'https://meet.google.com/amr-client-call',
      attendees: [
        { name: currentUser.name, email: currentUser.email, status: 'accepted' },
        ...(newEventAttendee ? [{ name: newEventAttendee, email: newEventAttendee, status: 'needsAction' as const }] : [])
      ],
      createdVia: 'Manual CRM',
      status: 'Scheduled'
    });

    setShowNewEventModal(false);
    setNewEventTitle('');
    setNewEventStart('');
    setNewEventAttendee('');
    setNewEventNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Workspace AI Synchronizer (Gmail &amp; Google Calendar)</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Email Parser &amp; Calendar Scheduling Engine
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Automatically scans inbound client emails for RFP triggers, quote approvals, and meeting dates. Converts emails to scheduled Google Calendar events with one click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {googleAccount.isConnected ? (
              <>
                <button
                  onClick={() => syncGoogleEmailsNow()}
                  disabled={isGoogleSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isGoogleSyncing ? 'animate-spin' : ''}`} />
                  <span>{isGoogleSyncing ? 'Scanning...' : 'Scan Gmail & Calendar Now'}</span>
                </button>
                <button
                  onClick={disconnectGoogleWorkspace}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-red-950 text-slate-300 hover:text-red-300 font-medium text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => connectGoogleWorkspace()}
                disabled={!isGoogleOAuthConfigured}
                title={!isGoogleOAuthConfigured ? 'Set VITE_GOOGLE_OAUTH_CLIENT_ID — see SETUP.md' : undefined}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isGoogleOAuthConfigured ? 'Connect Google Account' : 'Google OAuth Not Configured'}</span>
              </button>
            )}
            <button
              onClick={() => setShowNewEventModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Google Calendar Event</span>
            </button>
          </div>
        </div>

        {!googleAccount.isConnected && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              {isGoogleOAuthConfigured
                ? 'Not connected yet. Click "Connect Google Account" to grant read-only Gmail access and Calendar access via a real Google sign-in popup — no data is synced until you approve it.'
                : 'Real Gmail/Calendar sync needs a Google OAuth client ID. Set VITE_GOOGLE_OAUTH_CLIENT_ID in your .env — see SETUP.md for the exact Google Cloud Console steps.'}
            </span>
          </div>
        )}

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Connected Account</div>
              <div className="text-sm font-bold text-white mt-1">{googleAccount.isConnected ? googleAccount.googleEmail : 'Not connected'}</div>
              <div className={`flex items-center gap-1.5 text-[11px] mt-1 ${googleAccount.isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${googleAccount.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                <span>{googleAccount.isConnected ? `Last synced ${new Date(googleAccount.lastSyncedAt).toLocaleString()}` : 'Awaiting Google sign-in'}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              G
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Actionable Inbound Signals</div>
              <div className="text-xl font-bold text-sky-400 mt-1">{googleAccount.actionableEmailsFound} Emails</div>
              <div className="text-[11px] text-slate-400 mt-1">From {googleAccount.totalEmailsScanned} scanned threads</div>
            </div>
            <Mail className="w-8 h-8 text-sky-400/50" />
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Scheduled Calendar Events</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{syncedEvents.length} Events</div>
              <div className="text-[11px] text-slate-400 mt-1">Synced to Google Calendar</div>
            </div>
            <Calendar className="w-8 h-8 text-emerald-400/50" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveSubTab('emails')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'emails'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Parsed Inbound Client Emails ({syncedEmails.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Google Calendar Schedule ({syncedEvents.length})</span>
          </button>
        </div>

        {activeSubTab === 'emails' && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-slate-400 font-medium">Filter:</span>
            <select
              value={selectedEmailFilter}
              onChange={(e) => setSelectedEmailFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
            >
              <option value="all">All Synced Emails</option>
              <option value="actionable">Actionable / Pending Calendar Invites</option>
              <option value="rfp">RFP &amp; Quote Requests</option>
              <option value="meeting">Meeting Requests</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Synced Emails Feed */}
      {activeSubTab === 'emails' && (
        <div className="space-y-4">
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-sky-300 transition-all space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm">
                    {email.senderName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{email.senderName}</h4>
                      <span className="text-xs text-slate-400">&lt;{email.senderEmail}&gt;</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {email.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Account: <strong className="text-slate-700">{email.accountName || 'Enterprise Lead'}</strong> {email.opportunityTitle && `• Deal: ${email.opportunityTitle}`}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Received {new Date(email.receivedAt).toLocaleString()}
                </div>
              </div>

              {/* Subject & Body Snippet */}
              <div>
                <p className="text-sm font-semibold text-slate-900">{email.subject}</p>
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {email.snippet}
                </p>
              </div>

              {/* Extracted AI Action Recommendation */}
              {email.extractedAction && (
                <div className={`p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 border ${
                  email.extractedAction.status === 'Applied'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-amber-50/80 border-amber-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>AI Signal Detected: {email.extractedAction.actionType}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                          {Math.round(email.extractedAction.confidenceScore * 100)}% Confidence
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {email.extractedAction.suggestedTitle} {email.extractedAction.suggestedDate && `(${new Date(email.extractedAction.suggestedDate).toLocaleString()})`}
                      </p>
                    </div>
                  </div>

                  <div>
                    {email.extractedAction.status === 'Applied' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Action Synced to Calendar</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => applyEmailActionToCalendar(email.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <span>Schedule Event &amp; Sync</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Synced Calendar Events View */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syncedEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-sky-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                        {evt.createdVia}
                      </span>
                      <span className="text-[10px] text-slate-400">ID: {evt.googleEventId}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{evt.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{evt.description}</p>
                  </div>

                  <button
                    onClick={() => deleteCalendarEvent(evt.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove from Calendar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(evt.startDateTime).toLocaleString()}</span>
                  </div>

                  {evt.meetLink && (
                    <div className="flex items-center gap-2 text-sky-600 font-medium">
                      <Video className="w-3.5 h-3.5 text-sky-500" />
                      <a href={evt.meetLink} target="_blank" rel="noreferrer" className="hover:underline">
                        Join Google Meet Call
                      </a>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendees ({evt.attendees.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {evt.attendees.map((att, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                          {att.name || att.email}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Calendar Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Schedule Google Calendar Event</h3>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting / Event Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. HDFC Bank — Jira DC Architecture & Commercial Walkthrough"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={newEventStart}
                  onChange={(e) => setNewEventStart(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client Attendee Email</label>
                <input
                  type="email"
                  value={newEventAttendee}
                  onChange={(e) => setNewEventAttendee(e.target.value)}
                  placeholder="e.g. suresh.menon@hdfcbank.com"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agenda &amp; Discussion Notes</label>
                <textarea
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  placeholder="Scope of discussion, license count, SLA expectations..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
                >
                  Schedule &amp; Send Google Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
