export type BuiltInUserRole = 
  | 'Managing Director'
  | 'Sales Head'
  | 'Sales Manager'
  | 'Sales Person'
  | 'Sales Coordinator'
  | 'Lead Gen Manager'
  | 'Lead Gen'
  | 'Lead Gen Admin'
  | 'Marketing Manager'
  | 'Marketing Person'
  | 'Marketing Admin'
  | 'Vendor Manager'
  | 'Vendor Head'
  | 'Presales Manager'
  | 'Presales Person'
  | 'Presales Consultant'
  | 'Accounts Head'
  | 'Accounts Manager'
  | 'CRM Administrator'
  | 'Finance & Operations'
  | 'Management / Executive'
  | 'Finance & Commercial Operations'
  | 'CRM Coordinator';

export type UserRole = BuiltInUserRole | string;

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  color: string;
  badgeBg: string;
  badgeText: string;
  defaultReportsToRole?: string;
  permissions: {
    canViewAllLeads: boolean;
    canViewAllOpportunities: boolean;
    canViewAllAccounts: boolean;
    canAssignLeads: boolean;
    canManageUsers: boolean;
    canConfigureWorkflows: boolean;
    canApproveQuotes: boolean;
    canImportData: boolean;
    canManageFieldSecurity: boolean;
    canExportReports: boolean;
    canManageVendors?: boolean;
    // Cross-functional coordinator visibility (Marketing / Lead-Gen / Finance)
    canViewAllMarketing?: boolean;
    canManageCampaigns?: boolean;
    canViewAllDatasets?: boolean;
    canViewAllFinance?: boolean;
    canManageInvoices?: boolean;
    canManageTasks?: boolean;
  };
  createdDate: string;
}

export type FieldAttributeType = 
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'boolean'
  | 'email'
  | 'url';

export interface FieldAttribute {
  id: string;
  name: string; // key name e.g. custom_segment, vat_number
  label: string; // display label e.g. "Tax ID / VAT"
  module: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Quotes' | 'Orders' | 'Users';
  type: FieldAttributeType;
  mandatory: boolean;
  defaultValue?: string | number | boolean;
  options?: string[]; // for 'select'
  helpText?: string;
  isSystem?: boolean;
  createdDate: string;
}

export interface FieldMapping {
  fileColumn: string;
  targetField: string; // e.g. "companyName", "totalValue", "custom_...", or "__CREATE_NEW__"
  isCustomField?: boolean;
  inferredType?: FieldAttributeType;
  createAsNewAttribute?: boolean;
  newAttributeLabel?: string;
  newAttributeType?: FieldAttributeType;
}

export interface ImportPreviewData {
  fileName: string;
  fileSize: number;
  totalRows: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  allRows: Record<string, any>[];
  inferredMappings: FieldMapping[];
}

export interface ImportResult {
  id: string;
  timestamp: string;
  module: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users';
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  mode: 'automatic' | 'manual';
  createdFields: FieldAttribute[];
  createdRecordsSummary: string[];
  errors: string[];
}

export interface User {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  mobile: string;
  department: string;
  role: UserRole;
  reportingManagerId?: string;
  territory: string;
  isActive: boolean;
  isOutOfOffice: boolean;
  backupUserId?: string;
  vendorResponsibilities: string[]; // Vendor IDs where user is Vendor Head
  eligibleForAutoAssignment: boolean;
  avatar?: string;
  createdDate: string;
  modifiedDate: string;
  lastLogin: string;
  customFields?: Record<string, any>;
  // First-time Login & Password Security
  isPasswordSet?: boolean;
  tempActivationCode?: string;
  passwordLastUpdated?: string;
  accountStatus?: 'Active' | 'Pending Activation' | 'Locked';
  // Multi-Company & Multi-Tenant Bindings
  primaryCompanyId?: string;
  companyMemberships?: UserCompanyMembership[];
}

