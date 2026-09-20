import {
  Task,
  MarketingProject,
  Campaign,
  LeadGenDataset,
  DatasetRecord,
  Invoice,
  Payment,
  Expense
} from '../types';

// ==========================================
// TASKS / DAILY WORK QUEUE (seed)
// ==========================================

const today = new Date();
const iso = (daysFromToday: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
};

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task_1',
    companyId: 'comp_amrut_india',
    title: 'Call Mahesh Kulkarni (TCS) re: Nagios renewal terms',
    description: 'Confirm renewal PO timeline and get sign-off on the updated quote.',
    type: 'Call',
    status: 'Open',
    priority: 'High',
    dueDate: iso(0),
    dueTime: '11:00',
    assignedToId: 'usr_sales_rajesh',
    assignedToName: 'Rajesh Kumar',
    createdById: 'usr_mgr_sanjay',
    createdByName: 'Sanjay Deshmukh',
    linkedEntityType: 'Opportunity',
    linkedEntityId: 'opp_prev_10',
    linkedEntityName: 'TCS - Nagios XI Enterprise Renewal (500 Nodes)',
    source: 'Manual',
    createdDate: iso(-2) + 'T09:00:00Z',
    modifiedDate: iso(-2) + 'T09:00:00Z'
  },
  {
    id: 'task_2',
    companyId: 'comp_amrut_india',
    title: 'Send BANT-qualified deck to Infosys BPM',
    type: 'Email',
    status: 'Open',
    priority: 'Medium',
    dueDate: iso(0),
    dueTime: '15:00',
    assignedToId: 'usr_sales_priya',
    assignedToName: 'Priya Sharma',
    createdById: 'usr_sales_priya',
    createdByName: 'Priya Sharma',
    linkedEntityType: 'Opportunity',
    linkedEntityId: 'opp_204',
    linkedEntityName: 'Infosys - JetBrains All Products Pack Renewal & Add-on (500 Lic)',
    source: 'Manual',
    createdDate: iso(-1) + 'T09:00:00Z',
    modifiedDate: iso(-1) + 'T09:00:00Z'
  },
  {
    id: 'task_3',
    companyId: 'comp_amrut_india',
    title: 'Follow up with Reliance Jio on new lead — no response in 3 days',
    type: 'Follow-up',
    status: 'Overdue',
    priority: 'Urgent',
    dueDate: iso(-1),
    assignedToId: 'usr_sales_rajesh',
    assignedToName: 'Rajesh Kumar',
    createdById: 'usr_coordinator_sneha',
    createdByName: 'Sneha Kulkarni',
    linkedEntityType: 'Lead',
    linkedEntityId: 'opp_202',
    linkedEntityName: 'Reliance Jio Infocomm Ltd',
    source: 'Manual',
    createdDate: iso(-4) + 'T09:00:00Z',
    modifiedDate: iso(-4) + 'T09:00:00Z'
  },
  {
    id: 'task_4',
    companyId: 'comp_amrut_india',
    title: 'AI-suggested: prep discovery questions before HDFC demo',
    description: 'Generated from calendar event "HDFC Bank — Security Platform Discovery Call".',
    type: 'Internal',
    status: 'Open',
    priority: 'Medium',
    dueDate: iso(1),
    assignedToId: 'usr_sales_priya',
    assignedToName: 'Priya Sharma',
    createdById: 'usr_sales_priya',
    createdByName: 'Priya Sharma',
    source: 'AI Suggested',
    createdDate: iso(0) + 'T07:00:00Z',
    modifiedDate: iso(0) + 'T07:00:00Z'
  },
  {
    id: 'task_5',
    companyId: 'comp_amrut_india',
    title: 'Review Q3 Google Ads campaign spend vs. budget',
    type: 'Internal',
    status: 'Open',
    priority: 'Medium',
    dueDate: iso(2),
    assignedToId: 'usr_mktg_mgr_sunita',
    assignedToName: 'Sunita Rao',
    createdById: 'usr_mktg_admin_zoya',
    createdByName: 'Zoya Khan',
    linkedEntityType: 'Campaign',
    linkedEntityId: 'camp_1',
    linkedEntityName: 'FY26 Q3 — DevOps Tooling Google Ads Push',
    source: 'Manual',
    createdDate: iso(-3) + 'T09:00:00Z',
    modifiedDate: iso(-3) + 'T09:00:00Z'
  },
  {
    id: 'task_6',
    companyId: 'comp_amrut_india',
    title: 'Enrich and dedupe new LinkedIn export before handoff to Sales',
    type: 'Internal',
    status: 'Completed',
    priority: 'Low',
    dueDate: iso(-1),
    assignedToId: 'usr_leadgen_rahul',
    assignedToName: 'Rahul Mehta',
    createdById: 'usr_leadgen_mgr_deepak',
    createdByName: 'Deepak Joshi',
    linkedEntityType: 'Campaign',
    linkedEntityId: 'camp_2',
    linkedEntityName: 'BFSI DevOps Decision-Makers — LinkedIn Outreach',
    source: 'Manual',
    completedDate: iso(-1) + 'T18:00:00Z',
    createdDate: iso(-3) + 'T09:00:00Z',
    modifiedDate: iso(-1) + 'T18:00:00Z'
  }
];

