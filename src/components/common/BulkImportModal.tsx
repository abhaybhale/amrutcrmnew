import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { FieldAttribute, FieldAttributeType, FieldMapping, ImportResult } from '../../types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  Download,
  Check,
  X,
  Table,
  Layers,
  HelpCircle,
  Users,
  ShieldCheck,
  Zap,
  PlusCircle,
  Settings2,
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModule?: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users';
  onImportComplete?: (result: ImportResult) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  initialModule = 'Leads',
  onImportComplete
}) => {
  const { fieldAttributes, importDataBatch, showToast } = useCRM();

  const [selectedModule, setSelectedModule] = useState<'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users'>(initialModule);
  const [importMode, setImportMode] = useState<'automatic' | 'manual'>('automatic');
  const [autoGenerateCustomFields, setAutoGenerateCustomFields] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'mapping' | 'importing' | 'complete' | 'error'>('upload');

  // Live Import Progress States
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('Initializing import...');
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File parsing states
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<Set<number>>(new Set());
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedModule(initialModule);
      setActiveStep('upload');
      setErrorMessage(null);
      setProgressPercent(0);
    }
  }, [isOpen, initialModule]);

  if (!isOpen) return null;

  // Standard Target Fields based on Module
  const getStandardFieldsForModule = (mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users') => {
    switch (mod) {
      case 'Leads':
        return [
          { key: 'companyName', label: 'Company Name' },
          { key: 'contactName', label: 'Contact Name' },
          { key: 'contactEmail', label: 'Contact Email' },
          { key: 'contactPhone', label: 'Contact Phone' },
          { key: 'designation', label: 'Designation' },
          { key: 'city', label: 'City' },
          { key: 'country', label: 'Country' },
          { key: 'expectedValue', label: 'Expected Deal Value' },
          { key: 'source', label: 'Lead Source' },
          { key: 'subSource', label: 'Sub-Source' },
          { key: 'product', label: 'Product / Solution' },
          { key: 'requirement', label: 'Requirement Summary' },
          { key: 'priority', label: 'Priority Level' },
          { key: 'territory', label: 'Territory' },
          { key: 'notes', label: 'Notes' }
        ];
      case 'Opportunities':
        return [
          { key: 'title', label: 'Opportunity Title' },
          { key: 'accountName', label: 'Account / Client Name' },
          { key: 'primaryContactName', label: 'Primary Contact' },
          { key: 'totalValue', label: 'Total Deal Value' },
          { key: 'stage', label: 'Pipeline Stage' },
          { key: 'expectedCloseDate', label: 'Expected Close Date' },
          { key: 'probability', label: 'Probability %' },
          { key: 'product', label: 'Focus Product' },
          { key: 'source', label: 'Lead Source' },
          { key: 'notes', label: 'Deal Notes' }
        ];
      case 'Accounts':
        return [
          { key: 'name', label: 'Account / Organization Name' },
          { key: 'industry', label: 'Industry Vertical' },
          { key: 'tier', label: 'Tier (Tier-1, Tier-2, Growth)' },
          { key: 'city', label: 'City' },
          { key: 'country', label: 'Country' },
          { key: 'website', label: 'Website URL' },
          { key: 'annualRevenue', label: 'Annual Revenue' },
          { key: 'employeeCount', label: 'Employee Count' },
          { key: 'phone', label: 'Corporate Phone' }
        ];
      case 'Contacts':
        return [
          { key: 'name', label: 'Contact Full Name' },
          { key: 'accountName', label: 'Associated Account Name' },
          { key: 'email', label: 'Email Address' },
          { key: 'phone', label: 'Phone / Landline' },
          { key: 'mobile', label: 'Mobile Number' },
          { key: 'designation', label: 'Job Title / Designation' },
          { key: 'department', label: 'Department' },
          { key: 'roleInBuying', label: 'Role in Buying Decision' },
          { key: 'city', label: 'City' },
          { key: 'notes', label: 'Contact Notes' }
        ];
      case 'Users':
        return [
          { key: 'name', label: 'Full Staff Name' },
          { key: 'employeeId', label: 'Employee ID' },
          { key: 'email', label: 'Work Email' },
          { key: 'mobile', label: 'Mobile Phone' },
          { key: 'role', label: 'System Role' },
          { key: 'department', label: 'Department' },
          { key: 'territory', label: 'Territory' },
          { key: 'reportingManagerName', label: 'Reporting Manager' },
          { key: 'backupUserName', label: 'Backup User' }
        ];
    }
  };

  // Guess best match for standard fields
  const guessTargetField = (header: string, mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users'): { field: string; isDynamic: boolean; inferredType: FieldAttributeType } => {
    const cleanHeader = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const std = getStandardFieldsForModule(mod);
    const existingAttrs = fieldAttributes.filter(fa => fa.module === mod);

    const aliases: Partial<Record<typeof mod, Record<string, string[]>>> = {
      Accounts: {
        name: ['company', 'companyname', 'account', 'accountname', 'client', 'clientname', 'organization', 'organisation', 'organizationname', 'organisationname', 'business', 'customer', 'customername'],
        industry: ['industry', 'vertical', 'sector', 'industryvertical'],
        tier: ['tier', 'accounttier', 'segment', 'classification'],
        city: ['city', 'town', 'headquartercity', 'headquarterscity', 'location'],
        country: ['country', 'nation'],
        website: ['website', 'websiteurl', 'url', 'web', 'domain', 'companywebsite'],
        annualRevenue: ['annualrevenue', 'revenue', 'turnover', 'annualturnover'],
        employeeCount: ['employeecount', 'employees', 'headcount', 'companysize', 'staffsize'],
        phone: ['phone', 'telephone', 'corporatephone', 'phonenumber', 'contactnumber']
      }
    };

    const moduleAliases = aliases[mod] || {};
    for (const [field, names] of Object.entries(moduleAliases)) {
      if (names.includes(cleanHeader)) {
        return { field, isDynamic: false, inferredType: field === 'annualRevenue' ? 'currency' : 'text' };
      }
    }

    for (const f of std) {
      const cleanKey = f.key.toLowerCase();
      const cleanLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanHeader === cleanKey || cleanHeader === cleanLabel || cleanLabel.includes(cleanHeader) || cleanHeader.includes(cleanKey)) {
        return { field: f.key, isDynamic: false, inferredType: 'text' };
      }
    }

    for (const attr of existingAttrs) {
      const cleanAttrKey = attr.name.toLowerCase().replace(/^custom_/, '');
      const cleanAttrLabel = attr.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanHeader === cleanAttrKey || cleanHeader === cleanAttrLabel) {
        return { field: attr.name, isDynamic: true, inferredType: attr.type };
      }
    }

    let inferredType: FieldAttributeType = 'text';
    if (cleanHeader.includes('date') || cleanHeader.includes('time')) inferredType = 'date';
    else if (cleanHeader.includes('amount') || cleanHeader.includes('value') || cleanHeader.includes('price') || cleanHeader.includes('cost') || cleanHeader.includes('revenue') || cleanHeader.includes('salary') || cleanHeader.includes('budget') || cleanHeader.includes('mrr') || cleanHeader.includes('arr')) inferredType = 'currency';
    else if (cleanHeader.includes('count') || cleanHeader.includes('number') || cleanHeader.includes('qty') || cleanHeader.includes('quantity') || cleanHeader.includes('score') || cleanHeader.includes('licenses')) inferredType = 'number';
    else if (cleanHeader.includes('email') || cleanHeader.includes('mail')) inferredType = 'email';
    else if (cleanHeader.includes('url') || cleanHeader.includes('link') || cleanHeader.includes('web') || cleanHeader.includes('site') || cleanHeader.includes('domain')) inferredType = 'url';
    else if (cleanHeader.includes('is') || cleanHeader.includes('has') || cleanHeader.includes('enabled') || cleanHeader.includes('active') || cleanHeader.includes('eligible') || cleanHeader.includes('flag')) inferredType = 'boolean';

    const safeCustomKey = `custom_${header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
    return { field: safeCustomKey, isDynamic: true, inferredType };
  };

  // Process File
  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setErrorMessage(null);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const rawHeaders = Object.keys(results.data[0] as object);
            setHeaders(rawHeaders);
            setRows(results.data as Record<string, any>[]);
            setSelectedRowIndexes(new Set((results.data as Record<string, any>[]).map((_, index) => index)));
            generateInitialMappings(rawHeaders, selectedModule);
            setActiveStep('mapping');
            showToast(`Parsed ${results.data.length} records from ${file.name}`, 'info');
          } else {
            showToast('The selected CSV file appears to be empty.', 'error');
          }
        },
        error: (err) => {
          showToast(`CSV parsing error: ${err.message}`, 'error');
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

          if (jsonData && jsonData.length > 0) {
            const rawHeaders = Object.keys(jsonData[0]);
            setHeaders(rawHeaders);
            setRows(jsonData);
            setSelectedRowIndexes(new Set(jsonData.map((_, index) => index)));
            generateInitialMappings(rawHeaders, selectedModule);
            setActiveStep('mapping');
            showToast(`Parsed ${jsonData.length} records from Excel sheet: ${firstSheetName}`, 'info');
          } else {
            showToast('The selected Excel sheet contains no readable rows.', 'error');
          }
        } catch (err: any) {
          showToast(`Excel parsing error: ${err.message || 'Corrupted file'}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast('Please upload a valid .csv, .xls, or .xlsx file.', 'warning');
    }
  };

  const generateInitialMappings = (rawHeaders: string[], mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users') => {
    const maps: FieldMapping[] = rawHeaders.map(h => {
      const guess = guessTargetField(h, mod);
      return {
        fileColumn: h,
        targetField: guess.field,
        createAsNewAttribute: guess.isDynamic && autoGenerateCustomFields,
        newAttributeLabel: h,
        newAttributeType: guess.inferredType,
        inferredType: guess.inferredType
      };
    });
    setMappings(maps);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Load Built-in Demo Sample Data
  const handleLoadSampleData = (mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users') => {
    setSelectedModule(mod);
    setFileName(`Sample_${mod}_Import.csv`);
    setFileSize(4096);
    setErrorMessage(null);

    let sampleRows: Record<string, any>[] = [];
    if (mod === 'Leads') {
      sampleRows = [
        { 'Company': 'Infosys Cloud Labs', 'Contact Name': 'Vikram Rao', 'Email': 'vikram.rao@infosys.com', 'Phone': '+91 98201 11223', 'Designation': 'VP Infrastructure', 'City': 'Bengaluru', 'Product': 'Atlassian Jira Software DC', 'Deal Value': 1500000, 'Priority': 'High', 'Source': 'OEM / Vendor Referral', 'Cloud Architecture': 'AWS & Hybrid OpenShift', 'Tech Stack Licenses': 500 },
        { 'Company': 'Tata Elxsi Engineering', 'Contact Name': 'Anita Kulkarni', 'Email': 'anita.k@tataelxsi.com', 'Phone': '+91 98402 33445', 'Designation': 'Director IT & DevOps', 'City': 'Pune', 'Product': 'SonarQube Enterprise', 'Deal Value': 850000, 'Priority': 'High', 'Source': 'Website Demo Request', 'Cloud Architecture': 'Azure Gov Cloud', 'Tech Stack Licenses': 250 },
        { 'Company': 'Kotak Mahindra Bank Digital', 'Contact Name': 'Harshvardhan Joshi', 'Email': 'h.joshi@kotak.com', 'Phone': '+91 98110 55667', 'Designation': 'Chief Security Architect', 'City': 'Mumbai', 'Product': 'Nagios XI Enterprise', 'Deal Value': 2400000, 'Priority': 'Critical', 'Source': 'OEM / Vendor Referral', 'Cloud Architecture': 'On-Prem Private Tier-IV DC', 'Tech Stack Licenses': 1200 },
        { 'Company': 'Paytm Payments Bank', 'Contact Name': 'Neha Singhania', 'Email': 'neha.s@paytm.com', 'Phone': '+91 99100 88990', 'Designation': 'VP Engineering & QA', 'City': 'Noida', 'Product': 'GitLab Ultimate', 'Deal Value': 1950000, 'Priority': 'High', 'Source': 'Partner Channel', 'Cloud Architecture': 'GCP Multi-Region', 'Tech Stack Licenses': 750 }
      ];
    } else if (mod === 'Opportunities') {
      sampleRows = [
        { 'Deal Name': 'HDFC Bank - Jira Align Scaled Agile', 'Account': 'HDFC Bank Limited', 'Contact': 'Ramesh Iyer', 'Total Value': 3200000, 'Stage': 'Qualified Opportunity', 'Probability': 50, 'Product': 'Atlassian Jira Align', 'OEM Partner Tier': 'Platinum Enterprise', 'Renewal Term Years': 3 },
        { 'Deal Name': 'L&T Infotech - Nagios Server Monitoring Expansion', 'Account': 'Larsen & Toubro Infotech', 'Contact': 'Sunil Deshmukh', 'Total Value': 1450000, 'Stage': 'Presales / POC in Progress', 'Probability': 60, 'Product': 'Nagios XI Enterprise', 'OEM Partner Tier': 'Direct Reseller', 'Renewal Term Years': 1 },
        { 'Deal Name': 'Axis Bank - SonarQube Code Security Audit', 'Account': 'Axis Bank Tech Unit', 'Contact': 'Preeti Patel', 'Total Value': 2100000, 'Stage': 'Solution & Commercial Inputs Ready', 'Probability': 75, 'Product': 'SonarQube Enterprise', 'OEM Partner Tier': 'Authorized Specialist', 'Renewal Term Years': 2 }
      ];
    } else if (mod === 'Accounts') {
      sampleRows = [
        { 'Company': 'Bharat Petroleum Digital', 'Industry': 'Oil & Gas / Energy', 'Tier': 'Tier-1 Enterprise', 'City': 'Mumbai', 'Website': 'https://www.bharatpetroleum.in', 'Annual Revenue': 120000000, 'Employee Count': '12,000+', 'IT Budget Tier': 'Platinum Class', 'SAP ERP Integrated': true },
        { 'Company': 'Zomato Tech Hub', 'Industry': 'Consumer Internet & Logistics', 'Tier': 'Tier-1 Enterprise', 'City': 'Gurugram', 'Website': 'https://www.zomato.com', 'Annual Revenue': 85000000, 'Employee Count': '4,500+', 'IT Budget Tier': 'High Growth Scaler', 'SAP ERP Integrated': false },
        { 'Company': 'Mahindra & Mahindra Digital', 'Industry': 'Automotive & Manufacturing', 'Tier': 'Tier-1 Enterprise', 'City': 'Pune', 'Website': 'https://www.mahindra.com', 'Annual Revenue': 210000000, 'Employee Count': '25,000+', 'IT Budget Tier': 'Enterprise Global', 'SAP ERP Integrated': true }
      ];
    } else if (mod === 'Contacts') {
      sampleRows = [
        { 'Contact Name': 'Dr. Alok Verma', 'Company': 'Tata Consultancy Services', 'Email': 'alok.verma@tcs.com', 'Phone': '+91 98200 44556', 'Designation': 'Head of Software Quality', 'Department': 'Quality & Compliance', 'Role in Buying': 'Technical Evaluator', 'City': 'Mumbai', 'Executive Clearance': 'Level 4 Sponsor' },
        { 'Contact Name': 'Meenakshi Sundaram', 'Company': 'Wipro Technologies', 'Email': 'm.sundaram@wipro.com', 'Phone': '+91 98450 77889', 'Designation': 'Chief Procurement Officer', 'Department': 'Vendor Management', 'Role in Buying': 'Procurement', 'City': 'Bengaluru', 'Executive Clearance': 'Commercial Authority' }
      ];
    } else {
      sampleRows = [
        { 'Full Name': 'Abhishek Sen', 'Employee ID': 'AS-9021', 'Work Email': 'abhishek.sen@amrutsoftware.com', 'Mobile': '+91 98300 11223', 'Role': 'Sales Person', 'Department': 'Sales', 'Territory': 'East – Kolkata & Bhubaneswar', 'Reporting Manager': 'Pooja Mehta', 'Backup User': 'Rajesh Sharma', 'OEM Responsibilities': 'Atlassian, Nagios' }
      ];
    }

    const sampleHeaders = Object.keys(sampleRows[0]);
    setHeaders(sampleHeaders);
    setRows(sampleRows);
    setSelectedRowIndexes(new Set(sampleRows.map((_, index) => index)));
    generateInitialMappings(sampleHeaders, mod);
    setActiveStep('mapping');
    showToast(`Loaded sample ${mod} spreadsheet with intelligent schema detection!`, 'success');
  };

  // Download Sample Template CSV / XLS
  const handleDownloadTemplate = (format: 'csv' | 'xlsx' = 'csv') => {
    const stdFields = getStandardFieldsForModule(selectedModule);
    const sampleHeaderObj: Record<string, string> = {};

    stdFields.forEach(f => {
      sampleHeaderObj[f.label] = `Sample ${f.label}`;
    });
    sampleHeaderObj['Custom Extra Field 1'] = 'Custom Value';
    sampleHeaderObj['Custom Extra Field 2'] = '1000';

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet([sampleHeaderObj]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${selectedModule} Template`);
      XLSX.writeFile(wb, `AmrutCRM_${selectedModule}_Import_Template.xlsx`);
      showToast(`Downloaded ${selectedModule} Excel template`, 'info');
    } else {
      const csvContent = Papa.unparse([sampleHeaderObj]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `AmrutCRM_${selectedModule}_Import_Template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded ${selectedModule} CSV template`, 'info');
    }
  };

  // Execute Import with rich, animated real-time progress
  const handleExecuteImport = () => {
    if (!rows || rows.length === 0) {
      showToast('No data rows available to import.', 'warning');
      return;
    }

    const selectedRows = rows.filter((_, index) => selectedRowIndexes.has(index));
    if (selectedRows.length === 0) {
      showToast('Select at least one source row to import.', 'warning');
      return;
    }

    setIsProcessing(true);
    setActiveStep('importing');
    setProgressPercent(10);
    setProgressStage(`Analyzing ${selectedRows.length} selected spreadsheet rows...`);
    setProcessedCount(0);
    setErrorMessage(null);

    // Progressive animation milestones
    setTimeout(() => {
      setProgressPercent(35);
      setProgressStage('Matching columns & auto-provisioning dynamic custom field schemas...');
      setProcessedCount(Math.floor(selectedRows.length * 0.35));
    }, 400);

    setTimeout(() => {
      setProgressPercent(70);
      setProgressStage('Validating BANT parameters, territory assignments & SLA routing...');
      setProcessedCount(Math.floor(selectedRows.length * 0.70));
    }, 800);

    setTimeout(() => {
      setProgressPercent(90);
      setProgressStage('Writing records to CRM database and creating audit trail...');
      setProcessedCount(selectedRows.length);
    }, 1200);

    setTimeout(() => {
      try {
        const result = importDataBatch(
          selectedModule,
          selectedRows,
          mappings,
          importMode,
          fileName || 'bulk_data_import.csv'
        );

        setImportResult(result);
        setProgressPercent(100);
        setProgressStage('Ingestion completed successfully!');
        setIsProcessing(false);
        setActiveStep('complete');

        if (onImportComplete) {
          onImportComplete(result);
        }

        try {
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 }
          });
        } catch (_) {}

        if (result.errorCount > 0) {
          showToast(`Imported ${result.successCount} records; ${result.errorCount} rows were rejected. Review the errors shown.`, result.successCount > 0 ? 'warning' : 'error');
        } else {
          showToast(`Successfully imported ${result.successCount} ${selectedModule} records!`, 'success');
        }
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err.message || 'An unexpected error occurred during record import.');
        setActiveStep('error');
        showToast(`Import error: ${err.message || 'Failed to import'}`, 'error');
      }
    }, 1500);
  };

  const stdFields = getStandardFieldsForModule(selectedModule);
  const existingCustomAttrs = fieldAttributes.filter(fa => fa.module === selectedModule);
  const newFieldsToCreate = mappings.filter(m => m.createAsNewAttribute || m.targetField.startsWith('custom_'));
  const selectedRowCount = selectedRowIndexes.size;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0073EA] flex items-center justify-center text-white shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center space-x-2">
                <span>Bulk Import Studio &amp; Dynamic Schema Generator</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  CSV / XLS / XLSX
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Import <span className="text-white font-semibold">{selectedModule}</span> directly and auto-generate new custom fields from unmapped spreadsheet columns.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex items-center space-x-4 sm:space-x-6 min-w-max">
            
            {/* Step 1 */}
            <div className={`flex items-center space-x-2 ${activeStep === 'upload' ? 'text-[#0073EA] font-bold' : activeStep === 'mapping' || activeStep === 'importing' || activeStep === 'complete' ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${activeStep === 'upload' ? 'bg-[#0073EA] text-white' : activeStep === 'mapping' || activeStep === 'importing' || activeStep === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {activeStep === 'mapping' || activeStep === 'importing' || activeStep === 'complete' ? '✓' : '1'}
              </span>
              <span>1. Upload File</span>
            </div>

            <span className="text-slate-300">→</span>

            {/* Step 2 */}
            <div className={`flex items-center space-x-2 ${activeStep === 'mapping' ? 'text-[#0073EA] font-bold' : activeStep === 'importing' || activeStep === 'complete' ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${activeStep === 'mapping' ? 'bg-[#0073EA] text-white' : activeStep === 'importing' || activeStep === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {activeStep === 'complete' ? '✓' : '2'}
              </span>
              <span>2. Field Mapping &amp; Schema</span>
            </div>

            <span className="text-slate-300">→</span>

            {/* Step 3 */}
            <div className={`flex items-center space-x-2 ${activeStep === 'importing' ? 'text-indigo-600 font-bold' : activeStep === 'complete' ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${activeStep === 'importing' ? 'bg-indigo-600 text-white animate-pulse' : activeStep === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {activeStep === 'complete' ? '✓' : '3'}
              </span>
              <span>3. Processing Ingestion</span>
            </div>

            <span className="text-slate-300">→</span>

            {/* Step 4 */}
            <div className={`flex items-center space-x-2 ${activeStep === 'complete' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center ${activeStep === 'complete' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                4
              </span>
              <span>4. Complete</span>
            </div>

          </div>

          <div className="hidden md:flex items-center space-x-2">
            <span className="text-slate-400 font-mono text-[11px]">Entity:</span>
            <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded font-bold text-[11px]">{selectedModule}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[calc(92vh-180px)] space-y-6">
          
          {/* ================= STEP 1: UPLOAD ================= */}
          {activeStep === 'upload' && (
            <div className="space-y-6">
              
              {/* Target Entity Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Target CRM Entity
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(['Leads', 'Opportunities', 'Accounts', 'Contacts', 'Users'] as const).map(mod => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setSelectedModule(mod)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        selectedModule === mod
                          ? 'border-[#0073EA] bg-blue-50/50 text-[#0073EA] font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{mod}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {mod === 'Leads' ? 'Inbound Prospects' : mod === 'Opportunities' ? 'Deals & Pipeline' : mod === 'Accounts' ? 'Organizations' : mod === 'Contacts' ? 'Stakeholders' : 'Staff Roster'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Upload Spreadsheet File (.CSV, .XLS, .XLSX)
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                    dragActive
                      ? 'border-[#0073EA] bg-blue-50/80 scale-[1.01]'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-3 text-[#0073EA]">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Drag and drop your spreadsheet here, or <span className="text-[#0073EA] underline">browse</span>
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Supports CSV, Microsoft Excel (.xlsx, .xls) files. All unrecognized columns will be automatically provisioned as new custom fields.
                  </p>
                </div>
              </div>

              {/* Template Download & Preset Demo Samples */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Need a sample structure?</span>
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('csv')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      Download CSV Template
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate('xlsx')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      Download Excel Template
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadSampleData(selectedModule)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Load 1-Click {selectedModule} Sample Data</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: MAPPING ================= */}
          {activeStep === 'mapping' && (
            <div className="space-y-5">
              
              {/* File Info Bar */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0073EA] text-white flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{fileName}</h4>
                    <p className="text-[11px] text-slate-500">
                      {rows.length} records parsed • {headers.length} spreadsheet columns detected • Ingesting into <strong className="text-blue-700">{selectedModule}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep('upload')}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Dynamic Field Creation Toggle Banner */}
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Auto-Generate Custom Fields from Unmapped Columns</h4>
                    <p className="text-[11px] text-indigo-700">
                      Any column not matching standard {selectedModule} fields will be dynamically created in the CRM schema.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-900">{newFieldsToCreate.length} new fields detected</span>
                </div>
              </div>

              {/* Mapping Matrix Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider">Column Mapping Matrix</span>
                  <span className="text-slate-500 font-medium">Sample Value preview shown from 1st row</span>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Spreadsheet Column</th>
                        <th className="py-2.5 px-3">Sample Value (Row 1)</th>
                        <th className="py-2.5 px-3">Target CRM Field / Action</th>
                        <th className="py-2.5 px-3">Field Type &amp; Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappings.map((m, idx) => {
                        const isDynamic = m.createAsNewAttribute || m.targetField.startsWith('custom_');
                        const sampleVal = rows[0]?.[m.fileColumn];

                        return (
                          <tr key={idx} className={`hover:bg-slate-50/80 ${isDynamic ? 'bg-indigo-50/20' : ''}`}>
                            {/* File Column */}
                            <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {m.fileColumn}
                            </td>

                            {/* Sample Value */}
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                              {sampleVal !== undefined && sampleVal !== null && sampleVal !== '' ? String(sampleVal) : <span className="italic text-slate-400">empty</span>}
                            </td>

                            {/* Target Field Dropdown */}
                            <td className="py-2.5 px-3">
                              <select
                                value={m.targetField}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMappings(prev => prev.map((item, i) => {
                                    if (i !== idx) return item;
                                    const isDyn = val.startsWith('custom_');
                                    return {
                                      ...item,
                                      targetField: val,
                                      createAsNewAttribute: isDyn,
                                      newAttributeLabel: isDyn ? item.fileColumn : undefined
                                    };
                                  }));
                                }}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 w-full max-w-[210px]"
                              >
                                <optgroup label="Standard Fields">
                                  {stdFields.map(f => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} ({f.key})
                                    </option>
                                  ))}
                                </optgroup>

                                {existingCustomAttrs.length > 0 && (
                                  <optgroup label="Existing Custom Attributes">
                                    {existingCustomAttrs.map(attr => (
                                      <option key={attr.name} value={attr.name}>
                                        {attr.label} ({attr.name})
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                <optgroup label="Dynamic Field Actions">
                                  <option value={`custom_${m.fileColumn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`}>
                                    ✨ Auto-Create Dynamic Field ("{m.fileColumn}")
                                  </option>
                                  <option value="__IGNORE__">❌ Skip / Do Not Import</option>
                                </optgroup>
                              </select>
                            </td>

                            {/* Type & Label */}
                            <td className="py-2.5 px-3">
                              {isDynamic && m.targetField !== '__IGNORE__' ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={m.newAttributeLabel || m.fileColumn}
                                    onChange={(e) => {
                                      const labelVal = e.target.value;
                                      setMappings(prev => prev.map((item, i) => i === idx ? { ...item, newAttributeLabel: labelVal } : item));
                                    }}
                                    placeholder="Label"
                                    className="px-2 py-1 bg-white border border-indigo-200 rounded text-xs text-indigo-950 font-medium w-28"
                                    title="Display Label for the generated dynamic field"
                                  />
                                  <select
                                    value={m.newAttributeType || m.inferredType || 'text'}
                                    onChange={(e) => {
                                      const typeVal = e.target.value as FieldAttributeType;
                                      setMappings(prev => prev.map((item, i) => i === idx ? { ...item, newAttributeType: typeVal } : item));
                                    }}
                                    className="px-1.5 py-1 bg-white border border-indigo-200 rounded text-[11px] text-indigo-900 font-medium"
                                  >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="currency">Currency (₹)</option>
                                    <option value="date">Date</option>
                                    <option value="boolean">Boolean (Yes/No)</option>
                                    <option value="email">Email</option>
                                    <option value="url">URL</option>
                                  </select>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  {m.targetField === '__IGNORE__' ? 'Skipped' : 'Standard Field'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Source record review and selection */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Records to import: {selectedRowCount}</span>
                    <span className="text-slate-500"> of {rows.length} parsed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRowIndexes(new Set(rows.map((_, index) => index)))}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRowIndexes(new Set())}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 w-12">
                          <input
                            type="checkbox"
                            aria-label="Select all source rows"
                            checked={rows.length > 0 && selectedRowCount === rows.length}
                            ref={input => { if (input) input.indeterminate = selectedRowCount > 0 && selectedRowCount < rows.length; }}
                            onChange={event => setSelectedRowIndexes(event.target.checked ? new Set(rows.map((_, index) => index)) : new Set())}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </th>
                        <th className="py-2 px-3 w-16">Row</th>
                        {headers.slice(0, 6).map(header => <th key={header} className="py-2 px-3 min-w-36">{header}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, index) => (
                        <tr key={index} className={selectedRowIndexes.has(index) ? 'bg-white' : 'bg-slate-50 text-slate-400'}>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              aria-label={`Select source row ${index + 1}`}
                              checked={selectedRowIndexes.has(index)}
                              onChange={() => setSelectedRowIndexes(previous => {
                                const next = new Set(previous);
                                if (next.has(index)) next.delete(index); else next.add(index);
                                return next;
                              })}
                              className="h-4 w-4 accent-blue-600"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono">{index + 1}</td>
                          {headers.slice(0, 6).map(header => (
                            <td key={header} className="py-2 px-3 max-w-56 truncate" title={String(row[header] ?? '')}>
                              {String(row[header] ?? '') || <span className="italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {headers.length > 6 && <p className="px-3 py-2 text-[11px] text-slate-500 border-t border-slate-200">Showing the first 6 columns here. All mapped columns will be imported.</p>}
              </div>
            </div>
          )}

          {/* ================= STEP 3: IMPORT IN PROGRESS ================= */}
          {activeStep === 'importing' && (
            <div className="py-8 px-4 text-center space-y-6 max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200">
              
              {/* Spinner & Progress Badge */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#0073EA] border-r-[#0073EA] border-b-transparent border-l-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#0073EA]">
                  {progressPercent}%
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ingesting {selectedRowCount} {selectedModule} Records...
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {progressStage}
                </p>
              </div>

              {/* Real Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/80 p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#0073EA] to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Processed: {processedCount} of {selectedRowCount} rows</span>
                  <span>{progressPercent}% Complete</span>
                </div>
              </div>

              {/* Progress Milestones Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className={`flex items-center space-x-2.5 ${progressPercent >= 10 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${progressPercent >= 10 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Parse and validate spreadsheet rows ({rows.length} rows)</span>
                </div>

                <div className={`flex items-center space-x-2.5 ${progressPercent >= 35 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${progressPercent >= 35 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Auto-provision dynamic custom field attributes into schema</span>
                </div>

                <div className={`flex items-center space-x-2.5 ${progressPercent >= 70 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${progressPercent >= 70 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Verify BANT qualifications, assignment rules &amp; territory routing</span>
                </div>

                <div className={`flex items-center space-x-2.5 ${progressPercent >= 90 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${progressPercent >= 90 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Commit records to database and write audit trail records</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: RESULT COMPLETE ================= */}
          {activeStep === 'complete' && importResult && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Result Banner */}
              <div className={`${importResult.errorCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border rounded-2xl p-5 flex items-center space-x-4`}>
                <div className={`w-12 h-12 rounded-2xl ${importResult.errorCount > 0 ? 'bg-amber-600' : 'bg-emerald-600'} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                  {importResult.errorCount > 0 ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className={`text-base font-bold ${importResult.errorCount > 0 ? 'text-amber-950' : 'text-emerald-950'}`}>
                    {importResult.errorCount > 0 ? 'Bulk Import Completed With Errors' : 'Bulk Import Completed Successfully!'}
                  </h3>
                  <p className={`text-xs ${importResult.errorCount > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                    Imported <span className="font-bold">{importResult.successCount}</span> of {importResult.totalRows} records into <span className="font-bold">{importResult.module}</span>. {importResult.errorCount > 0 && <span className="font-bold">{importResult.errorCount} rows were rejected.</span>}
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <p className="text-xs font-bold text-rose-900 mb-2">Rows requiring correction</p>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-rose-800">
                    {importResult.errors.map((error, index) => <li key={index}>{error}</li>)}
                  </ul>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Records Ingested</span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">{importResult.successCount} / {importResult.totalRows}</p>
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-indigo-500">New Fields Generated</span>
                  <p className="text-2xl font-black text-indigo-700 mt-0.5">{importResult.createdFields.length}</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Module</span>
                  <p className="text-base font-bold text-slate-900 mt-1">{importResult.module}</p>
                </div>
              </div>

              {/* Dynamic Fields List */}
              {importResult.createdFields.length > 0 && (
                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-2">
                  <p className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dynamic Custom Fields Added to {importResult.module} Schema ({importResult.createdFields.length}):</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {importResult.createdFields.map(cf => (
                      <div key={cf.id} className="bg-white border border-indigo-200 px-2.5 py-1 rounded-lg text-xs flex items-center space-x-1.5 shadow-2xs">
                        <span className="font-bold text-slate-900">{cf.label}</span>
                        <code className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{cf.name}</code>
                        <span className="text-[10px] text-slate-400 capitalize">({cf.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Created Records List Preview */}
              {importResult.createdRecordsSummary.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">Created Records Summary ({importResult.createdRecordsSummary.length}):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {importResult.createdRecordsSummary.map((rec, i) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-medium shadow-2xs">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 5: ERROR ================= */}
          {activeStep === 'error' && (
            <div className="py-6 px-4 text-center space-y-4 max-w-md mx-auto animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Import Processing Failed</h3>
                <p className="text-xs text-rose-600 mt-1 font-medium bg-rose-50 p-3 rounded-xl border border-rose-200 text-left">
                  {errorMessage || 'Unknown error occurred while processing rows.'}
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep('mapping')}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Review Mappings</span>
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Retry Import
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          {activeStep === 'complete' ? (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveStep('upload');
                  setFileName(null);
                  setRows([]);
                  setSelectedRowIndexes(new Set());
                  setHeaders([]);
                  setMappings([]);
                  setImportResult(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
              >
                Import Another File
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs"
              >
                Done &amp; View {selectedModule}
              </button>
            </div>
          ) : activeStep === 'importing' ? (
            <div className="w-full flex items-center justify-center text-slate-500 font-medium space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0073EA]" />
              <span>Import in progress. Please do not close this window...</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>

              {activeStep === 'mapping' && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep('upload')}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer"
                  >
                    Back to File
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isProcessing || selectedRowCount === 0}
                    className="px-6 py-2.5 bg-[#0073EA] hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center space-x-2 shadow-md cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Import Selected ({selectedRowCount} {selectedModule} Records)</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