export type AccountTier = 'Strategic' | 'Growth' | 'Maintain' | 'General' | 'Dormant';

export interface Account {
  id: string;
  name: string;
  industry: string;
  tier: AccountTier;
  website: string;
  phone: string;
  city: string;
  country: string;
  ownerId: string; // Account Owner (Salesperson)
  annualRevenue?: number;
  employeeCount?: string;
  installedProducts: string[];
  vendorsEngaged: string[];
  totalHistoricalRevenue: number;
  relationshipHealth: 'Excellent' | 'Good' | 'Needs Attention' | 'At Risk';
  lastActivityDate: string;
  createdDate: string;
  customFields?: Record<string, any>;
}

export type ContactRole = 
  | 'Decision Maker'
  | 'Technical Evaluator'
  | 'Procurement'
  | 'Finance'
  | 'Influencer'
  | 'User / End-User'
  | 'Champion'
  | 'Management Sponsor';

export interface Contact {
  id: string;
  accountId: string;
  accountName: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  designation: string;
  department: string;
  roleInBuying: ContactRole;
  isPrimary: boolean;
  city: string;
  linkedin?: string;
  notes?: string;
  createdDate: string;
  customFields?: Record<string, any>;
}

export type LeadSource = 
  | 'Website Inbound'
  | 'OEM / Vendor Referral'
  | 'Google Campaign'
  | 'LinkedIn Outreach'
  | 'Seminar / Webinar'
  | 'Exhibition / Expo'
  | 'Closed-Door Event'
  | 'Existing Customer Expansion'
  | 'Cold Calling'
  | 'Partner / Reseller Referral'
  | 'Email Campaign'
  | 'WhatsApp / Chat';

export type LeadStatus = 
  | 'New – Unvalidated'
  | 'Validation in Progress'
  | 'Ready for Assignment'
  | 'Assigned – Awaiting Acceptance'
  | 'Accepted – Action Pending'
  | 'Contact Attempted'
  | 'Connected / Discovery'
  | 'Qualification in Progress'
  | 'Qualified – Convert to Opportunity'
  | 'Budgeted / Future Project'
  | 'Shelved / Nurture'
  | 'Returned'
  | 'Rolled Back'
  | 'Disqualified'
  | 'Converted';

export type PriorityLevel = 'Urgent' | 'High' | 'Medium' | 'Low';

export interface BANTInfo {
  budget: 'Confirmed & Approved' | 'Budget Allocated' | 'Estimated / In Process' | 'No Budget / Unallocated';
  authority: 'Decision Maker Identified' | 'Evaluation Committee' | 'Influencer Only' | 'Unknown';
  need: 'Critical / Urgent Need' | 'Defined Project Need' | 'Exploratory Interest' | 'No Clear Need';
  timeline: 'Immediate (<30 days)' | '1–3 Months' | '3–6 Months' | '6+ Months / Unscheduled';
  budgetAmount?: number;
  notes?: string;
}

export interface Lead {
  id: string;
  leadNumber: string;
  companyName: string;
  accountId?: string; // If linked to existing account
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  designation: string;
  country: string;
  city: string;
  source: LeadSource;
  subSource?: string;
  campaign?: string;
  vendorId: string;
  vendorName: string;
  product: string;
  productFamily: string;
  requirement: string;
  interestType: 'Software License' | 'Cloud Subscription' | 'Services & Implementation' | 'Annual Support / Maintenance' | 'Custom Development';
  expectedValue: number;
  territory: string;
  priority: PriorityLevel;
  reporterId: string; // Created By
  reporterName: string;
  workingSalespersonId: string; // Assigned To
  workingSalespersonName: string;
  namedAccountOwnerId?: string;
  bant: BANTInfo;
  nextAction: string;
  nextActionDate: string;
  status: LeadStatus;
  disposition?: string;
  reactivationDate?: string;
  slaDueTime: string; // ISO timestamp
  slaStatus: 'Within SLA' | 'Near Breach' | 'SLA Breached' | 'SLA Paused';
  notes: string;
  convertedOpportunityId?: string;
  createdDate: string;
  modifiedDate: string;
  customFields?: Record<string, any>;
}