// ==========================================
// MARKETING PROJECTS (seed)
// ==========================================

export const INITIAL_MARKETING_PROJECTS: MarketingProject[] = [
  {
    id: 'proj_devops_modernization',
    companyId: 'comp_amrut_india',
    name: 'DevOps Modernization — FY26',
    code: 'PRJ-DEVOPS-26',
    description: 'Demand generation for observability, CI/CD and IDE tooling across enterprise BFSI & IT services accounts.',
    objective: 'Generate 400 MQLs and 60 SQLs across Atlassian, Nagios and JetBrains product lines in FY26.',
    ownerId: 'usr_mktg_mgr_sunita',
    ownerName: 'Sunita Rao',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    budget: 4200000,
    spend: 1685000,
    status: 'Active',
    targetVendorIds: ['v_atlassian', 'v_nagios', 'v_jetbrains'],
    targetIndustries: ['BFSI', 'IT Services', 'Telecom'],
    targetRegions: ['India', 'Middle East'],
    createdDate: '2026-03-15T09:00:00Z'
  },
  {
    id: 'proj_security_expansion',
    companyId: 'comp_amrut_middleeast',
    name: 'MEA Cybersecurity Expansion',
    code: 'PRJ-MEA-SEC-26',
    description: 'New-logo acquisition campaign for cybersecurity & infrastructure services in the UAE/GCC market.',
    objective: 'Build a 150-account target list and convert 25 qualified opportunities in H2 2026.',
    ownerId: 'usr_mktg_admin_zoya',
    ownerName: 'Zoya Khan',
    startDate: '2026-07-01',
    budget: 850000,
    spend: 210000,
    status: 'Active',
    targetVendorIds: ['v_microsoft'],
    targetIndustries: ['Government', 'Banking', 'Energy'],
    targetRegions: ['United Arab Emirates', 'Saudi Arabia'],
    createdDate: '2026-06-20T09:00:00Z'
  },
  {
    id: 'proj_apac_cloud',
    companyId: 'comp_amrut_global',
    name: 'APAC Cloud Engineering Push',
    code: 'PRJ-APAC-CLD-26',
    description: 'Webinar and partner-referral led pipeline build for cloud engineering services in Singapore/APAC.',
    objective: 'Fill H2 pipeline to 3x quota coverage via 6 webinars and partner co-marketing.',
    ownerId: 'usr_mktg_mgr_sunita',
    ownerName: 'Sunita Rao',
    startDate: '2026-05-01',
    budget: 320000,
    spend: 95000,
    status: 'Active',
    targetVendorIds: [],
    targetIndustries: ['Fintech', 'Logistics'],
    targetRegions: ['Singapore', 'Malaysia'],
    createdDate: '2026-04-25T09:00:00Z'
  }
];

