import {
  CompanyTenant,
  UserCompanyMembership,
  VendorSalesTarget,
  GoogleWorkspaceAccount,
  SyncedEmailItem,
  SyncedCalendarEvent
} from '../types';

// ==========================================
// SEED COMPANIES / TENANTS
// ==========================================

export const INITIAL_COMPANIES: CompanyTenant[] = [
  {
    id: 'comp_amrut_india',
    code: 'ASI',
    name: 'Amrut Software India Pvt Ltd',
    legalEntity: 'Amrut Software Solutions Pvt Ltd',
    domain: 'amrutsoftware.in',
    currency: 'INR',
    currencySymbol: '₹',
    country: 'India',
    city: 'Mumbai',
    taxRegistrationNumber: '27AABCA1234F1Z5',
    primaryContactEmail: 'contact@amrutsoftware.in',
    primaryContactPhone: '+91 22 4000 1234',
    themeColor: '#F25C05',
    industry: 'Enterprise Software & DevOps Consulting',
    annualSalesTarget: 185000000, // ₹18.5 Cr
    annualServicesTarget: 65000000, // ₹6.5 Cr
    isActive: true,
    createdDate: '2024-01-01T00:00:00Z',
    gstPercent: 18,
    renewalPriceIncreasePercent: 10,
    termsAndConditions: 'Prices are exclusive of applicable GST, which will be charged extra as per prevailing government rates. Quotation is valid for the period stated above; a fresh quote is required after expiry. Payment terms are as stated in this document unless a signed contract specifies otherwise. Delivery/activation timelines are estimates and depend on OEM/vendor processing time. This quotation does not constitute a binding order until a Purchase Order is issued and accepted by Amrut Software India Pvt Ltd. All disputes are subject to the exclusive jurisdiction of the courts in Mumbai, India.'
  },
  {
    id: 'comp_amrut_global',
    code: 'ASG',
    name: 'Amrut Global Solutions PTE',
    legalEntity: 'Amrut Global Pte. Ltd.',
    domain: 'amrutglobal.com',
    currency: 'USD',
    currencySymbol: '$',
    country: 'Singapore',
    city: 'Singapore',
    taxRegistrationNumber: 'SG-202399182C',
    primaryContactEmail: 'sales@amrutglobal.com',
    primaryContactPhone: '+65 6789 0123',
    themeColor: '#0284C7',
    industry: 'Cloud Engineering & Global IT Solutions',
    annualSalesTarget: 4200000, // $4.2M
    annualServicesTarget: 1800000, // $1.8M
    isActive: true,
    createdDate: '2024-06-01T00:00:00Z',
    gstPercent: 9,
    renewalPriceIncreasePercent: 8,
    termsAndConditions: 'Prices are exclusive of Singapore GST, which will be charged extra at the prevailing rate. Quotation is valid for the period stated above. Payment terms are as stated in this document unless a signed contract specifies otherwise. This quotation does not constitute a binding order until a Purchase Order is issued and accepted by Amrut Global Pte. Ltd. All disputes are subject to the exclusive jurisdiction of the courts of Singapore.'
  },
  {
    id: 'comp_amrut_middleeast',
    code: 'ASME',
    name: 'Amrut MEA Tech FZ-LLC',
    legalEntity: 'Amrut Middle East & Africa FZ-LLC',
    domain: 'amrutmea.ae',
    currency: 'AED',
    currencySymbol: 'AED ',
    country: 'United Arab Emirates',
    city: 'Dubai',
    taxRegistrationNumber: 'AE-1002938192',
    primaryContactEmail: 'mea@amrutmea.ae',
    primaryContactPhone: '+971 4 391 0000',
    themeColor: '#7C3AED',
    industry: 'Cybersecurity & IT Infrastructure Services',
    annualSalesTarget: 6800000, // 6.8M AED
    annualServicesTarget: 2900000, // 2.9M AED
    isActive: true,
    createdDate: '2025-01-15T00:00:00Z',
    gstPercent: 5,
    renewalPriceIncreasePercent: 8,
    termsAndConditions: 'Prices are exclusive of UAE VAT, which will be charged extra at the prevailing rate. Quotation is valid for the period stated above. Payment terms are as stated in this document unless a signed contract specifies otherwise. This quotation does not constitute a binding order until a Purchase Order is issued and accepted by Amrut Middle East & Africa FZ-LLC. All disputes are subject to the exclusive jurisdiction of the courts of Dubai, UAE.'
  }
];