export interface AssignmentHistory {
  id: string;
  recordType: 'Lead' | 'Opportunity' | 'Account';
  recordId: string;
  recordName: string;
  previousOwnerId: string;
  previousOwnerName: string;
  newOwnerId: string;
  newOwnerName: string;
  assignedById: string;
  assignedByName: string;
  assignedDate: string;
  reason: string;
  slaResetDecision: 'Reset SLA' | 'Preserve SLA';
  notes?: string;
}

export type PipelineType = 
  | 'Software – Direct / Simple'
  | 'Software + Presales / POC'
  | 'Services / Customisation'
  | 'Renewal / Expansion'
  | 'Tender / Formal RFP';

export type OpportunityStage = 
  | 'Qualified Opportunity'
  | 'Discovery / BANT'
  | 'Solution Route Confirmed'
  | 'Presales / POC in Progress'
  | 'Solution & Commercial Inputs Ready'
  | 'Quote Submitted'
  | 'Technical / Commercial Evaluation'
  | 'Negotiation'
  | 'Verbal / Intent to Order'
  | 'Closed Won'
  | 'Closed Lost'
  | 'Shelved / Budgeted';

export interface Opportunity {
  id: string;
  oppNumber: string;
  title: string;
  description?: string;
  notes?: string;
  dealRegistrationStatus?: string;
  dealRegistrationNumber?: string;
  accountId: string;
  accountName: string;
  primaryContactId: string;
  primaryContactName: string;
  secondaryContactIds?: string[];
  pipeline: PipelineType;
  stage: OpportunityStage;
  probability: number; // 0 - 100%
  expectedCloseDate: string;
  softwareValue: number;
  servicesValue: number;
  totalValue: number;
  weightedValue?: number;
  grossMarginValue?: number; // Restricted field
  grossMarginPercent?: number; // Restricted field
  estimatedMargin?: number;
  vendorId: string;
  vendorName: string;
  product: string;
  source: LeadSource;
  campaign?: string;
  reporterId: string;
  reporterName: string;
  ownerId: string; // Working Salesperson
  ownerName: string;
  presalesOwnerId?: string;
  presalesOwnerName?: string;
  sourceLeadId?: string;
  bant: BANTInfo;
  nextAction: string;
  nextActionDate: string;
  forecastCategory: 'Pipeline' | 'Best Case' | 'Commit' | 'Closed' | 'Omitted';
  // Closure Details
  closureReason?: string;
  competitor?: string;
  customerPoRef?: string;
  orderDate?: string;
  lossAnalysis?: string;
  reactivationDate?: string;
  createdDate: string;
  modifiedDate: string;
  customFields?: Record<string, any>;
}

export type PresalesType = 
  | 'Discovery'
  | 'Demo'
  | 'Architecture'
  | 'Sizing'
  | 'Technical proposal'
  | 'SOW'
  | 'Effort estimation'
  | 'POC'
  | 'Security questionnaire'
  | 'RFP'
  | 'Migration assessment'
  | 'Customisation feasibility'
  | 'Integration design';

export type PresalesStatus = 
  | 'Requested'
  | 'Assigned'
  | 'In Progress'
  | 'Completed – Sign-off Received'
  | 'Completed – Issues Identified'
  | 'On Hold'
  | 'Cancelled';

