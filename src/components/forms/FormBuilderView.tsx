import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { WebFormConfig } from '../../types';
import {
  Code,
  Copy,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Send,
  Globe,
  Layers,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  User
} from 'lucide-react';

export const FormBuilderView: React.FC = () => {
  const { webForms, submitPublicWebLead, vendors } = useCRM();

  const [selectedForm, setSelectedForm] = useState<WebFormConfig>(webForms[0]);
  const [copied, setCopied] = useState(false);

  // Live test submission state
  const [testData, setTestData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    vendorId: vendors[0]?.id || '',
    requirements: ''
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleLiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === testData.vendorId) || vendors[0];
    if (!selectedForm || !vendor) return;
    submitPublicWebLead(selectedForm.id, {
      companyName: testData.companyName,
      contactName: testData.contactPerson,
      contactEmail: testData.email,
      contactPhone: testData.phone,
      vendorId: vendor.id,
      vendorName: vendor.name,
      requirement: testData.requirements
    });

    setSubmittedSuccess(true);
    setTestData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      vendorId: vendors[0]?.id || '',
      requirements: ''
    });

    setTimeout(() => {
      setSubmittedSuccess(false);
    }, 4000);
  };

  const embedCode = selectedForm?.embedCode || '';

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedForm) return <div className="p-6 text-slate-600">No lead capture form is configured.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Public Web Lead Capture Forms</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Inbound Webhooks
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Embeddable HTML snippets, duplicate checking, spam protection, and real-time auto-triage into Amrut CRM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration & Embed Snippet */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Select Active Lead Form</h3>
            <div className="space-y-2">
              {webForms.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => setSelectedForm(wf)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedForm.id === wf.id
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{wf.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                      ID: {wf.id} • Redirect: {wf.redirectUrl || 'Not configured'}
                    </span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Embed Code Widget */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-3xl border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                HTML Embed Snippet
              </span>
              <button
                onClick={copyEmbedCode}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto">
              {embedCode}
            </pre>
          </div>
        </div>

        {/* Right: Live Interactive Form Submission Tester */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Live Lead Form Tester</h3>
              <p className="text-xs text-slate-500">Test submitting a lead directly into Amrut CRM.</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Live Sandbox
            </span>
          </div>

          {submittedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-emerald-900 text-xs animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Success!</strong> Inbound lead captured into database. View it instantly under the <strong>Leads</strong> tab.
              </span>
            </div>
          )}

          <form onSubmit={handleLiveSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Organization Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={testData.companyName}
                onChange={(e) => setTestData({ ...testData, companyName: e.target.value })}
                placeholder="e.g. Acme FinTech Labs Pvt Ltd"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={testData.contactPerson}
                  onChange={(e) => setTestData({ ...testData, contactPerson: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Email Address <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={testData.email}
                  onChange={(e) => setTestData({ ...testData, email: e.target.value })}
                  placeholder="priya@acmefintech.com"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={testData.phone}
                  onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
                  placeholder="+91 98200 12345"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product / OEM Interest</label>
                <select
                  value={testData.vendorId}
                  onChange={(e) => setTestData({ ...testData, vendorId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Project Details / Requirements</label>
              <textarea
                rows={2}
                value={testData.requirements}
                onChange={(e) => setTestData({ ...testData, requirements: e.target.value })}
                placeholder="Describe user tier count, data center vs cloud, migration timeline..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Submit Inbound Web Lead</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