// ==========================================
// USER COMPANY MEMBERSHIPS (Multi-tenant binds)
// ==========================================

export const INITIAL_COMPANY_MEMBERSHIPS: UserCompanyMembership[] = [
  // Abhay (Admin across all companies)
  {
    id: 'mem_abhay_india',
    userId: 'usr_admin',
    companyId: 'comp_amrut_india',
    companyName: 'Amrut Software India Pvt Ltd',
    companyCode: 'ASI',
    role: 'CRM Administrator',
    department: 'CRM & Enterprise Ops',
    territory: 'All Regions (India & Global)',
    vendorResponsibilities: [],
    isDefault: true,
    isActive: true
  },
  {
    id: 'mem_abhay_global',
    userId: 'usr_admin',
    companyId: 'comp_amrut_global',
    companyName: 'Amrut Global Solutions PTE',
    companyCode: 'ASG',
    role: 'CRM Administrator',
    department: 'Global Operations',
    territory: 'APAC & US',
    vendorResponsibilities: [],
    isDefault: false,
    isActive: true
  },
  {
    id: 'mem_abhay_mea',
    userId: 'usr_admin',
    companyId: 'comp_amrut_middleeast',
    companyName: 'Amrut MEA Tech FZ-LLC',
    companyCode: 'ASME',
    role: 'CRM Administrator',
    department: 'MEA Operations',
    territory: 'Dubai & GCC',
    vendorResponsibilities: [],
    isDefault: false,
    isActive: true
  },

  // Anand Sharma (Managing Director across all companies)
  {
    id: 'mem_anand_india',
    userId: 'usr_md_anand',
    companyId: 'comp_amrut_india',
    companyName: 'Amrut Software India Pvt Ltd',
    companyCode: 'ASI',
    role: 'Managing Director',
    department: 'Executive Leadership',
    territory: 'Global & All Territories',
    vendorResponsibilities: ['v_atlassian', 'v_nagios', 'v_jetbrains', 'v_microsoft', 'v_redhat'],
    isDefault: true,
    isActive: true
  },
  {
    id: 'mem_anand_global',
    userId: 'usr_md_anand',
    companyId: 'comp_amrut_global',
    companyName: 'Amrut Global Solutions PTE',
    companyCode: 'ASG',
    role: 'Managing Director',
    department: 'Executive Leadership',
    territory: 'Global & APAC',
    vendorResponsibilities: ['v_atlassian', 'v_jetbrains', 'v_microsoft'],
    isDefault: false,
    isActive: true
  },
  {
    id: 'mem_anand_mea',
    userId: 'usr_md_anand',
    companyId: 'comp_amrut_middleeast',
    companyName: 'Amrut MEA Tech FZ-LLC',
    companyCode: 'ASME',
    role: 'Managing Director',
    department: 'Executive Leadership',
    territory: 'Middle East & Africa',
    vendorResponsibilities: ['v_nagios', 'v_redhat'],
    isDefault: false,
    isActive: true
  },

  // Rajiv Varma (Sales Head in India, Senior Advisor in Global)
  {
    id: 'mem_rajiv_india',
    userId: 'usr_sales_head_rajiv',
    companyId: 'comp_amrut_india',
    companyName: 'Amrut Software India Pvt Ltd',
    companyCode: 'ASI',
    role: 'Sales Head',
    department: 'Enterprise Sales',
    territory: 'Pan-India & Strategic Accounts',
    vendorResponsibilities: ['v_atlassian'],
    isDefault: true,
    isActive: true
  },
  {
    id: 'mem_rajiv_global',
    userId: 'usr_sales_head_rajiv',
    companyId: 'comp_amrut_global',
    companyName: 'Amrut Global Solutions PTE',
    companyCode: 'ASG',
    role: 'Sales Head',
    department: 'Strategic Expansion',
    territory: 'SEA & North America',
    vendorResponsibilities: ['v_atlassian'],
    isDefault: false,
    isActive: true
  },

  // Rajesh Kulkarni (Direct Sales Person in India)
  {
    id: 'mem_rajesh_india',
    userId: 'usr_sales_rajesh',
    companyId: 'comp_amrut_india',
    companyName: 'Amrut Software India Pvt Ltd',
    companyCode: 'ASI',
    role: 'Sales Person',
    department: 'Direct Sales',
    territory: 'West India & Enterprise BFSI',
    vendorResponsibilities: [],
    isDefault: true,
    isActive: true
  },

  // Priya Sharma (Direct Sales Person in India)
  {
    id: 'mem_priya_india',
    userId: 'usr_sales_priya',
    companyId: 'comp_amrut_india',
    companyName: 'Amrut Software India Pvt Ltd',
    companyCode: 'ASI',
    role: 'Sales Person',
    department: 'Direct Sales',
    territory: 'North & East India',
    vendorResponsibilities: [],
    isDefault: true,
    isActive: true
  }
];