export interface PresalesRequest {
  id: string;
  reqNumber: string;
  opportunityId: string;
  opportunityTitle: string;
  accountId: string;
  accountName: string;
  type?: PresalesType;
  requestType?: PresalesType;
  status: PresalesStatus;
  assignedConsultantId: string;
  assignedConsultantName?: string;
  salespersonId?: string;
  salespersonName?: string;
  vendorId?: string;
  vendorName?: string;
  product?: string;
  objective?: string;
  scopeDescription?: string;
  deliverablesRequired?: string;
  pocSuccessCriteria?: string[];
  environmentDetails?: string;
  targetCompletionDate?: string;
  targetSignOffDate?: string;
  actualCompletionDate?: string;
  createdDate: string;
  notes?: string;
}

export type PresalesPOCRequest = PresalesRequest;

export interface POCRecord {
  id: string;
  pocNumber: string;
  opportunityId: string;
  opportunityTitle: string;
  accountId: string;
  accountName: string;
  vendorId: string;
  vendorName: string;
  product: string;
  objective: string;
  scope: string;
  successCriteria: string[];
  criteriaStatus: { [criterion: string]: boolean };
  environment: 'Cloud Sandbox' | 'Customer On-Prem' | 'Amrut Lab Cluster' | 'Hybrid Trial';
  dependencies: string;
  startDate: string;
  endDate: string;
  effortDays: number;
  commercialModel: 'Complimentary POC' | 'Paid POC ($)' | 'OEM Funded MDF';
  result: 'Pending' | 'Successful - Recommended to Buy' | 'Conditional Pass' | 'Failed Criteria' | 'Customer Aborted';
  risksIdentified: string;
  technicalRecommendation: string;
  customerSignoffName?: string;
  customerSignoffDate?: string;
  status: 'Planning' | 'Active Testing' | 'Evaluation' | 'Sign-off Received' | 'Closed';
  createdDate: string;
}

export type QuoteLineType = 'Software License' | 'Cloud Subscription' | 'Professional Services' | 'Custom Development' | 'Annual Support';

export interface QuoteLineItem {
  id: string;
  itemType: QuoteLineType;
  description: string;
  skuCode?: string;
  quantity: number;
  vendorUnitCost: number; // Restricted to authorized roles
  vendorTotalCost: number; // Restricted to authorized roles
  unitListPrice: number;
  discountPercent: number;
  unitSellingPrice: number;
  totalSellingPrice: number;
  marginAmount: number;
  marginPercent: number;
}

export type QuoteStatus = 
  | 'Draft'
  | 'Pending Internal Approval'
  | 'Approved by Sales Manager'
  | 'Submitted to Customer'
  | 'Customer Accepted'
  | 'Customer Requested Revision'
  | 'Rejected'
  | 'Expired';

export interface Quote {
  id: string;
  quoteNumber: string;
  version: number;
  opportunityId: string;
  opportunityTitle: string;
  accountId: string;
  accountName: string;
  contactId: string;
  contactName: string;
  salespersonId: string;
  salespersonName: string;
  vendorId: string;
  vendorName: string;
  /** The company entity (letterhead / GST-VAT % / Terms & Conditions) this
   * quote was issued under — snapshotted from the salesperson's active
   * company at creation time so the printed quote stays consistent even if
   * they later switch company context. Optional for backward compatibility
   * with quotes created before this field existed (those fall back to the
   * viewer's current company). */
  companyId?: string;
  currency: 'INR (₹)' | 'USD ($)' | 'EUR (€)' | 'AED (د.إ)';
  items: QuoteLineItem[];
  subtotal: number;
  totalVendorCost: number;
  totalDiscountAmount: number;
  overallDiscountPercent: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  totalMarginAmount: number;
  totalMarginPercent: number;
  paymentTerms: string;
  validUntil: string;
  status: QuoteStatus;
  approvalRequired: boolean;
  approvedById?: string;
  approvedByName?: string;
  approvedDate?: string;
  notes: string;
  createdDate: string;
  customFields?: Record<string, any>;
}

export type OrderStatus = 
  | 'PO Received – Verification'
  | 'OEM Procurement in Progress'
  | 'Licenses Delivered to Customer'
  | 'Services Deployment Active'
  | 'Invoiced & Completed'
  | 'PO Received'
  | 'Completed';

