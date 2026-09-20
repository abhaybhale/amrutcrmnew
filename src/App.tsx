import React, { useEffect, useState } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { MarketingProvider } from './context/MarketingContext';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboards/DashboardView';
import { TargetsDashboard } from './components/dashboards/TargetsDashboard';
import { ForecastingDashboard } from './components/dashboards/ForecastingDashboard';
import { GoogleWorkspaceIntegrationTab } from './components/admin/GoogleWorkspaceIntegrationTab';
import { LeadsView } from './components/leads/LeadsView';
import { OpportunitiesView } from './components/opportunities/OpportunitiesView';
import { QuotesView } from './components/quotes/QuotesView';
import { OrdersView } from './components/orders/OrdersView';
import { RenewalBoard } from './components/renewals/RenewalBoard';
import { AccountsView } from './components/accounts/AccountsView';
import { ContactsView } from './components/contacts/ContactsView';
import { PresalesPOCView } from './components/presales/PresalesPOCView';
import { VendorsView } from './components/vendors/VendorsView';
import { WorkflowEngineView } from './components/workflow/WorkflowEngineView';
import { CustomReportBuilderView } from './components/reports/CustomReportBuilderView';
import { FormBuilderView } from './components/forms/FormBuilderView';
import { UserManagementView } from './components/users/UserManagementView';
import { FieldSecurityView } from './components/security/FieldSecurityView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { DeliverablesView } from './components/deliverables/DeliverablesView';
import { AuthScreen } from './components/auth/AuthScreen';
import { MarketingHubView } from './components/marketing/MarketingHubView';
import { FinanceView } from './components/finance/FinanceView';
import { TasksView } from './components/tasks/TasksView';
import { AIAssistantPanel } from './components/ai/AIAssistantPanel';
import { X, ArrowLeft } from 'lucide-react';

// Human-readable labels for the "Back to X" affordance — mirrors the
// Sidebar's own nav labels so the back button reads naturally.
const TAB_LABELS: Record<NavigationTab, string> = {
  dashboard: 'Executive Dashboard',
  targets: 'Sales Targets & Quotas',
  forecast: 'BANT Revenue Forecasts',
  leads: 'Leads Pipeline',
  opportunities: 'Opportunities',
  tasks: 'My Tasks',
  quotes: 'CPQ Quotations',
  orders: 'Orders & Renewals',
  renewals: 'Renewal Board',
  presales: 'Presales & POC Flow',
  accounts: 'Accounts & Clients',
  contacts: 'Contacts Directory',
  vendors: 'OEM Partners & MDF',
  workspace: 'Google Workspace Sync',
  marketing: 'Marketing Hub',
  finance: 'Finance & Billing',
  reports: 'Custom Report Builder',
  forms: 'Web Lead Capture',
  workflows: 'Workflow Engine',
  users: 'User Management',
  security: 'Field-Level Security',
  audit: 'Audit Trail Logs',
  deliverables: 'System & Architecture'
};

const readTabFromUrl = (): NavigationTab => {
  const tab = new URLSearchParams(window.location.search).get('page');
  return tab && Object.prototype.hasOwnProperty.call(TAB_LABELS, tab)
    ? tab as NavigationTab
    : 'dashboard';
};

const writeTabToUrl = (tab: NavigationTab) => {
  const url = new URL(window.location.href);
  if (tab === 'dashboard') url.searchParams.delete('page');
  else url.searchParams.set('page', tab);
  window.history.pushState({ tab }, '', url);
};

const canOpenTab = (tab: NavigationTab, role: string): boolean => {
  if (tab === 'users' || tab === 'security') return role === 'CRM Administrator' || role === 'Managing Director';
  if (tab === 'marketing') return ['Marketing Admin', 'Marketing Manager', 'Marketing Person', 'Lead Gen Admin', 'Lead Gen Manager', 'Lead Gen', 'CRM Administrator', 'Managing Director', 'CRM Coordinator', 'Sales Head'].includes(role);
  if (tab === 'finance') return ['Finance & Operations', 'Finance & Commercial Operations', 'Accounts Head', 'Accounts Manager', 'CRM Administrator', 'Managing Director', 'CRM Coordinator'].includes(role);
  return true;
};