// ==========================================
// CAMPAIGNS (seed)
// ==========================================

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_1',
    companyId: 'comp_amrut_india',
    projectId: 'proj_devops_modernization',
    projectName: 'DevOps Modernization — FY26',
    name: 'FY26 Q3 — DevOps Tooling Google Ads Push',
    channel: 'Google Ads',
    status: 'Active',
    ownerId: 'usr_mktg_mgr_sunita',
    ownerName: 'Sunita Rao',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    budget: 600000,
    spend: 341000,
    targetAudienceSize: 85000,
    utmSource: 'google',
    utmCampaign: 'devops-tooling-q3',
    metrics: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 18420,
      responded: 640,
      leadsGenerated: 212,
      qualifiedLeads: 58,
      opportunitiesCreated: 9,
      revenueInfluenced: 18600000
    },
    createdDate: '2026-06-20T09:00:00Z',
    modifiedDate: '2026-08-15T09:00:00Z'
  },
  {
    id: 'camp_2',
    companyId: 'comp_amrut_india',
    projectId: 'proj_devops_modernization',
    projectName: 'DevOps Modernization — FY26',
    name: 'BFSI DevOps Decision-Makers — LinkedIn Outreach',
    channel: 'LinkedIn',
    status: 'Active',
    ownerId: 'usr_leadgen_mgr_deepak',
    ownerName: 'Deepak Joshi',
    startDate: '2026-07-15',
    endDate: '2026-10-15',
    budget: 380000,
    spend: 128000,
    targetAudienceSize: 2400,
    datasetId: 'ds_linkedin_bfsi',
    messagingTemplate: 'Hi {{first_name}}, noticed {{company}} is scaling its DevOps footprint — worth a 15-min chat on observability tooling that cut MTTR by 40% for similar BFSI teams?',
    utmSource: 'linkedin',
    utmCampaign: 'bfsi-devops-outreach',
    metrics: {
      sent: 2400,
      delivered: 2350,
      opened: 1180,
      clicked: 340,
      responded: 190,
      leadsGenerated: 74,
      qualifiedLeads: 21,
      opportunitiesCreated: 4,
      revenueInfluenced: 9200000
    },
    createdDate: '2026-07-01T09:00:00Z',
    modifiedDate: '2026-08-16T09:00:00Z'
  },
  {
    id: 'camp_3',
    companyId: 'comp_amrut_middleeast',
    projectId: 'proj_security_expansion',
    projectName: 'MEA Cybersecurity Expansion',
    name: 'GITEX-adjacent Security Roundtable — Dubai',
    channel: 'Event / Exhibition',
    status: 'Scheduled',
    ownerId: 'usr_mktg_admin_zoya',
    ownerName: 'Zoya Khan',
    startDate: '2026-10-12',
    endDate: '2026-10-14',
    budget: 250000,
    spend: 40000,
    targetAudienceSize: 120,
    metrics: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      responded: 0,
      leadsGenerated: 0,
      qualifiedLeads: 0,
      opportunitiesCreated: 0,
      revenueInfluenced: 0
    },
    createdDate: '2026-08-05T09:00:00Z',
    modifiedDate: '2026-08-05T09:00:00Z'
  },
  {
    id: 'camp_4',
    companyId: 'comp_amrut_global',
    projectId: 'proj_apac_cloud',
    projectName: 'APAC Cloud Engineering Push',
    name: 'Cloud Cost Optimization Webinar Series',
    channel: 'Webinar',
    status: 'Active',
    ownerId: 'usr_mktg_mgr_sunita',
    ownerName: 'Sunita Rao',
    startDate: '2026-06-01',
    endDate: '2026-11-30',
    budget: 120000,
    spend: 52000,
    targetAudienceSize: 1800,
    metrics: {
      sent: 1800,
      delivered: 1750,
      opened: 980,
      clicked: 410,
      responded: 165,
      leadsGenerated: 88,
      qualifiedLeads: 26,
      opportunitiesCreated: 5,
      revenueInfluenced: 620000
    },
    createdDate: '2026-05-20T09:00:00Z',
    modifiedDate: '2026-08-10T09:00:00Z'
  }
];

// ==========================================
// LEAD-GEN DATASETS + RECORDS (seed)
// ==========================================