export interface Order {
  id: string;
  orderNumber: string;
  customerPoNumber: string;
  customerPoDate?: string;
  poDate: string;
  orderReceivedDate: string;
  accountId: string;
  accountName: string;
  contactId: string;
  contactName: string;
  opportunityId: string;
  opportunityTitle: string;
  salespersonId: string;
  salespersonName: string;
  vendorId: string;
  vendorName: string;
  product: string;
  currency: string;
  softwareAmount: number;
  softwareValue?: number;
  servicesAmount: number;
  servicesValue?: number;
  totalAmount: number;
  grandTotal?: number;
  grossMarginAmount?: number;
  termMonths: number;
  startDate: string;
  endDate: string;
  billingStatus: 'Pending Invoice' | 'Partially Invoiced' | 'Fully Invoiced' | 'Paid';
  deliveryStatus: 'Licenses Issued' | 'Pending OEM Dispatch' | 'Services in Delivery' | 'Completed';
  status?: OrderStatus;
  billingMilestones?: string;
  licenseExpiryDate?: string;
  renewalDate: string;
  renewalRecordCreated: boolean;
  notes?: string;
  createdDate: string;
  customFields?: Record<string, any>;
}

export interface FieldPermission {
  id: string;
  role: UserRole;
  module: string;
  fieldName: string;
  readable: boolean;
  editable: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  vendorHeadUserId: string; // Primary Vendor Head
  vendorHeadUserName: string;
  secondaryVendorHeadIds?: string[];
  relationshipManager: string;
  partnerLevel: 'Platinum / Elite Partner' | 'Gold Partner' | 'Silver Partner' | 'Registered Solution Provider' | 'Website-listed principal';
  territory: string;
  agreementStartDate: string;
  agreementRenewalDate: string;
  distributorName: string;
  partnerPortalUrl: string;
  annualRevenueTarget: number;
  quarterlyTarget: number;
  focusProducts: string[];
  certifiedEngineersCount: number;
  activeRegisteredDealsCount: number;
  mdfAllocated: number;
  mdfUtilized: number;
  vendorHealth: 'Healthy / High Growth' | 'Stable' | 'Needs Review';
  logo?: string;
}

export interface WorkflowTransition {
  fromState: string;
  toState: string;
  permittedRoles: UserRole[];
  mandatoryFields?: string[];
  requiresApproval?: boolean;
  approverRole?: UserRole;
  slaHours?: number;
  notificationMessage?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  module: 'Leads' | 'Opportunities' | 'Quotes' | 'Presales' | 'POCs' | 'Orders';
  startingState: string;
  endStates: string[];
  allStates: string[];
  transitions: WorkflowTransition[];
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  module: 'Leads' | 'Opportunities' | 'Quotes' | 'Orders' | 'Accounts' | 'Contacts' | 'Workflows' | 'Users' | 'Presales' | 'POCs' | 'Vendors';
  recordId: string;
  recordName: string;
  action: 'CREATE' | 'UPDATE' | 'STAGE_CHANGE' | 'ASSIGN' | 'CONVERT' | 'APPROVE' | 'REJECT' | 'CLOSE_WON' | 'CLOSE_LOST' | 'DELETE_PREVENTED';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  details: string;
}

export type FieldAccessLevel = 'Editable' | 'Read Only' | 'Hidden' | 'Mandatory';

export interface FieldSecurityRule {
  id: string;
  module: 'Leads' | 'Opportunities' | 'Quotes' | 'Orders' | 'Accounts';
  fieldName: string;
  fieldLabel: string;
  rolePermissions: Partial<Record<UserRole, FieldAccessLevel>> & { [key: string]: FieldAccessLevel | undefined };
}

export interface WebFormConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  enabledFields: string[];
  mandatoryFields: string[];
  defaultVendorId: string;
  defaultSource: LeadSource;
  successMessage: string;
  redirectUrl?: string;
  embedCode: string;
  submissionsCount: number;
}

