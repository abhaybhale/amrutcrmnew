import React from 'react';
import { DataImportStudioTab } from './DataImportStudioTab';
import { X } from 'lucide-react';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetModule?: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users';
  onNavigateToModule?: (module: string) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  targetModule = 'Leads',
  onNavigateToModule
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Universal Bulk Data Import Wizard</h2>
            <p className="text-xs text-slate-500">
              Ingest records from CSV or Excel spreadsheets with automated mapping or dynamic custom attribute creation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DataImportStudioTab
          initialModule={targetModule}
          onNavigateToModule={(mod) => {
            onClose();
            if (onNavigateToModule) onNavigateToModule(mod);
          }}
        />
      </div>
    </div>
  );
};