// ==========================================
// VENDOR & SERVICES SALES TARGETS (FY-2026)
// ==========================================

export const INITIAL_VENDOR_TARGETS: VendorSalesTarget[] = [
  // Rajiv Varma (Vendor Head for Atlassian: Rollup Target)
  {
    id: 'trg_rajiv_atlassian_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_head_rajiv',
    userName: 'Rajiv Varma',
    userRole: 'Sales Head (Vendor Lead)',
    vendorId: 'v_atlassian',
    vendorName: 'Atlassian',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 45000000, // ₹4.5 Cr
    productLicenseAchieved: 34200000,
    servicesTarget: 22000000, // ₹2.2 Cr Implementation & Migration
    servicesAchieved: 18500000,
    totalTarget: 67000000,
    totalAchieved: 52700000,
    achievementPercentage: 78.6,
    isVendorHeadTarget: true,
    subordinateTargetRollup: 45000000,
    subordinateAchievedRollup: 34200000
  },

  // Rajiv Varma - Personal target for JetBrains
  {
    id: 'trg_rajiv_jetbrains_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_head_rajiv',
    userName: 'Rajiv Varma',
    userRole: 'Sales Head',
    vendorId: 'v_jetbrains',
    vendorName: 'JetBrains',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 18000000,
    productLicenseAchieved: 14900000,
    servicesTarget: 5000000,
    servicesAchieved: 4200000,
    totalTarget: 23000000,
    totalAchieved: 19100000,
    achievementPercentage: 83.0,
    isVendorHeadTarget: false
  },

  // Rajesh Kulkarni - Targets across Atlassian, Microsoft, Nagios
  {
    id: 'trg_rajesh_atlassian_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_rajesh',
    userName: 'Rajesh Kulkarni',
    userRole: 'Sales Person',
    vendorId: 'v_atlassian',
    vendorName: 'Atlassian',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 20000000,
    productLicenseAchieved: 16800000,
    servicesTarget: 10000000,
    servicesAchieved: 8200000,
    totalTarget: 30000000,
    totalAchieved: 25000000,
    achievementPercentage: 83.3
  },
  {
    id: 'trg_rajesh_microsoft_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_rajesh',
    userName: 'Rajesh Kulkarni',
    userRole: 'Sales Person',
    vendorId: 'v_microsoft',
    vendorName: 'Microsoft',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 15000000,
    productLicenseAchieved: 11400000,
    servicesTarget: 6000000,
    servicesAchieved: 4500000,
    totalTarget: 21000000,
    totalAchieved: 15900000,
    achievementPercentage: 75.7
  },
  {
    id: 'trg_rajesh_nagios_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_rajesh',
    userName: 'Rajesh Kulkarni',
    userRole: 'Sales Person',
    vendorId: 'v_nagios',
    vendorName: 'Nagios',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 8000000,
    productLicenseAchieved: 7100000,
    servicesTarget: 4000000,
    servicesAchieved: 3900000,
    totalTarget: 12000000,
    totalAchieved: 11000000,
    achievementPercentage: 91.6
  },

  // Priya Sharma - Targets across Atlassian, Red Hat, JetBrains
  {
    id: 'trg_priya_atlassian_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_priya',
    userName: 'Priya Sharma',
    userRole: 'Sales Person',
    vendorId: 'v_atlassian',
    vendorName: 'Atlassian',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 18000000,
    productLicenseAchieved: 13200000,
    servicesTarget: 8000000,
    servicesAchieved: 6800000,
    totalTarget: 26000000,
    totalAchieved: 20000000,
    achievementPercentage: 76.9
  },
  {
    id: 'trg_priya_redhat_2026',
    companyId: 'comp_amrut_india',
    userId: 'usr_sales_priya',
    userName: 'Priya Sharma',
    userRole: 'Sales Person',
    vendorId: 'v_redhat',
    vendorName: 'Red Hat',
    period: 'FY-2026',
    year: 2026,
    productLicenseTarget: 12000000,
    productLicenseAchieved: 9500000,
    servicesTarget: 5000000,
    servicesAchieved: 4100000,
    totalTarget: 17000000,
    totalAchieved: 13600000,
    achievementPercentage: 80.0
  }
];