// ==========================================
// MULTI-COMPANY & MULTI-TENANT TYPES
// ==========================================

export interface CompanyTenant {
  id: string;
  code: string;
  name: string;
  legalEntity: string;
  domain: string;
  currency: string;
  currencySymbol: string;
  country: string;
  city: string;
  taxRegistrationNumber: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  logo?: string;
  themeColor: string;
  industry: string;
  annualSalesTarget: number;
  annualServicesTarget: number;
  isActive: boolean;
  createdDate: string;
  /** Tax rate applied to this company's quotes/invoices — labeled "GST" in
   * the UI (India/Singapore both call it that), but stands in for VAT/other
   * indirect tax for entities like the UAE one. Editable in Admin → Companies. */
  gstPercent: number;
  /** Suggested year-over-year price increase applied to this company's
   * renewal pipeline. Editable in Admin → Companies. */
  renewalPriceIncreasePercent: number;
  /** Terms & Conditions block appended to this company's quote template.
   * Editable by CRM Administrator / Managing Director / Sales Head only. */
  termsAndConditions: string;
  termsAndConditionsLastUpdatedBy?: string;
  termsAndConditionsLastUpdatedDate?: string;
}

export interface UserCompanyMembership {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  role: UserRole;
  department: string;
  reportingManagerId?: string;
  territory: string;
  vendorResponsibilities: string[];
  isDefault: boolean;
  isActive: boolean;
}

// ==========================================
// TARGETS, QUOTAS & VENDOR HEAD ROLLUP TYPES
// ==========================================

export type TargetPeriod = 'FY-2026' | 'H1-2026' | 'H2-2026' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Monthly';

export interface VendorSalesTarget {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userRole: string;
  vendorId: string;
  vendorName: string;
  period: TargetPeriod;
  year: number;
  productLicenseTarget: number;
  productLicenseAchieved: number;
  servicesTarget: number;
  servicesAchieved: number;
  totalTarget: number;
  totalAchieved: number;
  achievementPercentage: number;
  isVendorHeadTarget?: boolean;
  subordinateTargetRollup?: number; // Sum of all reps targets for this vendor
  subordinateAchievedRollup?: number; // Sum of all reps achieved for this vendor
}

export interface UserSalesQuotaSummary {
  userId: string;
  userName: string;
  userRole: string;
  companyId: string;
  totalSoftwareTarget: number;
  totalSoftwareAchieved: number;
  totalServicesTarget: number;
  totalServicesAchieved: number;
  overallTarget: number;
  overallAchieved: number;
  overallPercent: number;
  vendorBreakdown: {
    vendorId: string;
    vendorName: string;
    target: number;
    achieved: number;
    percent: number;
  }[];
  servicesBreakdown: {
    serviceType: string;
    target: number;
    achieved: number;
    percent: number;
  }[];
}

// ==========================================
// GOOGLE WORKSPACE (GMAIL & CALENDAR) INTEGRATION
// ==========================================

export interface GoogleWorkspaceAccount {
  id: string;
  userId: string;
  companyId: string;
  googleEmail: string;
  isConnected: boolean;
  connectedAt: string;
  lastSyncedAt: string;
  syncCalendarEnabled: boolean;
  syncEmailEnabled: boolean;
  autoCreateEventsFromEmails: boolean;
  totalEmailsScanned: number;
  actionableEmailsFound: number;
  eventsCreatedCount: number;
}

export interface SyncedEmailItem {
  id: string;
  accountId?: string;
  accountName?: string;
  opportunityId?: string;
  opportunityTitle?: string;
  leadId?: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  subject: string;
  snippet: string;
  fullBody?: string;
  receivedAt: string;
  isHighPriority: boolean;
  category: 'RFP / Quote Request' | 'Meeting Request' | 'BANT Signal' | 'Vendor Inquiry' | 'Delivery / Support' | 'General';
  extractedAction?: {
    actionType: 'Create Calendar Event' | 'Update Stage' | 'Create Task' | 'Log Activity';
    suggestedDate?: string;
    suggestedTitle?: string;
    confidenceScore: number;
    status: 'Pending' | 'Applied' | 'Dismissed';
  };
}