export const INITIAL_DATASETS: LeadGenDataset[] = [
  {
    id: 'ds_linkedin_bfsi',
    companyId: 'comp_amrut_india',
    projectId: 'proj_devops_modernization',
    name: 'BFSI DevOps Leaders — LinkedIn Sales Navigator Export',
    description: 'VP/Director-level DevOps & Platform Engineering leaders at Indian BFSI enterprises.',
    sourceType: 'LinkedIn Export',
    fileName: 'linkedin_bfsi_devops_aug2026.csv',
    totalRecords: 2400,
    validRecords: 2350,
    duplicateRecords: 50,
    convertedToLeadsCount: 74,
    uploadedById: 'usr_leadgen_rahul',
    uploadedByName: 'Rahul Mehta',
    tags: ['BFSI', 'DevOps', 'Q3-2026'],
    createdDate: '2026-07-01T09:00:00Z'
  },
  {
    id: 'ds_gitex_scan',
    companyId: 'comp_amrut_middleeast',
    projectId: 'proj_security_expansion',
    name: 'GITEX 2025 Badge Scans — Security Track',
    description: 'Booth scans from GITEX Technology Week security & infrastructure track.',
    sourceType: 'Trade Show Scan',
    fileName: 'gitex_2025_security_scans.xlsx',
    totalRecords: 640,
    validRecords: 610,
    duplicateRecords: 30,
    convertedToLeadsCount: 42,
    uploadedById: 'usr_mktg_admin_zoya',
    uploadedByName: 'Zoya Khan',
    tags: ['GITEX', 'Security', 'Government'],
    createdDate: '2026-06-10T09:00:00Z'
  }
];

export const INITIAL_DATASET_RECORDS: DatasetRecord[] = [
  {
    id: 'dr_1',
    datasetId: 'ds_linkedin_bfsi',
    companyId: 'comp_amrut_india',
    companyName: 'Kotak Mahindra Bank',
    contactName: 'Rohan Deshpande',
    contactEmail: 'rohan.deshpande@kotak-example.com',
    contactPhone: '+91 98330 11223',
    designation: 'VP - Platform Engineering',
    industry: 'BFSI',
    city: 'Mumbai',
    country: 'India',
    status: 'Converted to Lead',
    convertedLeadId: 'lead_ext_1',
    createdDate: '2026-07-02T09:00:00Z'
  },
  {
    id: 'dr_2',
    datasetId: 'ds_linkedin_bfsi',
    companyId: 'comp_amrut_india',
    companyName: 'Axis Bank',
    contactName: 'Sneha Iyer',
    contactEmail: 'sneha.iyer@axisbank-example.com',
    designation: 'Director - DevOps',
    industry: 'BFSI',
    city: 'Bengaluru',
    country: 'India',
    status: 'Enriched',
    createdDate: '2026-07-03T09:00:00Z'
  },
  {
    id: 'dr_3',
    datasetId: 'ds_linkedin_bfsi',
    companyId: 'comp_amrut_india',
    companyName: 'Kotak Mahindra Bank',
    contactName: 'Rohan Deshpande',
    contactEmail: 'rohan.deshpande@kotak-example.com',
    industry: 'BFSI',
    city: 'Mumbai',
    country: 'India',
    status: 'Duplicate',
    createdDate: '2026-07-05T09:00:00Z'
  },
  {
    id: 'dr_4',
    datasetId: 'ds_gitex_scan',
    companyId: 'comp_amrut_middleeast',
    companyName: 'Dubai Electricity & Water Authority',
    contactName: 'Ahmed Al Farsi',
    contactEmail: 'ahmed.alfarsi@dewa-example.ae',
    designation: 'Head of Infrastructure Security',
    industry: 'Energy',
    city: 'Dubai',
    country: 'United Arab Emirates',
    status: 'New',
    createdDate: '2026-06-11T09:00:00Z'
  }
];

