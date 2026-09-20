import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { UserManagementTab } from './UserManagementTab';
import { RoleManagementTab } from './RoleManagementTab';
import { FieldAttributesTab } from './FieldAttributesTab';
import { DataImportStudioTab } from './DataImportStudioTab';
import { CompaniesAdminTab } from './CompaniesAdminTab';
import { ProductCatalogTab } from './ProductCatalogTab';
import {
  Users,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  Building2,
  Package
} from 'lucide-react';

type AdminTabId = 'users' | 'roles' | 'fields' | 'import' | 'companies' | 'products';

interface AdminViewProps {
  initialTab?: AdminTabId;
  onNavigateToModule?: (module: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  initialTab = 'users',
  onNavigateToModule
}) => {
  const { currentUser, allUsers, roles, fieldAttributes, companies, products } = useCRM();
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>(initialTab);

  const isAdminOrMD = currentUser.role === 'CRM Administrator' || currentUser.role === 'Managing Director';
  const isSalesHead = currentUser.role === 'Sales Head';

  const tabs = [
    {
      id: 'users' as const,
      label: 'Users & Personnel',
      icon: Users,
      badge: `${allUsers.length} Staff`,
      description: 'Manage employee accounts, reporting hierarchy, and OOO delegation'
    },
    {
      id: 'roles' as const,
      label: 'User Roles & RBAC',
      icon: ShieldCheck,
      badge: `${roles.length} Roles`,
      description: 'Define authority levels, module privileges, and security permissions'
    },
    {
      id: 'fields' as const,
      label: 'Field Attributes',
      icon: SlidersHorizontal,
      badge: `${fieldAttributes.length} Schemas`,
      description: 'Configure dynamic custom fields, data types, and mandatory rules'
    },
    {
      id: 'import' as const,
      label: 'Bulk Data Import',
      icon: UploadCloud,
      badge: 'CSV / XLS',
      description: 'Ingest leads, opportunities, accounts, and clients with automated mapping'
    },
    // Companies: visible to Admin/MD (full edit) and Sales Head (T&C only)
    ...(isAdminOrMD || isSalesHead
      ? [{
          id: 'companies' as const,
          label: 'Companies & Tax Config',
          icon: Building2,
          badge: `${companies.length} Entities`,
          description: 'Quote letterhead, GST/VAT %, renewal uplift %, and Terms & Conditions'
        }]
      : []),
    // Product Catalog: Admin/MD only
    ...(isAdminOrMD
      ? [{
          id: 'products' as const,
          label: 'Product Catalog',
          icon: Package,
          badge: `${products.length} SKUs`,
          description: 'Manage per-vendor product list prices used across Leads, Opportunities & Quotes'
        }]
      : [])
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Administration &amp; Data Studio</h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Full Admin Suite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally govern staff credentials, user role assignments, dynamic entity field attributes, and universal bulk data ingestion.
          </p>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const isSelected = activeAdminTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-white border-[#0073EA] ring-2 ring-[#0073EA]/20 shadow-sm'
                  : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-[#0073EA] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              </div>

              <div className="mt-3">
                <h3 className={`text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                  {tab.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {tab.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div className="pt-2">
        {activeAdminTab === 'users' && <UserManagementTab />}
        {activeAdminTab === 'roles' && <RoleManagementTab />}
        {activeAdminTab === 'fields' && <FieldAttributesTab />}
        {activeAdminTab === 'import' && (
          <DataImportStudioTab onNavigateToModule={onNavigateToModule} />
        )}
        {activeAdminTab === 'companies' && (isAdminOrMD || isSalesHead) && <CompaniesAdminTab />}
        {activeAdminTab === 'products' && isAdminOrMD && <ProductCatalogTab />}
      </div>
    </div>
  );
};
