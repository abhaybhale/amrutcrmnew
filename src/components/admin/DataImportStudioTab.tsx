import React, { useState, useRef } from 'react';
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
  Database,
  Sliders,
  Download,
  Eye,
  Check,
  X,
  FileText,
  Table,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Users,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

interface DataImportStudioTabProps {
  initialModule?: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users';
  onNavigateToModule?: (module: string) => void;
}

export const DataImportStudioTab: React.FC<DataImportStudioTabProps> = ({
  initialModule = 'Leads',
  onNavigateToModule
}) => {
  const { fieldAttributes, importDataBatch, showToast } = useCRM();

  const [selectedModule, setSelectedModule] = useState<'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users'>(initialModule);
  const [importMode, setImportMode] = useState<'automatic' | 'manual'>('automatic');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'mapping' | 'preview'>('mapping');

  // File parsing states
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('Ready');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Standard Target Fields based on Module
  const getStandardFieldsForModule = (mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users') => {
    switch (mod) {
      case 'Users':
        return [
          { key: 'name', label: 'Full Staff Name' },
          { key: 'employeeId', label: 'Employee ID (e.g. AS-9005)' },
          { key: 'email', label: 'Work Email Address' },
          { key: 'mobile', label: 'Mobile / Contact Number' },
          { key: 'role', label: 'System Role & Access Level' },
          { key: 'department', label: 'Department' },
          { key: 'territory', label: 'Territory Coverage' },
          { key: 'reportingManagerName', label: 'Reporting Manager' },
          { key: 'backupUserName', label: 'Backup User (OOO Proxy)' },
          { key: 'vendorResponsibilities', label: 'OEM Vendor Responsibilities' },
          { key: 'eligibleForAutoAssignment', label: 'Auto-Assignment Eligible' },
          { key: 'isOutOfOffice', label: 'Out of Office Status' }
        ];
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
          { key: 'product', label: 'Product / Focus Area' },
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
          { key: 'pipeline', label: 'Pipeline Type' }
        ];
      case 'Accounts':
        return [
          { key: 'name', label: 'Account / Client Name' },
          { key: 'industry', label: 'Industry Sector' },
          { key: 'tier', label: 'Account Tier' },
          { key: 'website', label: 'Website URL' },
          { key: 'phone', label: 'Phone Number' },
          { key: 'city', label: 'City' },
          { key: 'country', label: 'Country' },
          { key: 'annualRevenue', label: 'Annual Revenue' },
          { key: 'employeeCount', label: 'Employee Count' },
          { key: 'totalHistoricalRevenue', label: 'Historical Revenue' }
        ];
      case 'Contacts':
        return [
          { key: 'name', label: 'Full Name' },
          { key: 'accountName', label: 'Account / Organization' },
          { key: 'email', label: 'Email Address' },
          { key: 'phone', label: 'Phone Number' },
          { key: 'mobile', label: 'Mobile Number' },
          { key: 'designation', label: 'Job Designation' },
          { key: 'department', label: 'Department' },
          { key: 'roleInBuying', label: 'Role in Buying' },
          { key: 'city', label: 'City' },
          { key: 'linkedin', label: 'LinkedIn Profile' }
        ];
    }
  };

  const inferDataType = (values: any[]): FieldAttributeType => {
    const nonNull = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    if (nonNull.length === 0) return 'text';

    const sample = nonNull.slice(0, 10);
    const isNum = sample.every(v => !isNaN(Number(v)));
    if (isNum) return 'number';

    const isEmail = sample.every(v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    if (isEmail) return 'email';

    const isDate = sample.every(v => typeof v === 'string' && !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/')));
    if (isDate) return 'date';

    const isBool = sample.every(v => typeof v === 'boolean' || ['true', 'false', 'yes', 'no', '1', '0'].includes(String(v).toLowerCase()));
    if (isBool) return 'boolean';

    return 'text';
  };

  // Heuristic aliases dictionary for instant high-confidence matching
  const aliasesMap: Record<string, string[]> = {
    // Users aliases
    name: ['fullname', 'employeename', 'staffname', 'username', 'name', 'personname', 'contactname', 'employee', 'staff'],
    employeeId: ['employeeid', 'empid', 'staffid', 'empcode', 'employeecode', 'id', 'staffcode', 'userid', 'badgeid'],
    email: ['email', 'workemail', 'officialemail', 'emailaddress', 'corporateemail', 'mail', 'primaryemail'],
    mobile: ['mobile', 'phone', 'phonenumber', 'contactnumber', 'cell', 'cellphone', 'mobilenumber', 'telephone', 'contact'],
    role: ['role', 'systemrole', 'userrole', 'designation', 'jobtitle', 'title', 'position', 'accesslevel', 'permissionlevel'],
    department: ['department', 'dept', 'division', 'businessunit', 'team', 'group', 'function'],
    territory: ['territory', 'region', 'zone', 'location', 'branch', 'geography', 'cityzone', 'coverage'],
    reportingManagerName: ['reportingmanager', 'manager', 'reportsto', 'supervisor', 'lead', 'managername', 'reportingto', 'linemanager'],
    backupUserName: ['backupuser', 'backup', 'oooproxy', 'alternate', 'alternaterep', 'proxyuser', 'standin'],
    vendorResponsibilities: ['vendorresponsibilities', 'vendors', 'oems', 'products', 'vendorpartners', 'allottedvendors', 'oemvendors'],
    
    // Leads / Accounts / Opps aliases
    companyName: ['company', 'companyname', 'organization', 'account', 'client', 'accountname', 'clientname', 'firm', 'business'],
    contactName: ['contact', 'contactname', 'fullname', 'keycontact', 'poc', 'pointofcontact'],
    contactEmail: ['email', 'contactemail', 'workemail', 'officialemail', 'emailaddress'],
    contactPhone: ['phone', 'contactphone', 'mobile', 'phonenumber', 'contactnumber', 'cell'],
    designation: ['designation', 'title', 'jobtitle', 'position'],
    city: ['city', 'location', 'town'],
    country: ['country', 'nation'],
    expectedValue: ['expectedvalue', 'dealvalue', 'value', 'amount', 'dealsize', 'budget', 'expectedrevenue', 'potentialvalue'],
    totalValue: ['totalvalue', 'dealsize', 'amount', 'dealvalue', 'contractvalue', 'pipelinevalue', 'quotevalue'],
    source: ['source', 'leadsource', 'origination', 'channel'],
    product: ['product', 'focusproduct', 'solution', 'item', 'offering'],
    requirement: ['requirement', 'notes', 'description', 'summary', 'details', 'scope'],
    priority: ['priority', 'prioritylevel', 'urgency', 'severity'],
    stage: ['stage', 'pipelinestage', 'status', 'dealstage'],
    probability: ['probability', 'prob', 'likelihood', 'winchance', 'winprobability'],
    expectedCloseDate: ['expectedclosedate', 'closedate', 'targetdate', 'estclosedate', 'closuredate'],
    industry: ['industry', 'vertical', 'sector'],
    tier: ['tier', 'accounttier', 'classification', 'segment'],
    website: ['website', 'url', 'web', 'site'],
    annualRevenue: ['annualrevenue', 'revenue', 'turnover', 'annualturnover'],
    employeeCount: ['employeecount', 'employees', 'headcount', 'companysize', 'staffsize']
  };

  // Generate initial field mappings from raw parsed headers
  const generateInitialMappings = (rawHeaders: string[], rawRows: Record<string, any>[], mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users') => {
    const stdFields = getStandardFieldsForModule(mod);
    const existingCustomAttrs = fieldAttributes.filter(fa => fa.module === mod);

    const generatedMappings: FieldMapping[] = rawHeaders.map(col => {
      const colClean = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sampleVals = rawRows.slice(0, 10).map(r => r[col]);
      const inferred = inferDataType(sampleVals);

      let matchedTarget = '';

      // 1. Try aliases dictionary lookup
      for (const [fieldKey, aliases] of Object.entries(aliasesMap)) {
        if (stdFields.some(f => f.key === fieldKey)) {
          if (aliases.includes(colClean) || aliases.some(a => colClean === a || colClean.includes(a) || a.includes(colClean))) {
            matchedTarget = fieldKey;
            break;
          }
        }
      }

      // 2. Try direct matching standard fields
      if (!matchedTarget) {
        for (const std of stdFields) {
          const stdClean = std.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const stdLabelClean = std.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (colClean === stdClean || colClean === stdLabelClean || colClean.includes(stdClean) || stdClean.includes(colClean)) {
            matchedTarget = std.key;
            break;
          }
        }
      }

      // 3. Try matching existing custom fields
      if (!matchedTarget) {
        for (const cust of existingCustomAttrs) {
          const custClean = cust.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const custLabelClean = cust.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (colClean === custClean || colClean === custLabelClean) {
            matchedTarget = cust.name;
            break;
          }
        }
      }

      // 4. In automated mode or unmapped: map as dynamic new custom attribute
      const willCreateNew = !matchedTarget;
      const targetName = matchedTarget || `custom_${col.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;

      return {
        fileColumn: col,
        targetField: targetName,
        isCustomField: targetName.startsWith('custom_'),
        inferredType: inferred,
        createAsNewAttribute: willCreateNew,
        newAttributeLabel: col.replace(/([A-Z])/g, ' $1').trim(),
        newAttributeType: inferred
      };
    });

    return generatedMappings;
  };

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setImportResult(null);
    setIsProcessing(true);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedHeaders = results.meta.fields || [];
          const parsedRows = (results.data as Record<string, any>[]).filter(r => Object.keys(r).length > 0);
          setHeaders(parsedHeaders);
          setRows(parsedRows);
          const initialMap = generateInitialMappings(parsedHeaders, parsedRows, selectedModule);
          setMappings(initialMap);
          setIsProcessing(false);
          showToast(`Loaded ${parsedRows.length} rows from ${file.name}`, 'info');
        },
        error: (err) => {
          setIsProcessing(false);
          showToast(`Failed to parse CSV: ${err.message}`, 'error');
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

          if (jsonData.length === 0) {
            setIsProcessing(false);
            showToast('The selected spreadsheet has no data rows.', 'warning');
            return;
          }

          const parsedHeaders = Object.keys(jsonData[0]);
          setHeaders(parsedHeaders);
          setRows(jsonData);
          const initialMap = generateInitialMappings(parsedHeaders, jsonData, selectedModule);
          setMappings(initialMap);
          setIsProcessing(false);
          showToast(`Loaded ${jsonData.length} rows from ${file.name}`, 'info');
        } catch (err: any) {
          setIsProcessing(false);
          showToast(`Failed to parse Excel file: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsProcessing(false);
      showToast('Please upload a valid .csv, .xlsx, or .xls file.', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Sample Preset Loader for 1-Click User Testing
  const handleLoadSampleDataset = (mod: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users') => {
    setSelectedModule(mod);
    setImportResult(null);

    let sampleHeaders: string[] = [];
    let sampleData: Record<string, any>[] = [];

    if (mod === 'Users') {
      sampleHeaders = [
        'Full Name',
        'Employee ID',
        'Work Email',
        'Mobile',
        'Role',
        'Department',
        'Territory',
        'Reporting Manager',
        'Backup User',
        'OEM Vendors',
        'Skill Specialization'
      ];
      sampleData = [
        {
          'Full Name': 'Amit Patil',
          'Employee ID': 'AS-9005',
          'Work Email': 'amit.patil@amrutsoftware.com',
          'Mobile': '+91 98200 45671',
          'Role': 'Sales Person',
          'Department': 'Sales',
          'Territory': 'West – Mumbai & Pune',
          'Reporting Manager': 'Pooja Mehta',
          'Backup User': 'Rajesh Sharma',
          'OEM Vendors': 'Atlassian, Nagios',
          'Skill Specialization': 'ITSM & Enterprise DevOps Solutions'
        },
        {
          'Full Name': 'Neha Kulkarni',
          'Employee ID': 'AS-9006',
          'Work Email': 'neha.kulkarni@amrutsoftware.com',
          'Mobile': '+91 99300 88234',
          'Role': 'Presales Consultant',
          'Department': 'Presales',
          'Territory': 'South – Bengaluru & Hyderabad',
          'Reporting Manager': 'Vikram Sengupta',
          'Backup User': 'Sneha Rao',
          'OEM Vendors': 'GitLab, SonarSource',
          'Skill Specialization': 'AppSec & Automated Code Quality'
        },
        {
          'Full Name': 'Vikram Sengupta',
          'Employee ID': 'AS-9007',
          'Work Email': 'vikram.sengupta@amrutsoftware.com',
          'Mobile': '+91 97110 33412',
          'Role': 'Commercial Lead',
          'Department': 'Commercial & CPQ',
          'Territory': 'Pan India',
          'Reporting Manager': 'Abhay Joshi',
          'Backup User': 'Kavita Verma',
          'OEM Vendors': 'Atlassian, Microsoft, JetBrains',
          'Skill Specialization': 'Enterprise Deal Structuring & OEM Pricing'
        },
        {
          'Full Name': 'Kavita Deshmukh',
          'Employee ID': 'AS-9008',
          'Work Email': 'kavita.deshmukh@amrutsoftware.com',
          'Mobile': '+91 98450 67112',
          'Role': 'Lead Gen Agent',
          'Department': 'Sales',
          'Territory': 'Pan India',
          'Reporting Manager': 'Pooja Mehta',
          'Backup User': 'Amit Patil',
          'OEM Vendors': 'Atlassian, Freshworks',
          'Skill Specialization': 'Outbound Tech Prospecting & BANT Qualification'
        }
      ];
    } else if (mod === 'Leads') {
      sampleHeaders = ['Company', 'Contact Name', 'Work Email', 'Phone', 'Designation', 'City', 'Expected Deal Value', 'Product', 'Budget Fiscal Year', 'Security Standard', 'Competitor Tool'];
      sampleData = [
        {
          'Company': 'Apex Financial Cloud Ltd',
          'Contact Name': 'Rohan Deshmukh',
          'Work Email': 'rohan.deshmukh@apexfin.in',
          'Phone': '+91 98220 11445',
          'Designation': 'Chief Information Security Officer',
          'City': 'Mumbai',
          'Expected Deal Value': 1850000,
          'Product': 'Atlassian Jira Software Enterprise',
          'Budget Fiscal Year': 'FY 2026-27',
          'Security Standard': 'ISO 27001 & SOC2 Type II',
          'Competitor Tool': 'Legacy Remedy ITSM'
        },
        {
          'Company': 'Zenith Health Informatics',
          'Contact Name': 'Dr. Nandita Iyer',
          'Work Email': 'nandita.i@zenithhealth.org',
          'Phone': '+91 99800 23411',
          'Designation': 'VP Digital Infrastructure',
          'City': 'Bengaluru',
          'Expected Deal Value': 2400000,
          'Product': 'Nagios XI Enterprise Server Monitoring',
          'Budget Fiscal Year': 'Q2 FY26 CapEx',
          'Security Standard': 'HIPAA & GDPR Compliant',
          'Competitor Tool': 'Zabbix OpenSource'
        },
        {
          'Company': 'Kavya E-Commerce Logistics',
          'Contact Name': 'Sameer Kulkarni',
          'Work Email': 'sameer.k@kavyalogistics.com',
          'Phone': '+91 98110 56789',
          'Designation': 'Head of Engineering & DevOps',
          'City': 'Pune',
          'Expected Deal Value': 1200000,
          'Product': 'GitLab Ultimate Self-Managed',
          'Budget Fiscal Year': 'Immediate In-Budget',
          'Security Standard': 'PCI-DSS Level 1',
          'Competitor Tool': 'Self-hosted Jenkins'
        }
      ];
    } else if (mod === 'Opportunities') {
      sampleHeaders = ['Deal Name', 'Account', 'Contact', 'Deal Size', 'Stage', 'Close Date', 'Probability', 'Product', 'Renewal Term', 'ERP System Ref'];
      sampleData = [
        {
          'Deal Name': 'Tata Sky - Nagios XI Infrastructure Refresh',
          'Account': 'Tata Sky Media Ltd',
          'Contact': 'Ankit Verma',
          'Deal Size': 3200000,
          'Stage': 'Quote Submitted',
          'Close Date': '2026-09-30',
          'Probability': 75,
          'Product': 'Nagios XI Enterprise',
          'Renewal Term': '36 Months Multi-Year',
          'ERP System Ref': 'SAP-ECC-90214'
        },
        {
          'Deal Name': 'HDFC ERGO - Enterprise Atlassian Migration',
          'Account': 'HDFC ERGO General Insurance',
          'Contact': 'Pooja Nair',
          'Deal Size': 5400000,
          'Stage': 'Negotiation',
          'Close Date': '2026-08-31',
          'Probability': 85,
          'Product': 'Atlassian Confluence & Jira Data Center',
          'Renewal Term': 'Annual Co-Term',
          'ERP System Ref': 'ORACLE-FIN-4410'
        }
      ];
    } else if (mod === 'Accounts') {
      sampleHeaders = ['Company', 'Industry', 'Tier', 'Website', 'Phone', 'City', 'Annual Revenue', 'Employees', 'GST Identification', 'Account Classification'];
      sampleData = [
        {
          'Company': 'BlueStar Engineering Solutions',
          'Industry': 'Manufacturing & Logistics',
          'Tier': 'Strategic',
          'Website': 'https://www.bluestar.example.in',
          'Phone': '+91 22 6600 8800',
          'City': 'Mumbai',
          'Annual Revenue': 45000000,
          'Employees': '2,000 - 5,000',
          'GST Identification': '27AAACB2234K1Z5',
          'Account Classification': 'Tier-1 Large Enterprise'
        },
        {
          'Company': 'Veloce Digital FinTech',
          'Industry': 'Banking & Financial Services',
          'Tier': 'Growth',
          'Website': 'https://www.velocedigital.io',
          'Phone': '+91 80 4411 9900',
          'City': 'Bengaluru',
          'Annual Revenue': 18000000,
          'Employees': '250 - 500',
          'GST Identification': '29BBBCB5567L2Z8',
          'Account Classification': 'Scale-up Unicorn'
        }
      ];
    } else if (mod === 'Contacts') {
      sampleHeaders = ['Full Name', 'Company', 'Work Email', 'Phone', 'Designation', 'Department', 'Role in Buying', 'City', 'LinkedIn', 'Decision Authority Level'];
      sampleData = [
        {
          'Full Name': 'Sanjay Menon',
          'Company': 'Apex Financial Cloud Ltd',
          'Work Email': 'sanjay.menon@apexfin.in',
          'Phone': '+91 98450 12345',
          'Designation': 'Senior Director Enterprise Architecture',
          'Department': 'Information Technology',
          'Role in Buying': 'Technical Evaluator',
          'City': 'Mumbai',
          'LinkedIn': 'https://linkedin.com/in/sanjay-menon-tech',
          'Decision Authority Level': 'Final Technical Sign-off'
        },
        {
          'Full Name': 'Meera Sundaram',
          'Company': 'Zenith Health Informatics',
          'Work Email': 'meera.s@zenithhealth.org',
          'Phone': '+91 97310 98765',
          'Designation': 'Chief Procurement Officer',
          'Department': 'Procurement & Vendor Management',
          'Role in Buying': 'Economic Buyer',
          'City': 'Bengaluru',
          'LinkedIn': 'https://linkedin.com/in/meera-sundaram',
          'Decision Authority Level': 'Commercial Purchase Order Approver'
        }
      ];
    }

    setFileName(`sample_${mod.toLowerCase()}_dataset_template.csv`);
    setFileSize(1024 * 4);
    setHeaders(sampleHeaders);
    setRows(sampleData);
    const initialMap = generateInitialMappings(sampleHeaders, sampleData, mod);
    setMappings(initialMap);
    showToast(`Loaded sample ${mod} dataset with intelligent mappings!`, 'success');
  };

  // Download Sample Template CSV / XLS
  const handleDownloadTemplate = (format: 'csv' | 'xlsx' = 'csv') => {
    const stdFields = getStandardFieldsForModule(selectedModule);
    const sampleHeaderObj: Record<string, string> = {};
    
    if (selectedModule === 'Users') {
      sampleHeaderObj['Full Name'] = 'Rahul Sharma';
      sampleHeaderObj['Employee ID'] = 'AS-9010';
      sampleHeaderObj['Work Email'] = 'rahul.sharma@amrutsoftware.com';
      sampleHeaderObj['Mobile'] = '+91 98200 12345';
      sampleHeaderObj['Role'] = 'Sales Person';
      sampleHeaderObj['Department'] = 'Sales';
      sampleHeaderObj['Territory'] = 'West – Mumbai & Pune';
      sampleHeaderObj['Reporting Manager'] = 'Pooja Mehta';
      sampleHeaderObj['Backup User'] = 'Rajesh Sharma';
      sampleHeaderObj['OEM Vendors'] = 'Atlassian, Nagios';
      sampleHeaderObj['Custom Certification'] = 'AWS Certified Cloud Practitioner';
    } else {
      stdFields.forEach(f => {
        sampleHeaderObj[f.label] = `Sample ${f.label}`;
      });
      sampleHeaderObj['Custom Category'] = 'Enterprise';
    }

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet([sampleHeaderObj]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${selectedModule} Template`);
      XLSX.writeFile(wb, `AmrutCRM_${selectedModule}_Import_Template.xlsx`);
      showToast(`Downloaded ${selectedModule} Excel (.xlsx) template`, 'info');
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

  // Execute Import
  const handleExecuteImport = () => {
    if (!rows || rows.length === 0) {
      showToast('No data rows available to import.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(15);
    setProgressStage(`Analyzing ${rows.length} records...`);

    setTimeout(() => {
      setProgressPercent(45);
      setProgressStage('Auto-provisioning dynamic custom fields in schema...');
    }, 300);

    setTimeout(() => {
      setProgressPercent(80);
      setProgressStage('Writing records to CRM database and generating audit trail...');
    }, 700);

    setTimeout(() => {
      try {
        const result = importDataBatch(selectedModule, rows, mappings, importMode, fileName || 'bulk_data_import.csv');
        setImportResult(result);
        setProgressPercent(100);
        setProgressStage('Completed!');
        setIsProcessing(false);

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (_) {}

        showToast(`Successfully imported ${result.successCount} ${selectedModule} records!`, 'success');
      } catch (err: any) {
        setIsProcessing(false);
        showToast(`Import error: ${err.message}`, 'error');
      }
    }, 1100);
  };

  const stdFields = getStandardFieldsForModule(selectedModule);
  const existingCustomAttrs = fieldAttributes.filter(fa => fa.module === selectedModule);

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900">Bulk Data &amp; User Import Studio</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              CSV &amp; Excel (XLS / XLSX)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Import Staff Accounts, Leads, Opportunities, Accounts, and Contacts directly with automatic header-to-field matching, dynamic schema provisioning, and instant validation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownloadTemplate('csv')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Download formatted CSV spreadsheet template"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download CSV Template</span>
          </button>
          <button
            onClick={() => handleDownloadTemplate('xlsx')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Download formatted Excel (.xlsx) template"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download Excel Template</span>
          </button>
        </div>
      </div>

      {/* Target Module Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Target Entity:</span>
          {(['Users', 'Leads', 'Opportunities', 'Accounts', 'Contacts'] as const).map(mod => {
            const isSelected = selectedModule === mod;
            return (
              <button
                key={mod}
                onClick={() => {
                  setSelectedModule(mod);
                  if (rows.length > 0) {
                    setMappings(generateInitialMappings(headers, rows, mod));
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#0073EA] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {mod === 'Users' ? <Users className="w-3.5 h-3.5" /> : null}
                <span>{mod === 'Users' ? 'Staff Users & Roster' : mod === 'Contacts' ? 'Clients / Contacts' : mod}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Demo Preset:</span>
          <button
            onClick={() => handleLoadSampleDataset(selectedModule)}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center space-x-1 transition-all border border-indigo-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Load Sample {selectedModule} Data</span>
          </button>
        </div>
      </div>

      {/* Drag and Drop File Upload Area */}
      {!rows.length ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer bg-white ${
            dragActive ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0073EA] flex items-center justify-center mx-auto mb-4 shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-slate-800">
            Upload your {selectedModule} file (.CSV, .XLSX, or .XLS)
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Drag and drop your spreadsheet here or click to browse. The engine will inspect columns, match CRM schemas automatically, and auto-provision any custom field attributes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center space-x-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>CSV, Excel 97-2004 (.xls), Excel (.xlsx)</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Smart Heuristic Header Mapping</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Enterprise Schema Validation</span>
            </span>
          </div>
        </div>
      ) : (
        /* File Loaded Inspection & Mapping Workspace */
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-bold text-slate-900 truncate text-sm">{fileName}</p>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                    {(fileSize / 1024).toFixed(1)} KB
                  </span>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.2 rounded-full border border-blue-200">
                    Target: {selectedModule}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-slate-800">{rows.length}</span> Records detected •{' '}
                  <span className="font-bold text-slate-800">{headers.length}</span> Columns identified •{' '}
                  <span className="font-bold text-emerald-600">
                    {mappings.filter(m => m.targetField !== '__IGNORE__').length}
                  </span> Columns matched
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => { setRows([]); setHeaders([]); setMappings([]); setImportResult(null); }}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Change File
              </button>
            </div>
          </div>

          {/* Mode Selector & Dynamic Field Generator Options */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Choose Import Strategy:</p>
                <p className="text-xs text-slate-500">Configure how columns are ingested and whether unmapped headers become new schema fields.</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setMappings(prev => prev.map(m => {
                      if (m.targetField === '__IGNORE__' || !m.targetField || m.targetField.startsWith('custom_')) {
                        const cleanCol = m.fileColumn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                        return {
                          ...m,
                          targetField: `custom_${cleanCol}`,
                          isCustomField: true,
                          createAsNewAttribute: true,
                          newAttributeLabel: m.newAttributeLabel || m.fileColumn.replace(/([A-Z])/g, ' $1').trim(),
                          newAttributeType: m.newAttributeType || m.inferredType || 'text'
                        };
                      }
                      return m;
                    }));
                    showToast('Mapped all unmapped spreadsheet columns to new dynamic fields!', 'success');
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Map All Columns to Fields</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={() => setImportMode('automatic')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
                  importMode === 'automatic'
                    ? 'border-[#0073EA] bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  importMode === 'automatic' ? 'border-[#0073EA] bg-[#0073EA] text-white' : 'border-slate-300'
                }`}>
                  {importMode === 'automatic' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>⚡ Intelligent Auto-Mapping &amp; Schema Provisioning</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.2 rounded">Recommended</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Auto-matches standard {selectedModule} fields with smart aliases and automatically converts any extra columns in your XLS/CSV into new custom fields with auto-inferred data types.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setImportMode('manual')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
                  importMode === 'manual'
                    ? 'border-[#0073EA] bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  importMode === 'manual' ? 'border-[#0073EA] bg-[#0073EA] text-white' : 'border-slate-300'
                }`}>
                  {importMode === 'manual' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    🛠️ Manual Schema &amp; Field Configuration
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Review and adjust each column's target CRM field, customize field labels, override data types, or ignore specific columns from importing.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic New Field Summary Alert */}
            {mappings.some(m => m.createAsNewAttribute || m.targetField.startsWith('custom_')) && (
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-indigo-950 font-medium">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong className="text-indigo-900">{mappings.filter(m => m.createAsNewAttribute || m.targetField.startsWith('custom_')).length} New Dynamic Fields</strong> will be automatically generated and provisioned into the <strong>{selectedModule}</strong> schema.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold">
                  Auto-Schema Provisioning
                </span>
              </div>
            )}
          </div>

          {/* Subtabs: Field Mapping Matrix vs Live Data Preview */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActivePreviewTab('mapping')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activePreviewTab === 'mapping'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Header Mapping Matrix ({mappings.length})</span>
            </button>
            <button
              onClick={() => setActivePreviewTab('preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activePreviewTab === 'preview'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Parsed Data Live Preview ({Math.min(5, rows.length)} of {rows.length} rows)</span>
            </button>
          </div>

          {/* TAB 1: INTERACTIVE MAPPING GRID */}
          {activePreviewTab === 'mapping' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Header-to-Field Mapping Matrix ({mappings.length} Columns)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {importMode === 'automatic'
                      ? 'Automatic schema mapping detected — headers with direct matches or aliases are highlighted in green.'
                      : 'Customize matching CRM fields or define new dynamic custom attributes for your entity.'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Spreadsheet Column</th>
                      <th className="py-3 px-4">Sample Values (First 3 Rows)</th>
                      <th className="py-3 px-4">Inferred Type</th>
                      <th className="py-3 px-4">Target CRM Field Mapping</th>
                      <th className="py-3 px-4">Mapping Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {mappings.map((m, idx) => {
                      const sampleValues = rows.slice(0, 3).map(r => r[m.fileColumn]).filter(v => v !== undefined && v !== null);
                      const isNewAttr = m.targetField.startsWith('custom_') || m.createAsNewAttribute;

                      return (
                        <tr key={m.fileColumn} className="hover:bg-slate-50/60 transition-colors">
                          {/* File Column */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span>{m.fileColumn}</span>
                            </div>
                          </td>

                          {/* Sample Values */}
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                            {sampleValues.length > 0 ? (
                              <span className="font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                {sampleValues.map(v => String(v)).join(' | ')}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Empty column</span>
                            )}
                          </td>

                          {/* Inferred Type */}
                          <td className="py-3 px-4">
                            <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                              {m.inferredType}
                            </span>
                          </td>

                          {/* Target Field Dropdown */}
                          <td className="py-3 px-4 min-w-[240px]">
                            <select
                              value={m.targetField}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMappings(prev => prev.map((item, i) => {
                                  if (i === idx) {
                                    const isCustom = val.startsWith('custom_') || val === '__CREATE_NEW__';
                                    const targetKey = val === '__CREATE_NEW__' ? `custom_${item.fileColumn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}` : val;
                                    return {
                                      ...item,
                                      targetField: targetKey,
                                      isCustomField: isCustom,
                                      createAsNewAttribute: isCustom && !existingCustomAttrs.some(ca => ca.name === targetKey),
                                      newAttributeLabel: item.newAttributeLabel || item.fileColumn.replace(/([A-Z])/g, ' $1').trim(),
                                      newAttributeType: item.newAttributeType || item.inferredType || 'text'
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            >
                              <optgroup label={`Standard ${selectedModule} Fields`}>
                                {stdFields.map(sf => (
                                  <option key={sf.key} value={sf.key}>{sf.label} ({sf.key})</option>
                                ))}
                              </optgroup>

                              {existingCustomAttrs.length > 0 && (
                                <optgroup label="Existing Custom Attributes">
                                  {existingCustomAttrs.map(ca => (
                                    <option key={ca.id} value={ca.name}>{ca.label} ({ca.name})</option>
                                  ))}
                                </optgroup>
                              )}

                              <optgroup label="Dynamic Schema Actions">
                                <option value={`custom_${m.fileColumn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`}>
                                  ➕ Auto-Create As New Field Attribute ({m.fileColumn})
                                </option>
                                <option value="__IGNORE__">❌ Do Not Import (Ignore Column)</option>
                              </optgroup>
                            </select>

                            {/* If dynamic new attribute, allow fine-tuning label and type inline */}
                            {isNewAttr && m.targetField !== '__IGNORE__' && (
                              <div className="mt-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-bold text-indigo-900 shrink-0">Field Label:</span>
                                  <input
                                    type="text"
                                    value={m.newAttributeLabel || m.fileColumn}
                                    onChange={(e) => {
                                      const newLbl = e.target.value;
                                      setMappings(prev => prev.map((item, i) => i === idx ? { ...item, newAttributeLabel: newLbl } : item));
                                    }}
                                    className="px-2 py-0.5 bg-white border border-indigo-200 rounded text-xs text-indigo-950 font-medium flex-1"
                                    placeholder="Display Label"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-bold text-indigo-900 shrink-0">Field Type:</span>
                                  <select
                                    value={m.newAttributeType || m.inferredType || 'text'}
                                    onChange={(e) => {
                                      const newTp = e.target.value as FieldAttributeType;
                                      setMappings(prev => prev.map((item, i) => i === idx ? { ...item, newAttributeType: newTp } : item));
                                    }}
                                    className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded text-[11px] text-indigo-900 font-medium flex-1"
                                  >
                                    <option value="text">Text (Single-line)</option>
                                    <option value="number">Number (Integer / Float)</option>
                                    <option value="currency">Currency (₹)</option>
                                    <option value="date">Date</option>
                                    <option value="boolean">Boolean (Yes / No)</option>
                                    <option value="email">Email Address</option>
                                    <option value="url">Web URL</option>
                                    <option value="select">Dropdown Select</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Schema Action Badge */}
                          <td className="py-3 px-4">
                            {m.targetField === '__IGNORE__' ? (
                              <span className="text-[11px] text-slate-400 font-medium">Skipped</span>
                            ) : isNewAttr ? (
                              <span className="inline-flex items-center space-x-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                                <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                                <span>Auto-Provision Field</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Mapped: {m.targetField}</span>
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
          )}

          {/* TAB 2: PARSED DATA LIVE PREVIEW */}
          {activePreviewTab === 'preview' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Raw &amp; Mapped Preview Table (First {Math.min(5, rows.length)} Rows)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live verification of imported data rows before writing to the database.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      {headers.map(h => {
                        const m = mappings.find(map => map.fileColumn === h);
                        const isIgnored = m?.targetField === '__IGNORE__';
                        return (
                          <th key={h} className={`py-2.5 px-3 whitespace-nowrap ${isIgnored ? 'opacity-40 line-through' : ''}`}>
                            <div>{h}</div>
                            {m && !isIgnored && (
                              <div className="text-[9px] font-mono text-blue-600 normal-case font-normal">
                                → {m.targetField}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{rIdx + 1}</td>
                        {headers.map(h => {
                          const m = mappings.find(map => map.fileColumn === h);
                          const isIgnored = m?.targetField === '__IGNORE__';
                          return (
                            <td key={h} className={`py-2.5 px-3 max-w-xs truncate ${isIgnored ? 'text-slate-300' : 'text-slate-700'}`}>
                              {String(row[h] ?? '—')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress Banner when Processing */}
          {isProcessing && (
            <div className="p-5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                <span className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>{progressStage}</span>
                </span>
                <span className="font-mono text-indigo-600">{progressPercent}%</span>
              </div>
              <div className="w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs gap-3">
            <div className="text-xs text-slate-500">
              Ready to create <span className="font-bold text-slate-900">{rows.length}</span> new records in{' '}
              <span className="font-bold text-blue-600">{selectedModule === 'Users' ? 'Staff Personnel Roster' : selectedModule}</span>.
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-3 bg-[#0073EA] hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Records &amp; Provisioning Schemas ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Bulk {selectedModule} Import ({rows.length} Records)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Import Result Card Modal / Banner */}
      {importResult && (
        <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bulk Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500">
                  Imported from <span className="font-bold text-slate-800">{importResult.fileName}</span> via {importResult.mode} mapping.
                </p>
              </div>
            </div>

            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule(importResult.module === 'Users' ? 'users' : importResult.module.toLowerCase())}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>View in {importResult.module === 'Users' ? 'Personnel Roster' : importResult.module}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Records Ingested</p>
              <p className="text-2xl font-black text-emerald-800 mt-1">{importResult.successCount} / {importResult.totalRows}</p>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl">
              <p className="text-[10px] font-bold text-indigo-700 uppercase">Custom Attributes Created</p>
              <p className="text-2xl font-black text-indigo-800 mt-1">{importResult.createdFields.length}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Target Entity</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{importResult.module}</p>
            </div>
          </div>

          {/* Newly Created Field Attributes Summary */}
          {importResult.createdFields.length > 0 && (
            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 space-y-2">
              <p className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dynamic Field Attributes Provisioned into {importResult.module} Schema:</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {importResult.createdFields.map(cf => (
                  <div key={cf.id} className="bg-white border border-indigo-200 px-2.5 py-1 rounded-xl text-xs flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{cf.label}</span>
                    <code className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded">{cf.name}</code>
                    <span className="text-[10px] text-slate-400 capitalize">({cf.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Created Records List */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-700">Created Record Summary Preview:</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {importResult.createdRecordsSummary.map((rec, i) => (
                <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                  {rec}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