const MainLayout: React.FC = () => {
  const { isAuthenticated, isAuthResolved, isDataLoading, currentUser, toasts, removeToast } = useCRM();
  const [activeTab, setActiveTabRaw] = useState<NavigationTab>(readTabFromUrl);
  const [tabHistory, setTabHistory] = useState<NavigationTab[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const restoreTab = () => {
      setActiveTabRaw(readTabFromUrl());
      setTabHistory([]);
    };
    window.addEventListener('popstate', restoreTab);
    return () => window.removeEventListener('popstate', restoreTab);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isDataLoading || canOpenTab(activeTab, currentUser.role)) return;
    setActiveTabRaw('dashboard');
    setTabHistory([]);
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    window.history.replaceState({ tab: 'dashboard' }, '', url);
  }, [activeTab, currentUser.role, isAuthenticated, isDataLoading]);

  // Manual navigation (Sidebar click, Header shortcut) starts a fresh
  // "trail" — it doesn't count as a drill-down, so it clears history.
  const setActiveTab = (tab: NavigationTab) => {
    if (!canOpenTab(tab, currentUser.role)) return;
    setTabHistory([]);
    setActiveTabRaw(tab);
    if (tab !== activeTab) writeTabToUrl(tab);
  };

  // Drill-down navigation (e.g. clicking a Dashboard stat tile) — pushes
  // the current tab onto the history stack so "Back" can return to it.
  const navigateTo = (tab: NavigationTab) => {
    if (!canOpenTab(tab, currentUser.role)) return;
    setTabHistory(prev => [...prev, activeTab]);
    setActiveTabRaw(tab);
    if (tab !== activeTab) writeTabToUrl(tab);
  };

  const handleGoBack = () => {
    if (tabHistory.length === 0) return;
    const previousTab = tabHistory[tabHistory.length - 1];
    setTabHistory(prev => prev.slice(0, -1));
    setActiveTabRaw(previousTab);
    writeTabToUrl(previousTab);
  };

  // Firebase Auth resolves the "is anyone already signed in?" question
  // asynchronously on first load — briefly show a neutral loading screen
  // instead of flashing the sign-in form for an already-authenticated user.
  if (!isAuthResolved) {
    return (
      <div className="min-h-screen w-full bg-[#111328] flex items-center justify-center text-gray-400 text-sm">
        Loading Amrut CRM…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        {/* Floating Toast Notification Stack */}
        <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between space-x-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
                toast.type === 'success'
                  ? 'bg-emerald-950 text-emerald-100 border-emerald-800 shadow-emerald-900/20'
                  : toast.type === 'warning'
                  ? 'bg-amber-950 text-amber-100 border-amber-800 shadow-amber-900/20'
                  : toast.type === 'error'
                  ? 'bg-rose-950 text-rose-100 border-rose-800 shadow-rose-900/20'
                  : 'bg-gray-900 text-gray-100 border-gray-800'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F5F6F8] flex items-center justify-center text-gray-500 text-sm">
        Syncing your workspace…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6F8] font-sans text-gray-800 antialiased">
      {/* Sleek Sidebar with #222448 Background */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Global Sleek Header */}
        <Header setActiveTab={setActiveTab} />

        {/* Dynamic Content Container */}
        <main className="flex-1 overflow-y-auto bg-[#F5F6F8]">
          {/* Drill-down "Back" affordance — only shown after navigating in
              from somewhere (e.g. a clicked Dashboard stat tile). */}
          {tabHistory.length > 0 && (
            <div className="px-6 pt-4">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#0073EA] hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-200 rounded-lg px-3 py-1.5 shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to {TAB_LABELS[tabHistory[tabHistory.length - 1]]}</span>
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardView onNavigate={navigateTo} />}
          {activeTab === 'targets' && <div className="p-6 max-w-7xl mx-auto"><TargetsDashboard /></div>}
          {activeTab === 'forecast' && <div className="p-6 max-w-7xl mx-auto"><ForecastingDashboard /></div>}
          {activeTab === 'leads' && <LeadsView />}
          {activeTab === 'opportunities' && <OpportunitiesView />}
          {activeTab === 'quotes' && <QuotesView />}
          {activeTab === 'orders' && <OrdersView />}
          {activeTab === 'renewals' && <RenewalBoard />}
          {activeTab === 'accounts' && <AccountsView />}
          {activeTab === 'contacts' && <ContactsView />}
          {activeTab === 'presales' && <PresalesPOCView />}
          {activeTab === 'vendors' && <VendorsView />}
          {activeTab === 'workspace' && <div className="p-6 max-w-7xl mx-auto"><GoogleWorkspaceIntegrationTab /></div>}
          {activeTab === 'marketing' && <MarketingHubView />}
          {activeTab === 'finance' && <FinanceView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'workflows' && <WorkflowEngineView />}
          {activeTab === 'reports' && <CustomReportBuilderView />}
          {activeTab === 'forms' && <FormBuilderView />}
          {activeTab === 'users' && <UserManagementView />}
          {activeTab === 'security' && <FieldSecurityView />}
          {activeTab === 'audit' && <AuditTrailView />}
          {activeTab === 'deliverables' && <DeliverablesView />}
        </main>
      </div>

      <AIAssistantPanel />
    </div>
  );
};

export default function App() {
  return (
    <CRMProvider>
      <MarketingProvider>
        <FinanceProvider>
          <MainLayout />
        </FinanceProvider>
      </MarketingProvider>
    </CRMProvider>
  );
}
