import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useCRM } from '../../context/CRMContext';
import { useMarketing } from '../../context/MarketingContext';
import { Campaign, CampaignChannel, DatasetSourceType, MarketingProject, ProjectStatus } from '../../types';
import { generateCampaignCopy, isAIConfigured } from '../../lib/aiClient';
import {
  Megaphone,
  FolderKanban,
  Database,
  Plus,
  TrendingUp,
  Target,
  Users,
  Mail,
  MousePointerClick,
  DollarSign,
  Sparkles,
  Upload,
  CheckCircle2,
  Copy,
  X,
  ArrowRight,
  Wand2
} from 'lucide-react';

const CHANNELS: CampaignChannel[] = ['Email', 'LinkedIn', 'Google Ads', 'Webinar', 'Event / Exhibition', 'Cold Calling', 'WhatsApp', 'SMS', 'Content / SEO', 'Partner / Referral'];
const SOURCE_TYPES: DatasetSourceType[] = ['CSV Upload', 'XLSX Upload', 'LinkedIn Export', 'Trade Show Scan', 'Purchased List', 'Web Form', 'CRM Export'];

const fmtMoney = (n: number, symbol: string) => `${symbol}${(n / 100000).toFixed(1)}L`;

export const MarketingHubView: React.FC = () => {
  const { currentUser, currentCompany, showToast } = useCRM();
  const {
    accessibleProjects,
    accessibleCampaigns,
    accessibleDatasets,
    datasetRecords,
    createProject,
    createCampaign,
    updateCampaignMetrics,
    createDataset,
    convertRecordToLead,
    bulkConvertToLeads,
    getRecordsForDataset
  } = useMarketing();

  const [tab, setTab] = useState<'overview' | 'projects' | 'campaigns' | 'datasets'>('overview');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(null);

  const symbol = currentCompany.currencySymbol;

  const totals = useMemo(() => {
    const budget = accessibleProjects.reduce((s, p) => s + p.budget, 0);
    const spend = accessibleProjects.reduce((s, p) => s + p.spend, 0);
    const leads = accessibleCampaigns.reduce((s, c) => s + c.metrics.leadsGenerated, 0);
    const qualified = accessibleCampaigns.reduce((s, c) => s + c.metrics.qualifiedLeads, 0);
    const revenue = accessibleCampaigns.reduce((s, c) => s + c.metrics.revenueInfluenced, 0);
    const activeCampaigns = accessibleCampaigns.filter(c => c.status === 'Active').length;
    return { budget, spend, leads, qualified, revenue, activeCampaigns };
  }, [accessibleProjects, accessibleCampaigns]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Marketing &amp; Lead-Gen Hub</h1>
            <span className="bg-pink-100 text-pink-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{currentCompany.code}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Projects, campaigns and prospect datasets — from raw list to converted lead.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {(['overview', 'projects', 'campaigns', 'datasets'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold capitalize transition-all ${tab === t ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<DollarSign className="w-4 h-4 text-pink-600" />} label="Budget Utilized" value={`${fmtMoney(totals.spend, symbol)} / ${fmtMoney(totals.budget, symbol)}`} sub={`${accessibleProjects.length} active projects`} />
            <StatCard icon={<Megaphone className="w-4 h-4 text-indigo-600" />} label="Active Campaigns" value={String(totals.activeCampaigns)} sub={`${accessibleCampaigns.length} total campaigns`} />
            <StatCard icon={<Users className="w-4 h-4 text-emerald-600" />} label="Leads Generated" value={String(totals.leads)} sub={`${totals.qualified} qualified (SQL)`} />
            <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-600" />} label="Revenue Influenced" value={fmtMoney(totals.revenue, symbol)} sub="Attributed to marketing-sourced pipeline" />
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Campaign Funnel by Channel</h3>
            <div className="space-y-2.5">
              {accessibleCampaigns.map(c => {
                const convPct = c.metrics.sent > 0 ? Math.round((c.metrics.leadsGenerated / c.metrics.sent) * 100) : 0;
                return (
                  <div key={c.id} className="flex items-center gap-3 text-xs">
                    <span className="w-40 truncate font-semibold text-slate-700">{c.name}</span>
                    <span className="w-24 text-slate-400">{c.channel}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full" style={{ width: `${Math.min(100, convPct || (c.metrics.qualifiedLeads > 0 ? 40 : 4))}%` }} />
                    </div>
                    <span className="w-28 text-right text-slate-500">{c.metrics.leadsGenerated} leads &middot; {c.metrics.qualifiedLeads} SQL</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowProjectModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accessibleProjects.map(p => (
              <ProjectCard key={p.id} project={p} symbol={symbol} campaignCount={accessibleCampaigns.filter(c => c.projectId === p.id).length} />
            ))}
          </div>
        </div>
      )}

      {/* Campaigns */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCampaignModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm">
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          </div>
          <div className="space-y-3">
            {accessibleCampaigns.map(c => (
              <CampaignRow key={c.id} campaign={c} symbol={symbol} onBump={() => updateCampaignMetrics(c.id, { leadsGenerated: c.metrics.leadsGenerated + 1 })} />
            ))}
          </div>
        </div>
      )}

      {/* Datasets */}
      {tab === 'datasets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm">
              <Upload className="w-4 h-4" /> Import Dataset
            </button>
          </div>
          <div className="space-y-3">
            {accessibleDatasets.map(ds => {
              const records = getRecordsForDataset(ds.id);
              const expanded = expandedDatasetId === ds.id;
              const convertibleIds = records.filter(r => r.status !== 'Converted to Lead' && r.status !== 'Duplicate' && r.status !== 'Invalid').map(r => r.id);
              return (
                <div key={ds.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <button onClick={() => setExpandedDatasetId(expanded ? null : ds.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center"><Database className="w-4 h-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ds.name}</p>
                        <p className="text-[11px] text-slate-500">{ds.sourceType} &middot; {ds.totalRecords} records &middot; {ds.duplicateRecords} duplicates &middot; {ds.convertedToLeadsCount} converted</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {convertibleIds.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); const n = bulkConvertToLeads(convertibleIds); showToast(`${n} lead(s) created from "${ds.name}"`, 'success'); }}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          Convert all valid ({convertibleIds.length}) to Leads
                        </button>
                      )}
                      <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50 max-h-80 overflow-y-auto">
                      {records.map(r => (
                        <div key={r.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">{r.contactName} <span className="text-slate-400 font-normal">— {r.companyName}</span></p>
                            <p className="text-slate-500">{r.contactEmail} {r.designation && `• ${r.designation}`}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill status={r.status} />
                            {r.status !== 'Converted to Lead' && r.status !== 'Duplicate' && r.status !== 'Invalid' && (
                              <button onClick={() => convertRecordToLead(r.id)} className="text-[11px] font-bold text-pink-600 hover:underline">Convert &rarr;</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showProjectModal && (
        <NewProjectModal
          onClose={() => setShowProjectModal(false)}
          onCreate={(data) => { createProject(data); setShowProjectModal(false); }}
          currentUser={currentUser}
        />
      )}
      {showCampaignModal && (
        <NewCampaignModal
          onClose={() => setShowCampaignModal(false)}
          onCreate={(data) => { createCampaign(data); setShowCampaignModal(false); }}
          projects={accessibleProjects}
          currentUser={currentUser}
        />
      )}
      {showImportModal && (
        <ImportDatasetModal
          onClose={() => setShowImportModal(false)}
          projects={accessibleProjects}
          onImport={(meta, rows) => { createDataset(meta, rows); setShowImportModal(false); }}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string }> = ({ icon, label, value, sub }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
    <div className="flex items-center justify-between text-slate-400">
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <span className="text-xl font-black text-slate-900 mt-2 block">{value}</span>
    <span className="text-[11px] text-slate-500 font-medium mt-1 block">{sub}</span>
  </div>
);

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'Converted to Lead' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    status === 'Duplicate' || status === 'Invalid' || status === 'Do Not Contact' ? 'bg-rose-50 text-rose-700 border-rose-200' :
    status === 'Enriched' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
    'bg-slate-100 text-slate-700 border-slate-200';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{status}</span>;
};

const ProjectCard: React.FC<{ project: MarketingProject; symbol: string; campaignCount: number }> = ({ project, symbol, campaignCount }) => {
  const pct = project.budget > 0 ? Math.min(100, Math.round((project.spend / project.budget) * 100)) : 0;
  const statusColor: Record<ProjectStatus, string> = {
    Planning: 'bg-slate-100 text-slate-700',
    Active: 'bg-emerald-100 text-emerald-700',
    Paused: 'bg-amber-100 text-amber-700',
    Completed: 'bg-indigo-100 text-indigo-700',
    Archived: 'bg-slate-100 text-slate-500'
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-pink-500" />
            <h4 className="text-sm font-bold text-slate-900">{project.name}</h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{project.code} &middot; Owner: {project.ownerName}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[project.status]}`}>{project.status}</span>
      </div>
      <p className="text-xs text-slate-600">{project.objective}</p>
      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>Budget utilization</span>
          <span>{symbol}{(project.spend / 100000).toFixed(1)}L / {symbol}{(project.budget / 100000).toFixed(1)}L</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {project.targetIndustries.map(ind => (
          <span key={ind} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">{ind}</span>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">{campaignCount} campaign(s) under this project</p>
    </div>
  );
};

const CampaignRow: React.FC<{ campaign: Campaign; symbol: string; onBump: () => void }> = ({ campaign, symbol }) => {
  const statusColor: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700', Scheduled: 'bg-indigo-100 text-indigo-700', Active: 'bg-emerald-100 text-emerald-700',
    Paused: 'bg-amber-100 text-amber-700', Completed: 'bg-slate-200 text-slate-600', Cancelled: 'bg-rose-100 text-rose-700'
  };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center"><Megaphone className="w-4 h-4" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">{campaign.name}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[campaign.status]}`}>{campaign.status}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{campaign.projectName} &middot; {campaign.channel} &middot; Owner: {campaign.ownerName}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <Metric icon={<Mail className="w-3 h-3" />} label="Sent" value={campaign.metrics.sent} />
          <Metric icon={<MousePointerClick className="w-3 h-3" />} label="Clicked" value={campaign.metrics.clicked} />
          <Metric icon={<Target className="w-3 h-3" />} label="Leads" value={campaign.metrics.leadsGenerated} />
          <Metric icon={<TrendingUp className="w-3 h-3" />} label="Revenue" value={`${symbol}${(campaign.metrics.revenueInfluenced / 100000).toFixed(1)}L`} isText />
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: number | string; isText?: boolean }> = ({ icon, label, value, isText }) => (
  <div>
    <div className="flex items-center justify-center gap-1 text-slate-400">{icon}<span className="text-[10px] uppercase font-bold">{label}</span></div>
    <p className="text-sm font-bold text-slate-900">{isText ? value : value}</p>
  </div>
);

// ==========================================================================
// Modals
// ==========================================================================

const NewProjectModal: React.FC<{ onClose: () => void; onCreate: (data: Partial<MarketingProject>) => void; currentUser: any }> = ({ onClose, onCreate, currentUser }) => {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [budget, setBudget] = useState('');
  const [industries, setIndustries] = useState('');

  return (
    <ModalShell title="New Marketing Project" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({
            name,
            objective,
            budget: Number(budget) || 0,
            ownerId: currentUser.id,
            ownerName: currentUser.name,
            targetIndustries: industries.split(',').map(s => s.trim()).filter(Boolean),
            status: 'Planning'
          });
        }}
        className="space-y-4"
      >
        <Field label="Project Name"><input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. DevOps Modernization — FY26" /></Field>
        <Field label="Objective"><textarea value={objective} onChange={e => setObjective(e.target.value)} className="input h-20" placeholder="What does success look like?" /></Field>
        <Field label="Budget (₹)"><input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="input" placeholder="e.g. 500000" /></Field>
        <Field label="Target Industries (comma separated)"><input value={industries} onChange={e => setIndustries(e.target.value)} className="input" placeholder="BFSI, IT Services" /></Field>
        <ModalActions onClose={onClose} submitLabel="Create Project" />
      </form>
    </ModalShell>
  );
};

const NewCampaignModal: React.FC<{ onClose: () => void; onCreate: (data: Partial<Campaign>) => void; projects: MarketingProject[]; currentUser: any }> = ({ onClose, onCreate, projects, currentUser }) => {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [channel, setChannel] = useState<CampaignChannel>('Email');
  const [budget, setBudget] = useState('');
  const [copy, setCopy] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerateCopy = async () => {
    setGenerating(true);
    const result = await generateCampaignCopy({ channel, audience: 'Enterprise IT decision-makers', product: 'Amrut Software OEM solutions', goal: 'Book a discovery call' });
    setGenerating(false);
    if (result) setCopy(result.copy);
    else setCopy('AI copy generation is not configured yet — set VITE_AI_FUNCTION_URL (see SETUP.md). For now, draft your outbound message here.');
  };

  return (
    <ModalShell title="New Campaign" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ name, projectId, channel, budget: Number(budget) || 0, ownerId: currentUser.id, ownerName: currentUser.name, messagingTemplate: copy, status: 'Draft' });
        }}
        className="space-y-4"
      >
        <Field label="Campaign Name"><input required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Q4 LinkedIn Outreach — BFSI" /></Field>
        <Field label="Parent Project">
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Channel">
          <select value={channel} onChange={e => setChannel(e.target.value as CampaignChannel)} className="input">
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Budget (₹)"><input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="input" /></Field>
        <Field label={<span className="flex items-center gap-1.5">Messaging / Copy <Sparkles className="w-3 h-3 text-pink-500" /></span>}>
          <div className="space-y-2">
            <textarea value={copy} onChange={e => setCopy(e.target.value)} className="input h-24" placeholder="Draft your campaign copy, or generate one with AI..." />
            <button type="button" onClick={handleGenerateCopy} disabled={generating} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-pink-600 hover:underline disabled:opacity-50">
              <Wand2 className="w-3.5 h-3.5" /> {generating ? 'Generating with Claude...' : isAIConfigured() ? 'Generate with AI' : 'Generate with AI (needs setup)'}
            </button>
          </div>
        </Field>
        <ModalActions onClose={onClose} submitLabel="Create Campaign" />
      </form>
    </ModalShell>
  );
};

const ImportDatasetModal: React.FC<{ onClose: () => void; projects: MarketingProject[]; onImport: (meta: any, rows: any[]) => void }> = ({ onClose, projects, onImport }) => {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<DatasetSourceType>('CSV Upload');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  const FIELD_ALIASES: Record<string, string[]> = {
    companyName: ['company', 'company name', 'organization', 'account'],
    contactName: ['name', 'contact', 'contact name', 'full name'],
    contactEmail: ['email', 'email address', 'e-mail'],
    contactPhone: ['phone', 'mobile', 'phone number'],
    designation: ['title', 'designation', 'job title'],
    industry: ['industry', 'vertical'],
    city: ['city'],
    country: ['country']
  };

  const mapRow = (row: Record<string, any>) => {
    const lowerRow: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => { lowerRow[k.toLowerCase().trim()] = v; });
    const mapped: Record<string, any> = { raw: row };
    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      for (const alias of aliases) {
        if (lowerRow[alias] !== undefined && lowerRow[alias] !== '') {
          mapped[field] = String(lowerRow[alias]);
          break;
        }
      }
    });
    return mapped;
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => setParsedRows((results.data as Record<string, any>[]).map(mapRow))
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        setParsedRows(json.map(mapRow));
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <ModalShell title="Import Lead-Gen Dataset" onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Dataset Name"><input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. GITEX 2026 Badge Scans" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source Type">
            <select value={sourceType} onChange={e => setSourceType(e.target.value as DatasetSourceType)} className="input">
              {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Link to Project (optional)">
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input">
              <option value="">Unassigned</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-colors">
          <Upload className="w-6 h-6 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">{fileName || 'Click to upload a .csv or .xlsx file'}</span>
          <span className="text-[11px] text-slate-400">Columns auto-map: company, contact name, email, phone, title, industry, city, country</span>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>

        {parsedRows.length > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Parsed {parsedRows.length} rows. Ready to import.
          </div>
        )}

        <ModalActions
          onClose={onClose}
          submitLabel="Import Dataset"
          onSubmit={() => {
            if (!name || parsedRows.length === 0) return;
            onImport({ name, sourceType, fileName, projectId: projectId || undefined }, parsedRows);
          }}
        />
      </div>
    </ModalShell>
  );
};

// ==========================================================================
// Small shared UI helpers
// ==========================================================================

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-xl' : 'max-w-md'} p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="pt-4">{children}</div>
    </div>
  </div>
);

const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
    {children}
  </div>
);

const ModalActions: React.FC<{ onClose: () => void; submitLabel: string; onSubmit?: () => void }> = ({ onClose, submitLabel, onSubmit }) => (
  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
    <button
      type={onSubmit ? 'button' : 'submit'}
      onClick={onSubmit}
      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
    >
      <Copy className="w-3.5 h-3.5 hidden" />
      {submitLabel}
    </button>
  </div>
);