// ==========================================
// GOOGLE WORKSPACE SEED ACCOUNT & EMAILS
// ==========================================

export const INITIAL_GOOGLE_ACCOUNTS: GoogleWorkspaceAccount[] = [
  {
    id: 'gw_abhay',
    userId: 'usr_admin',
    companyId: 'comp_amrut_india',
    googleEmail: 'abhay@amrutsoftware.com',
    isConnected: true,
    connectedAt: '2026-08-01T09:00:00Z',
    lastSyncedAt: '2026-08-18T22:30:00Z',
    syncCalendarEnabled: true,
    syncEmailEnabled: true,
    autoCreateEventsFromEmails: true,
    totalEmailsScanned: 184,
    actionableEmailsFound: 14,
    eventsCreatedCount: 9
  },
  {
    id: 'gw_rajiv',
    userId: 'usr_sales_head_rajiv',
    companyId: 'comp_amrut_india',
    googleEmail: 'rajiv.varma@amrutsoftware.com',
    isConnected: true,
    connectedAt: '2026-08-05T10:15:00Z',
    lastSyncedAt: '2026-08-18T21:45:00Z',
    syncCalendarEnabled: true,
    syncEmailEnabled: true,
    autoCreateEventsFromEmails: true,
    totalEmailsScanned: 242,
    actionableEmailsFound: 28,
    eventsCreatedCount: 16
  }
];

export const INITIAL_SYNCED_EMAILS: SyncedEmailItem[] = [
  {
    id: 'eml_001',
    accountId: 'acc_hdfc',
    accountName: 'HDFC Bank Ltd',
    opportunityId: 'opp_001',
    opportunityTitle: 'Jira Software Data Center 2000 Users Renewal + Premium Support',
    senderEmail: 'suresh.menon@hdfcbank.com',
    senderName: 'Suresh Menon (VP Engineering)',
    recipientEmail: 'rajiv.varma@amrutsoftware.com',
    subject: 'RE: Commercial Proposal for Jira DC 2000 Users + Cloud Migration Scope',
    snippet: 'Rajiv, we reviewed your quote AMT-QT-2026-004. Management has approved the ₹48L budget for Q3. Can you schedule a technical walkthrough with your migration team this Thursday at 3:00 PM?',
    fullBody: 'Dear Rajiv,\n\nWe have reviewed the commercial proposal AMT-QT-2026-004 sent last week. The procurement committee has cleared the budget for our Jira Data Center renewal and the planned Cloud migration readiness consulting.\n\nPlease organize a 45-minute technical review call this Thursday at 3:00 PM IST with your principal Atlassian architect to finalize migration timelines and SLA terms.\n\nWarm regards,\nSuresh Menon\nVP - Engineering Platforms, HDFC Bank',
    receivedAt: '2026-08-18T14:30:00Z',
    isHighPriority: true,
    category: 'RFP / Quote Request',
    extractedAction: {
      actionType: 'Create Calendar Event',
      suggestedDate: '2026-08-20T15:00:00+05:30',
      suggestedTitle: 'HDFC Bank - Jira DC Technical & Migration Review',
      confidenceScore: 0.95,
      status: 'Pending'
    }
  },
  {
    id: 'eml_002',
    accountId: 'acc_tcs',
    accountName: 'Tata Consultancy Services',
    opportunityId: 'opp_002',
    opportunityTitle: 'JetBrains All Products Pack 500 Subscriptions',
    senderEmail: 'arun.nair@tcs.com',
    senderName: 'Arun Nair (Procurement Head)',
    recipientEmail: 'rajesh.kulkarni@amrutsoftware.com',
    subject: 'Urgent: PO Approval for JetBrains All Products Pack Enterprise Tier',
    snippet: 'Hi Rajesh, Purchase Order #TCS-PO-88219 has been signed off for 500 licenses. Please verify OEM registration and deliver license certificates by end of month.',
    fullBody: 'Hi Rajesh,\n\nGlad to inform you that PO #TCS-PO-88219 for ₹36,50,000 has been signed off. Please confirm the license provision keys and coordinate with JetBrains OEM support.\n\nThanks,\nArun Nair',
    receivedAt: '2026-08-18T11:15:00Z',
    isHighPriority: true,
    category: 'BANT Signal',
    extractedAction: {
      actionType: 'Update Stage',
      suggestedTitle: 'Move Opportunity to Verbal / Intent to Order',
      confidenceScore: 0.92,
      status: 'Pending'
    }
  },
  {
    id: 'eml_003',
    accountId: 'acc_icici',
    accountName: 'ICICI Lombard Insurance',
    senderEmail: 'anita.deshmukh@icicilombard.com',
    senderName: 'Anita Deshmukh (IT Infrastructure Lead)',
    recipientEmail: 'priya.sharma@amrutsoftware.com',
    subject: 'Nagios XI Enterprise Monitoring for Hybrid Cloud - RFP Discussion',
    snippet: 'Hello Priya, we are finalizing our monitoring tool stack for 1200+ servers. Need your team to demo Nagios XI and share implementation service estimates on Friday 11:00 AM.',
    receivedAt: '2026-08-17T16:45:00Z',
    isHighPriority: true,
    category: 'Meeting Request',
    extractedAction: {
      actionType: 'Create Calendar Event',
      suggestedDate: '2026-08-21T11:00:00+05:30',
      suggestedTitle: 'ICICI Lombard - Nagios XI Demo & Service Sizing',
      confidenceScore: 0.94,
      status: 'Pending'
    }
  }
];

