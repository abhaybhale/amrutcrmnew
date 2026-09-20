import { Product, RenewalRecord } from '../types';

// ==========================================
// PRODUCT CATALOG — seeded from each vendor's existing focusProducts list,
// now with a real list price so Leads/Opportunities/Quotes can pick a
// specific SKU instead of typing a product name freehand. Manageable going
// forward from Admin → Product Catalog.
// ==========================================

export const INITIAL_PRODUCTS: Product[] = [
  // Atlassian
  { id: 'prod_atl_jira_dc', vendorId: 'v_atlassian', vendorName: 'Atlassian', name: 'Jira Software Data Center', listPrice: 1850000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_atl_jsm_cloud', vendorId: 'v_atlassian', vendorName: 'Atlassian', name: 'Jira Service Management Cloud', listPrice: 620000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_atl_confluence', vendorId: 'v_atlassian', vendorName: 'Atlassian', name: 'Confluence', listPrice: 410000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_atl_bitbucket', vendorId: 'v_atlassian', vendorName: 'Atlassian', name: 'Bitbucket', listPrice: 285000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_atl_guard', vendorId: 'v_atlassian', vendorName: 'Atlassian', name: 'Atlassian Guard (Access)', listPrice: 340000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },

  // Nagios Enterprises
  { id: 'prod_nag_xi', vendorId: 'v_nagios', vendorName: 'Nagios Enterprises', name: 'Nagios XI Enterprise', listPrice: 980000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_nag_log', vendorId: 'v_nagios', vendorName: 'Nagios Enterprises', name: 'Nagios Log Server', listPrice: 540000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_nag_netan', vendorId: 'v_nagios', vendorName: 'Nagios Enterprises', name: 'Nagios Network Analyzer', listPrice: 460000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_nag_fusion', vendorId: 'v_nagios', vendorName: 'Nagios Enterprises', name: 'Nagios Fusion', listPrice: 690000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },

  // JetBrains
  { id: 'prod_jb_idea', vendorId: 'v_jetbrains', vendorName: 'JetBrains', name: 'IntelliJ IDEA Ultimate', listPrice: 52000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_jb_allproducts', vendorId: 'v_jetbrains', vendorName: 'JetBrains', name: 'All Products Pack', listPrice: 98000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_jb_teamcity', vendorId: 'v_jetbrains', vendorName: 'JetBrains', name: 'TeamCity Enterprise', listPrice: 780000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_jb_youtrack', vendorId: 'v_jetbrains', vendorName: 'JetBrains', name: 'YouTrack', listPrice: 315000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_jb_space', vendorId: 'v_jetbrains', vendorName: 'JetBrains', name: 'Space', listPrice: 265000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },

  // Microsoft Corp
  { id: 'prod_ms_azdo', vendorId: 'v_microsoft', vendorName: 'Microsoft Corp', name: 'Azure DevOps Server', listPrice: 1250000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_ms_ghe', vendorId: 'v_microsoft', vendorName: 'Microsoft Corp', name: 'GitHub Enterprise', listPrice: 1480000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_ms_m365e5', vendorId: 'v_microsoft', vendorName: 'Microsoft Corp', name: 'Microsoft 365 E5', listPrice: 2650000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_ms_pbi', vendorId: 'v_microsoft', vendorName: 'Microsoft Corp', name: 'Power BI Premium', listPrice: 920000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },

  // Red Hat (IBM)
  { id: 'prod_rh_ocp', vendorId: 'v_redhat', vendorName: 'Red Hat (IBM)', name: 'Red Hat OpenShift Platform Plus', listPrice: 3200000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_rh_ansible', vendorId: 'v_redhat', vendorName: 'Red Hat (IBM)', name: 'Red Hat Ansible Automation Platform', listPrice: 1650000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' },
  { id: 'prod_rh_rhel', vendorId: 'v_redhat', vendorName: 'Red Hat (IBM)', name: 'RHEL Server', listPrice: 380000, currency: 'INR', isActive: true, createdDate: '2024-01-10T00:00:00Z' }
];

// ==========================================
// RENEWAL BOARD — a small starter set showing what a year's worth of
// imported renewals looks like. Real usage: Admin/Sales Head bulk-import
// the full year via Admin → Bulk Data Import, then the board is worked
// from here (status changes, reassignment) rather than re-imported.
// ==========================================

export const INITIAL_RENEWAL_RECORDS: RenewalRecord[] = [
  {
    id: 'ren_001',
    companyId: 'comp_amrut_india',
    accountId: 'acc_tcs',
    accountName: 'Tata Consultancy Services Ltd',
    vendorId: 'v_atlassian',
    vendorName: 'Atlassian',
    product: 'Jira Software Data Center',
    salespersonId: 'usr_sales_rajesh',
    salespersonName: 'Rajesh Kumar',
    renewalDate: '2026-09-15',
    previousValue: 1850000,
    suggestedRenewalValue: 2035000,
    currency: 'INR',
    status: 'Upcoming',
    importedById: 'usr_admin',
    importedByName: 'Abhay',
    createdDate: '2026-01-05T00:00:00Z'
  },
  {
    id: 'ren_002',
    companyId: 'comp_amrut_india',
    accountId: 'acc_jio',
    accountName: 'Reliance Jio Infocomm Ltd',
    vendorId: 'v_nagios',
    vendorName: 'Nagios Enterprises',
    product: 'Nagios XI Enterprise',
    salespersonId: 'usr_sales_rajesh',
    salespersonName: 'Rajesh Kumar',
    renewalDate: '2026-10-02',
    previousValue: 980000,
    suggestedRenewalValue: 1078000,
    currency: 'INR',
    status: 'Contacted',
    importedById: 'usr_admin',
    importedByName: 'Abhay',
    createdDate: '2026-01-05T00:00:00Z'
  },
  {
    id: 'ren_003',
    companyId: 'comp_amrut_india',
    accountId: 'acc_hdfc',
    accountName: 'HDFC Bank Ltd',
    vendorId: 'v_redhat',
    vendorName: 'Red Hat (IBM)',
    product: 'Red Hat OpenShift Platform Plus',
    salespersonId: 'usr_sales_priya',
    salespersonName: 'Priya Sharma',
    renewalDate: '2026-11-20',
    previousValue: 3200000,
    suggestedRenewalValue: 3520000,
    currency: 'INR',
    status: 'Quoted',
    importedById: 'usr_admin',
    importedByName: 'Abhay',
    createdDate: '2026-01-05T00:00:00Z'
  },
  {
    id: 'ren_004',
    companyId: 'comp_amrut_india',
    accountId: 'acc_infosys',
    accountName: 'Infosys BPM & Digital',
    vendorId: 'v_jetbrains',
    vendorName: 'JetBrains',
    product: 'All Products Pack',
    salespersonId: 'usr_sales_priya',
    salespersonName: 'Priya Sharma',
    renewalDate: '2026-08-30',
    previousValue: 98000,
    suggestedRenewalValue: 107800,
    currency: 'INR',
    status: 'At Risk',
    notes: 'Customer flagged budget freeze — needs Sales Head escalation before renewal date.',
    importedById: 'usr_admin',
    importedByName: 'Abhay',
    createdDate: '2026-01-05T00:00:00Z'
  },
  {
    id: 'ren_005',
    companyId: 'comp_amrut_india',
    accountId: 'acc_techm',
    accountName: 'Tech Mahindra Ltd',
    vendorId: 'v_microsoft',
    vendorName: 'Microsoft Corp',
    product: 'GitHub Enterprise',
    salespersonId: 'usr_sales_rajesh',
    salespersonName: 'Rajesh Kumar',
    renewalDate: '2026-06-18',
    previousValue: 1480000,
    suggestedRenewalValue: 1628000,
    currency: 'INR',
    status: 'Renewed',
    importedById: 'usr_admin',
    importedByName: 'Abhay',
    createdDate: '2026-01-05T00:00:00Z'
  },
  {
    id: 'ren_006',
    companyId: 'comp_amrut_india',
    accountId: 'acc_lt',
    accountName: 'Larsen & Toubro Infotech',
    vendorId: 'v_atlassian',
    vendorName: 'Atlassian',
    product: 'Confluence',
    salespersonId: 'usr_sales_priya',
    salespersonName: 'Priya Sharma',
    renewalDate: '2026-12-05',
    previousValue: 410000,
    suggestedRenewalValue: 451000,
    currency: 'INR',
    status: 'Upcoming',
    importedById: 'usr_admin',
    importedByName: 'Abhay',
    createdDate: '2026-01-05T00:00:00Z'
  }
];