export interface SyncedCalendarEvent {
  id: string;
  googleEventId?: string;
  userId: string;
  companyId: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  meetLink?: string;
  attendees: {
    name: string;
    email: string;
    status: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }[];
  linkedEntityType?: 'Lead' | 'Opportunity' | 'Account' | 'Task';
  linkedEntityId?: string;
  linkedEntityName?: string;
  createdVia: 'Manual CRM' | 'Gmail AI Parser' | 'Google Sync';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

// ==========================================
// BANT & MULTI-HORIZON PIPELINE FORECAST TYPES
// ==========================================

export interface TimeHorizonForecast {
  period: 'This Week' | 'This Month' | 'Next Month' | 'Next 6 Months (H1/H2)' | 'Full Financial Year';
  totalPipelineValue: number;
  weightedForecastValue: number;
  softwareValue: number;
  servicesValue: number;
  opportunityCount: number;
  committedDealsCount: number;
  bestCaseDealsCount: number;
  pipelineDealsCount: number;
  bantHighCount: number;
  topDeals: Opportunity[];
}

// ==========================================
// TASKS & ACTIVITIES (Daily Work Queue)
// ==========================================

export type TaskType = 'Call' | 'Email' | 'Meeting' | 'Follow-up' | 'Demo' | 'Internal' | 'Approval' | 'Other';
export type TaskStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled';
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskLinkedEntityType = 'Lead' | 'Opportunity' | 'Account' | 'Quote' | 'Order' | 'Campaign' | 'PresalesRequest';

export interface Task {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // ISO date (yyyy-mm-dd)
  dueTime?: string; // HH:mm
  assignedToId: string;
  assignedToName: string;
  createdById: string;
  createdByName: string;
  linkedEntityType?: TaskLinkedEntityType;
  linkedEntityId?: string;
  linkedEntityName?: string;
  source: 'Manual' | 'AI Suggested' | 'Email Extracted' | 'Workflow';
  completedDate?: string;
  createdDate: string;
  modifiedDate: string;
}

// ==========================================
// MARKETING & LEAD-GEN: PROJECTS, CAMPAIGNS, DATASETS
// ==========================================

export type ProjectStatus = 'Planning' | 'Active' | 'Paused' | 'Completed' | 'Archived';

export interface MarketingProject {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  objective: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate?: string;
  budget: number;
  spend: number;
  status: ProjectStatus;
  targetVendorIds: string[];
  targetIndustries: string[];
  targetRegions: string[];
  createdDate: string;
}

export type CampaignChannel =
  | 'Email'
  | 'LinkedIn'
  | 'Google Ads'
  | 'Webinar'
  | 'Event / Exhibition'
  | 'Cold Calling'
  | 'WhatsApp'
  | 'SMS'
  | 'Content / SEO'
  | 'Partner / Referral';

export type CampaignStatus = 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  leadsGenerated: number;
  qualifiedLeads: number;
  opportunitiesCreated: number;
  revenueInfluenced: number;
}

export interface Campaign {
  id: string;
  companyId: string;
  projectId: string;
  projectName: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  targetAudienceSize: number;
  datasetId?: string;
  messagingTemplate?: string;
  utmSource?: string;
  utmCampaign?: string;
  metrics: CampaignMetrics;
  createdDate: string;
  modifiedDate: string;
}

export type DatasetSourceType =
  | 'CSV Upload'
  | 'XLSX Upload'
  | 'LinkedIn Export'
  | 'Trade Show Scan'
  | 'Purchased List'
  | 'Web Form'
  | 'CRM Export';