export const INITIAL_SYNCED_EVENTS: SyncedCalendarEvent[] = [
  {
    id: 'evt_001',
    googleEventId: 'gcal_892019',
    userId: 'usr_sales_head_rajiv',
    companyId: 'comp_amrut_india',
    title: 'HDFC Bank - Jira DC Technical Architecture & Migration Sizing',
    description: 'Walkthrough of migration playbook, staging environments, and annual support SLAs.',
    startDateTime: '2026-08-20T15:00:00+05:30',
    endDateTime: '2026-08-20T16:00:00+05:30',
    location: 'Google Meet (meet.google.com/amr-hdfc-jira)',
    meetLink: 'https://meet.google.com/amr-hdfc-jira',
    attendees: [
      { name: 'Rajiv Varma', email: 'rajiv.varma@amrutsoftware.com', status: 'accepted' },
      { name: 'Suresh Menon', email: 'suresh.menon@hdfcbank.com', status: 'accepted' },
      { name: 'Sneha Rao', email: 'sneha.rao@amrutsoftware.com', status: 'accepted' }
    ],
    linkedEntityType: 'Opportunity',
    linkedEntityId: 'opp_001',
    linkedEntityName: 'HDFC Bank - Jira DC 2000 Users',
    createdVia: 'Gmail AI Parser',
    status: 'Scheduled'
  },
  {
    id: 'evt_002',
    googleEventId: 'gcal_892020',
    userId: 'usr_admin',
    companyId: 'comp_amrut_india',
    title: 'Atlassian OEM Partner Q3 Pipeline Review & MDF Allocation',
    description: 'Quarterly review with Atlassian India Channel Director on enterprise pipeline and services target.',
    startDateTime: '2026-08-21T14:00:00+05:30',
    endDateTime: '2026-08-21T15:00:00+05:30',
    location: 'Atlassian Bangalore Office / Virtual Bridge',
    meetLink: 'https://meet.google.com/atl-amr-q3rev',
    attendees: [
      { name: 'Abhay', email: 'abhay@amrutsoftware.com', status: 'accepted' },
      { name: 'Anand Sharma', email: 'anand.sharma@amrutsoftware.com', status: 'accepted' },
      { name: 'Rajiv Varma', email: 'rajiv.varma@amrutsoftware.com', status: 'accepted' }
    ],
    linkedEntityType: 'Account',
    linkedEntityId: 'v_atlassian',
    linkedEntityName: 'Atlassian Partner Channel',
    createdVia: 'Google Sync',
    status: 'Scheduled'
  }
];