// ==========================================
// FINANCE: INVOICES / PAYMENTS / EXPENSES (seed)
// ==========================================

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv_1001',
    invoiceNumber: 'INV-2026-1001',
    companyId: 'comp_amrut_india',
    orderId: 'ord_602',
    orderNumber: 'SO-2026-0398',
    accountId: 'acc_tcs',
    accountName: 'Tata Consultancy Services Ltd',
    salespersonId: 'usr_sales_rajesh',
    salespersonName: 'Rajesh Kumar',
    currency: 'INR (₹)',
    items: [
      { id: 'li_1', description: 'Nagios XI Enterprise License & Maintenance (500 Nodes)', quantity: 1, unitPrice: 4800000, taxPercent: 18, amount: 4800000 },
      { id: 'li_2', description: 'Deployment & Migration Services', quantity: 1, unitPrice: 600000, taxPercent: 18, amount: 600000 }
    ],
    subtotal: 5400000,
    taxAmount: 972000,
    grandTotal: 6372000,
    amountPaid: 6372000,
    balanceDue: 0,
    invoiceDate: '2026-06-22',
    dueDate: '2026-07-22',
    status: 'Paid',
    notes: 'Paid in full on 30-day credit term.',
    createdDate: '2026-06-22T10:00:00Z'
  },
  {
    id: 'inv_1002',
    invoiceNumber: 'INV-2026-1002',
    companyId: 'comp_amrut_india',
    orderId: 'ord_601',
    orderNumber: 'SO-2026-0412',
    accountId: 'acc_infosys',
    accountName: 'Infosys BPM & Digital',
    salespersonId: 'usr_sales_priya',
    salespersonName: 'Priya Sharma',
    currency: 'INR (₹)',
    items: [
      { id: 'li_3', description: 'JetBrains All Products Pack Enterprise Subscription (500 Lic)', quantity: 500, unitPrice: 22000, taxPercent: 18, amount: 11000000 }
    ],
    subtotal: 11000000,
    taxAmount: 1980000,
    grandTotal: 12980000,
    amountPaid: 6490000,
    balanceDue: 6490000,
    invoiceDate: '2026-08-09',
    dueDate: '2026-09-08',
    status: 'Partially Paid',
    notes: '50% advance received; balance due on delivery confirmation.',
    createdDate: '2026-08-09T10:00:00Z'
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay_1',
    companyId: 'comp_amrut_india',
    invoiceId: 'inv_1001',
    invoiceNumber: 'INV-2026-1001',
    accountId: 'acc_tcs',
    accountName: 'Tata Consultancy Services Ltd',
    amount: 6372000,
    currency: 'INR (₹)',
    method: 'Bank Transfer',
    referenceNumber: 'NEFT-TCS-88213',
    receivedDate: '2026-07-18',
    recordedById: 'usr_fin_ramesh',
    recordedByName: 'Ramesh Iyer',
    createdDate: '2026-07-18T12:00:00Z'
  },
  {
    id: 'pay_2',
    companyId: 'comp_amrut_india',
    invoiceId: 'inv_1002',
    invoiceNumber: 'INV-2026-1002',
    accountId: 'acc_infosys',
    accountName: 'Infosys BPM & Digital',
    amount: 6490000,
    currency: 'INR (₹)',
    method: 'Wire Transfer',
    referenceNumber: 'WIRE-INF-55021',
    receivedDate: '2026-08-12',
    recordedById: 'usr_fin_ramesh',
    recordedByName: 'Ramesh Iyer',
    notes: 'Advance payment (50%).',
    createdDate: '2026-08-12T12:00:00Z'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    companyId: 'comp_amrut_india',
    category: 'Marketing Spend',
    description: 'Google Ads spend — DevOps Tooling Q3 campaign',
    amount: 341000,
    currency: 'INR (₹)',
    linkedProjectId: 'proj_devops_modernization',
    linkedCampaignId: 'camp_1',
    incurredDate: '2026-08-01',
    approvedById: 'usr_mktg_admin_zoya',
    status: 'Approved',
    createdById: 'usr_mktg_mgr_sunita',
    createdByName: 'Sunita Rao',
    createdDate: '2026-08-01T09:00:00Z'
  },
  {
    id: 'exp_2',
    companyId: 'comp_amrut_middleeast',
    category: 'Marketing Spend',
    description: 'GITEX roundtable venue & catering deposit',
    amount: 40000,
    currency: 'AED ',
    linkedProjectId: 'proj_security_expansion',
    linkedCampaignId: 'camp_3',
    incurredDate: '2026-08-05',
    status: 'Pending Approval',
    createdById: 'usr_mktg_admin_zoya',
    createdByName: 'Zoya Khan',
    createdDate: '2026-08-05T09:00:00Z'
  }
];