export interface LeadGenDataset {
  id: string;
  companyId: string;
  projectId?: string;
  name: string;
  description?: string;
  sourceType: DatasetSourceType;
  fileName?: string;
  totalRecords: number;
  validRecords: number;
  duplicateRecords: number;
  convertedToLeadsCount: number;
  uploadedById: string;
  uploadedByName: string;
  tags: string[];
  createdDate: string;
}

export type DatasetRecordStatus = 'New' | 'Enriched' | 'Contacted' | 'Converted to Lead' | 'Invalid' | 'Duplicate' | 'Do Not Contact';

export interface DatasetRecord {
  id: string;
  datasetId: string;
  companyId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  designation?: string;
  industry?: string;
  city?: string;
  country?: string;
  status: DatasetRecordStatus;
  convertedLeadId?: string;
  raw?: Record<string, any>;
  createdDate: string;
}

// ==========================================
// FINANCE: INVOICES, PAYMENTS, EXPENSES
// ==========================================

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' | 'Written Off';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  orderId?: string;
  orderNumber?: string;
  accountId: string;
  accountName: string;
  salespersonId: string;
  salespersonName: string;
  currency: string;
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  createdDate: string;
}

export type PaymentMethod = 'Bank Transfer' | 'Cheque' | 'Credit Card' | 'UPI' | 'Wire Transfer' | 'Other';

export interface Payment {
  id: string;
  companyId: string;
  invoiceId: string;
  invoiceNumber: string;
  accountId: string;
  accountName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  referenceNumber?: string;
  receivedDate: string;
  recordedById: string;
  recordedByName: string;
  notes?: string;
  createdDate: string;
}

export type ExpenseCategory = 'Vendor Procurement' | 'Marketing Spend' | 'Travel' | 'Presales / POC' | 'Software / Tools' | 'Other';
export type ExpenseStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Reimbursed';

export interface Expense {
  id: string;
  companyId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  linkedProjectId?: string;
  linkedCampaignId?: string;
  linkedOrderId?: string;
  incurredDate: string;
  approvedById?: string;
  status: ExpenseStatus;
  createdById: string;
  createdByName: string;
  createdDate: string;
}

// ==========================================
// AI (Claude) INSIGHTS & ASSISTANT
// ==========================================

export type AIInsightType = 'Score' | 'Next Best Action' | 'Risk Flag' | 'Summary' | 'Suggested Reply';

export interface AIInsight {
  id: string;
  entityType: 'Lead' | 'Opportunity' | 'Account' | 'Email' | 'Campaign';
  entityId: string;
  companyId: string;
  insightType: AIInsightType;
  score?: number; // 0-100
  summary: string;
  reasoning?: string;
  suggestedActions?: string[];
  generatedAt: string;
  model: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  contextEntities?: { type: string; id: string; name: string }[];
}

// ==========================================
// PRODUCT CATALOG (per-vendor price list)
// ==========================================

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  sku?: string;
  listPrice: number;
  currency: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate?: string;
}

// ==========================================
// RENEWAL BOARD (standalone yearly renewal pipeline)
// ==========================================

export type RenewalStatus = 'Upcoming' | 'Contacted' | 'Quoted' | 'Renewed' | 'At Risk' | 'Lost';

export interface RenewalRecord {
  id: string;
  companyId: string;
  accountId?: string;
  accountName: string;
  vendorId?: string;
  vendorName?: string;
  product: string;
  salespersonId: string;
  salespersonName: string;
  renewalDate: string; // ISO date — the day this contract/license is due to renew
  previousValue: number;
  suggestedRenewalValue: number;
  currency: string;
  status: RenewalStatus;
  notes?: string;
  linkedOrderId?: string;
  reassignedFromId?: string;
  reassignedFromName?: string;
  importedById: string;
  importedByName: string;
  createdDate: string;
  modifiedDate?: string;
}
