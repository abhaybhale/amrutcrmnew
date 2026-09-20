import React from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Building2,
  Users,
  FileText,
  ShoppingBag,
  Cpu,
  Boxes,
  GitFork,
  UserCheck,
  ShieldAlert,
  BarChart3,
  Globe2,
  History,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  Zap,
  Award,
  TrendingUp,
  Mail,
  Megaphone,
  Wallet,
  CheckSquare,
  RefreshCw
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'targets'
  | 'forecast'
  | 'leads'
  | 'opportunities'
  | 'accounts'
  | 'contacts'
  | 'quotes'
  | 'orders'
  | 'renewals'
  | 'presales'
  | 'vendors'
  | 'workspace'
  | 'marketing'
  | 'finance'
  | 'tasks'
  | 'workflows'
  | 'users'
  | 'security'
  | 'reports'
  | 'forms'
  | 'audit'
  | 'deliverables';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed = false,
  setCollapsed
}) => {
  const {
    currentUser,
    accessibleLeads,
    accessibleOpportunities,
    accessibleAccounts,
    accessibleQuotes,
    accessibleOrders,
    accessibleRenewals,
    accessiblePresales,
    accessibleTasks,
    vendors
  } = useCRM();

  interface NavItem {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: number | string | null;
    dotColor: string;
    adminOnly?: boolean;
    visibleForRoles?: string[];
  }

  const MARKETING_ROLES = ['Marketing Admin', 'Marketing Manager', 'Marketing Person', 'Lead Gen Admin', 'Lead Gen Manager', 'Lead Gen', 'CRM Administrator', 'Managing Director', 'CRM Coordinator', 'Sales Head'];
  const FINANCE_ROLES = ['Finance & Operations', 'Finance & Commercial Operations', 'Accounts Head', 'Accounts Manager', 'CRM Administrator', 'Managing Director', 'CRM Coordinator'];

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: 'Main Workspace',
      items: [
        {
          id: 'dashboard' as NavigationTab,
          label: 'Executive Dashboards',
          icon: LayoutDashboard,
          badge: null,
          dotColor: 'bg-blue-400'
        },
        {
          id: 'targets' as NavigationTab,
          label: 'Sales Targets & Quotas',
          icon: Award,
          badge: 'Quotas',
          dotColor: 'bg-orange-400'
        },
        {
          id: 'forecast' as NavigationTab,
          label: 'BANT Revenue Forecasts',
          icon: TrendingUp,
          badge: 'Live',
          dotColor: 'bg-indigo-400'
        },
        {
          id: 'leads' as NavigationTab,
          label: 'Leads Pipeline',
          icon: Target,
          badge: accessibleLeads.length,
          dotColor: 'bg-emerald-400'
        },
        {
          id: 'opportunities' as NavigationTab,
          label: 'Opportunities',
          icon: Briefcase,
          badge: accessibleOpportunities.length,
          dotColor: 'bg-purple-400'
        },
        {
          id: 'tasks' as NavigationTab,
          label: 'My Tasks',
          icon: CheckSquare,
          badge: accessibleTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length,
          dotColor: 'bg-amber-400'
        }
      ]
    },
    {
      title: 'Commercial & CPQ',
      items: [
        {
          id: 'quotes' as NavigationTab,
          label: 'CPQ Quotations',
          icon: FileText,
          badge: accessibleQuotes.length,
          dotColor: 'bg-blue-400'
        },
        {
          id: 'orders' as NavigationTab,
          label: 'Orders & Renewals',
          icon: ShoppingBag,
          badge: accessibleOrders.length,
          dotColor: 'bg-teal-400'
        },
        {
          id: 'renewals' as NavigationTab,
          label: 'Renewal Board',
          icon: RefreshCw,
          badge: accessibleRenewals.length,
          dotColor: 'bg-cyan-400'
        },
        {
          id: 'presales' as NavigationTab,
          label: 'Presales & POC Flow',
          icon: Cpu,
          badge: accessiblePresales.length,
          dotColor: 'bg-amber-400'
        }
      ]
    },
    {
      title: 'Customer 360 & Workspace',
      items: [
        {
          id: 'accounts' as NavigationTab,
          label: 'Accounts & Clients',
          icon: Building2,
          badge: accessibleAccounts.length,
          dotColor: 'bg-indigo-400'
        },
        {
          id: 'contacts' as NavigationTab,
          label: 'Contacts Directory',
          icon: Users,
          badge: null,
          dotColor: 'bg-cyan-400'
        },
        {
          id: 'workspace' as NavigationTab,
          label: 'Google Workspace Sync',
          icon: Mail,
          badge: 'Gmail+Cal',
          dotColor: 'bg-sky-400'
        }
      ]
    },
    {
      title: 'Marketing & Lead-Gen',
      items: [
        {
          id: 'marketing' as NavigationTab,
          label: 'Projects, Campaigns & Datasets',
          icon: Megaphone,
          badge: null,
          dotColor: 'bg-pink-400',
          visibleForRoles: MARKETING_ROLES
        }
      ]
    },
    {
      title: 'Finance & Billing',
      items: [
        {
          id: 'finance' as NavigationTab,
          label: 'Invoices, Payments & AR',
          icon: Wallet,
          badge: null,
          dotColor: 'bg-emerald-400',
          visibleForRoles: FINANCE_ROLES
        }
      ]
    },
    {
      title: 'Analytics & Tools',
      items: [
        {
          id: 'reports' as NavigationTab,
          label: 'Custom Report Builder',
          icon: BarChart3,
          badge: null,
          dotColor: 'bg-blue-400'
        },
        {
          id: 'forms' as NavigationTab,
          label: 'Web Lead Capture',
          icon: Globe2,
          badge: null,
          dotColor: 'bg-emerald-400'
        }
      ]
    },
    {
      title: 'Governance & Administration',
      items: [
        {
          id: 'workflows' as NavigationTab,
          label: 'Workflow Engine',
          icon: GitFork,
          badge: null,
          dotColor: 'bg-indigo-400'
        },
        {
          id: 'users' as NavigationTab,
          label: 'User Management',
          icon: UserCheck,
          badge: null,
          adminOnly: true,
          dotColor: 'bg-purple-400'
        },
        {
          id: 'vendors' as NavigationTab,
          label: 'OEM Partners & MDF',
          icon: Boxes,
          badge: vendors.length,
          dotColor: 'bg-rose-400'
        },
        {
          id: 'security' as NavigationTab,
          label: 'Field-Level Security',
          icon: ShieldAlert,
          badge: null,
          adminOnly: true,
          dotColor: 'bg-rose-400'
        },
        {
          id: 'audit' as NavigationTab,
          label: 'Audit Trail Logs',
          icon: History,
          badge: null,
          dotColor: 'bg-amber-400'
        },
        {
          id: 'deliverables' as NavigationTab,
          label: 'System & Architecture',
          icon: FileCode2,
          badge: 'UAT',
          dotColor: 'bg-emerald-400'
        }
      ]
    }
  ];

  return (
    <aside
      className={`relative flex flex-col bg-[#222448] text-gray-200 transition-all duration-300 select-none z-30 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#363963]">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#0073EA] flex items-center justify-center shadow-md font-bold text-white text-base">
              A
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white tracking-tight text-sm">Amrut CRM</span>
                <span className="bg-[#363963] text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  MONOLITH
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Enterprise Suite</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-[#0073EA] flex items-center justify-center font-bold text-white text-base shadow-md">
            A
          </div>
        )}

        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#363963] transition-colors ${
              collapsed ? 'hidden' : 'block'
            }`}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => {
            if (item.adminOnly) {
              return (
                currentUser.role === 'CRM Administrator' ||
                currentUser.role === 'Managing Director' ||
                currentUser.role === 'Sales Head' ||
                currentUser.role === 'Sales Manager'
              );
            }
            if (item.visibleForRoles) {
              return item.visibleForRoles.includes(currentUser.role);
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!collapsed && (
                <div className="text-[10px] uppercase font-bold text-gray-400 px-3 tracking-wider mb-1">
                  {section.title}
                </div>
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-[#363963] text-white shadow-xs'
                        : 'text-gray-400 hover:bg-[#2c2f59] hover:text-white'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-400'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && item.badge !== null && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                          isActive
                            ? 'bg-[#0073EA] text-white'
                            : item.badge === 'UAT'
                            ? 'bg-emerald-900 text-emerald-200 border border-emerald-700/60'
                            : 'bg-[#363963] text-gray-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Context & Footer */}
      <div className="p-3 border-t border-[#363963] bg-[#1d1f3e]">
        {collapsed && setCollapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#363963]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="bg-[#2a2d55] border border-[#363963] rounded-lg p-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-blue-300 font-medium truncate">
                  {currentUser.role}
                </p>
              </div>
            </div>

            {/* If Vendor Head, show assigned OEMs */}
            {currentUser.role === 'Vendor Head' && currentUser.vendorResponsibilities.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#363963] text-[9px] text-amber-300 font-medium">
                <span className="block text-gray-400 text-[8px]">Assigned OEM Scope:</span>
                {currentUser.vendorResponsibilities.map(v => v.replace('v_', '').toUpperCase()).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
