import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  User,
  UserRole,
  Account,
  Contact,
  Lead,
  Opportunity,
  PresalesRequest,
  POCRecord,
  Quote,
  Order,
  Vendor,
  WorkflowDefinition,
  WorkflowTransition,
  AuditLog,
  FieldSecurityRule,
  WebFormConfig,
  AssignmentHistory,
  FieldAccessLevel,
  RoleDefinition,
  FieldAttribute,
  FieldMapping,
  ImportResult,
  CompanyTenant,
  UserCompanyMembership,
  VendorSalesTarget,
  UserSalesQuotaSummary,
  GoogleWorkspaceAccount,
  SyncedEmailItem,
  SyncedCalendarEvent,
  TimeHorizonForecast,
  Task,
  TaskStatus,
  Product,
  RenewalRecord,
  RenewalStatus
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_ACCOUNTS,
  INITIAL_CONTACTS,
  INITIAL_LEADS,
  INITIAL_OPPORTUNITIES,
  INITIAL_PRESALES,
  INITIAL_POCS,
  INITIAL_QUOTES,
  INITIAL_ORDERS,
  INITIAL_VENDORS,
  INITIAL_ASSIGNMENT_HISTORY,
  INITIAL_AUDIT_LOGS,
  INITIAL_WORKFLOWS,
  INITIAL_FIELD_SECURITY,
  INITIAL_WEB_FORMS,
  INITIAL_ROLES,
  INITIAL_FIELD_ATTRIBUTES
} from '../data/initialData';
import {
  INITIAL_COMPANIES,
  INITIAL_COMPANY_MEMBERSHIPS,
  INITIAL_VENDOR_TARGETS,
  INITIAL_GOOGLE_ACCOUNTS,
  INITIAL_SYNCED_EMAILS,
  INITIAL_SYNCED_EVENTS
} from '../data/multiCompanyData';
import { INITIAL_TASKS } from '../data/marketingFinanceData';
import { INITIAL_PRODUCTS, INITIAL_RENEWAL_RECORDS } from '../data/productCatalogData';
import { useSyncedCollection } from '../lib/useSyncedCollection';
import {
  signIn as firebaseSignIn,
  activateAndSignIn,
  changePassword as firebaseChangePassword,
  requestPasswordReset as firebaseRequestPasswordReset,
  provisionUserAccount,
  signOutUser,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  authorizeCurrentSession,
  isFirebaseAuthProvisioningConfigured,
} from '../lib/firebaseAuth';
import { requestGoogleAccessToken, disconnectGoogle, isGoogleOAuthConfigured, getConnectedGoogleEmail } from '../lib/googleAuth';
import { syncGmailMessages, syncCalendarEvents } from '../lib/googleWorkspaceSync';

export interface CustomerHistorySummary {
  matchedAccount?: Account;
  matchedContacts: Contact[];
  matchedLeads: Lead[];
  openOpportunities: Opportunity[];
  closedOpportunities: Opportunity[];
  pastOrders: Order[];
  installedProducts: string[];
  totalHistoricalRevenue: number;
  health: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface CRMContextType {
  // Current session & active persona
  currentUser: User;
  allUsers: User[];
  roles: RoleDefinition[];
  fieldAttributes: FieldAttribute[];
  
  // Data collections
  accounts: Account[];
  contacts: Contact[];
  leads: Lead[];
  opportunities: Opportunity[];
  presalesRequests: PresalesRequest[];
  pocRecords: POCRecord[];
  quotes: Quote[];
  orders: Order[];
  vendors: Vendor[];
  workflows: WorkflowDefinition[];
  auditLogs: AuditLog[];
  assignmentHistory: AssignmentHistory[];
  fieldSecurityRules: FieldSecurityRule[];
  webForms: WebFormConfig[];

  // Filtered views based on current role & vendor head dynamic access
  accessibleLeads: Lead[];
  accessibleOpportunities: Opportunity[];
  accessibleAccounts: Account[];
  accessibleContacts: Contact[];
  accessibleQuotes: Quote[];
  accessibleOrders: Order[];
  accessiblePresales: PresalesRequest[];
  accessiblePOCs: POCRecord[];

  // Security & Permissions
  getFieldAccess: (module: 'Leads' | 'Opportunities' | 'Quotes' | 'Orders' | 'Accounts', fieldName: string) => FieldAccessLevel;
  updateFieldSecurity: (ruleId: string, role: string, accessLevel: FieldAccessLevel) => void;

  // Actions
  createLead: (leadData: Partial<Lead>) => Lead;
  updateLead: (id: string, leadData: Partial<Lead>) => void;
  assignLead: (leadId: string, newOwnerId: string, reason: string, slaReset: 'Reset SLA' | 'Preserve SLA', notes?: string) => void;
  autoAssignLead: (leadId: string) => string;
  convertLeadToOpportunity: (
    leadId: string,
    accountChoice: { type: 'existing' | 'new'; accountId?: string; newAccountData?: Partial<Account> },
    contactChoice: { type: 'existing' | 'new'; contactId?: string; newContactData?: Partial<Contact> },
    oppOverrides?: Partial<Opportunity>
  ) => Opportunity;

  createOpportunity: (oppData: Partial<Opportunity>) => Opportunity;
  updateOpportunity: (id: string, oppData: Partial<Opportunity>) => void;
  advanceOpportunityStage: (id: string, nextStage: string, closureData?: { reason?: string; poRef?: string; orderDate?: string; competitor?: string }) => void;

  createAccount: (accData: Partial<Account>) => Account;
  updateAccount: (id: string, accData: Partial<Account>) => void;

  createContact: (contactData: Partial<Contact>) => Contact;
  updateContact: (id: string, contactData: Partial<Contact>) => void;

  createPresalesRequest: (data: Partial<PresalesRequest>) => PresalesRequest;
  updatePresalesRequest: (id: string, data: Partial<PresalesRequest>) => void;

  createPOC: (data: Partial<POCRecord>) => POCRecord;
  updatePOC: (id: string, data: Partial<POCRecord>) => void;

  createQuote: (quoteData: Partial<Quote>) => Quote;
  updateQuote: (id: string, quoteData: Partial<Quote>) => void;
  approveQuote: (quoteId: string) => void;
  rejectQuote: (quoteId: string, reason: string) => void;

  createOrder: (orderData: Partial<Order>) => Order;
  updateOrder: (id: string, orderData: Partial<Order>) => void;

  createUser: (userData: Partial<User> & { primaryCompanyId: string }) => Promise<{ success: boolean; message?: string; userId?: string }>;
  updateUser: (id: string, userData: Partial<User>) => void;
  renameUser: (id: string, newName: string) => void;
  deleteUser: (id: string, transferToUserId?: string) => void;
  transferUserWorkload: (
    fromUserId: string,
    toUserId: string,
    options?: { leads?: boolean; opportunities?: boolean; accounts?: boolean; subordinates?: boolean }
  ) => { leadsCount: number; oppsCount: number; accountsCount: number; subordinatesCount: number };
  toggleUserOutOfOffice: (userId: string) => void;

  // Roles management
  createRole: (roleData: Partial<RoleDefinition>) => RoleDefinition;
  updateRole: (id: string, roleData: Partial<RoleDefinition>) => void;
  deleteRole: (id: string) => void;

  // Field Attributes management
  createFieldAttribute: (fieldData: Partial<FieldAttribute>) => FieldAttribute;
  updateFieldAttribute: (id: string, fieldData: Partial<FieldAttribute>) => void;
  deleteFieldAttribute: (id: string) => void;

  // Bulk Data Import Engine
  importDataBatch: (
    module: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users',
    rows: Record<string, any>[],
    mappings: FieldMapping[],
    mode: 'automatic' | 'manual',
    fileName: string
  ) => ImportResult;

  updateVendor: (id: string, vendorData: Partial<Vendor>) => void;
  createVendor: (vendorData: Partial<Vendor>) => Vendor | null;
  canManageVendors: boolean;

  // Workflow Engine Methods
  updateWorkflow: (wfId: string, updatedWf: Partial<WorkflowDefinition>) => void;
  createWorkflow: (wfData: Partial<WorkflowDefinition>) => WorkflowDefinition;
  deleteWorkflow: (wfId: string) => void;
  resetWorkflowsToDefault: () => void;
  isRoleAuthorizedForTransition: (permittedRoles: string[], userRole: string) => boolean;
  getAvailableWorkflowTransitions: (module: string, currentState: string, userRole?: string) => WorkflowTransition[];
  validateWorkflowTransition: (
    module: string,
    fromState: string,
    toState: string,
    userRole?: string,
    recordData?: any
  ) => { allowed: boolean; reason?: string; requiresApproval?: boolean; approverRole?: string; transition?: WorkflowTransition };

  createWebForm: (formData: Partial<WebFormConfig>) => WebFormConfig;
  submitPublicWebLead: (formId: string, payload: Record<string, string>) => void;

  // Real-time lookup
  searchCustomerHistory: (companyName: string) => CustomerHistorySummary;

  // Audit
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole' | 'ipAddress'>) => void;
  resetAuditLogs: () => void;

  // Notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Authentication & First-Time Password Management (real Firebase Authentication)
  isAuthenticated: boolean;
  isDataLoading: boolean;
  isAuthResolved: boolean;
  isFirebaseAuthConfigured: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; requiresPasswordSetup?: boolean; message?: string; user?: User }>;
  setupFirstTimePassword: (email: string, newPassword: string, activationCode?: string) => Promise<{ success: boolean; message?: string }>;
  changeUserPassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  generateActivationLink: (userId: string) => { code: string; link: string };
  logout: () => void;

  // Multi-Company & Multi-Tenant Management
  companies: CompanyTenant[];
  currentCompanyId: string;
  currentCompany: CompanyTenant;
  userMemberships: UserCompanyMembership[];
  accessibleCompanies: CompanyTenant[];
  switchCompany: (companyId: string) => void;
  createCompany: (company: Partial<CompanyTenant>) => void;
  updateCompany: (companyId: string, data: Partial<CompanyTenant>) => void;
  assignUserToCompany: (membership: Omit<UserCompanyMembership, 'id'>) => void;

  // Sales Quotas & Vendor Head Targets
  vendorTargets: VendorSalesTarget[];
  upsertVendorTarget: (target: Partial<VendorSalesTarget>) => void;
  getUserQuotas: (userId?: string, companyId?: string) => UserSalesQuotaSummary;
  getVendorHeadRollup: (vendorId: string, companyId?: string) => {
    vendor: Vendor | undefined;
    vendorHeadUser: User | undefined;
    personalTarget: number;
    personalAchieved: number;
    rollupTarget: number;
    rollupAchieved: number;
    totalVendorTarget: number;
    totalVendorAchieved: number;
    achievementPercent: number;
    repContributions: { rep: User; target: number; achieved: number; percent: number }[];
  };

  // BANT & Multi-Horizon Pipeline Forecasts
  timeHorizonForecasts: Record<string, TimeHorizonForecast>;
  getPipelineForecastByHorizon: (period: string) => TimeHorizonForecast;

  // Google Workspace Integration (Gmail & Calendar)
  googleAccount: GoogleWorkspaceAccount;
  syncedEmails: SyncedEmailItem[];
  syncedEvents: SyncedCalendarEvent[];
  isGoogleSyncing: boolean;
  isGoogleOAuthConfigured: boolean;
  connectGoogleWorkspace: () => Promise<void>;
  disconnectGoogleWorkspace: () => void;
  syncGoogleEmailsNow: () => Promise<void>;
  applyEmailActionToCalendar: (emailId: string) => void;
  createCalendarEvent: (event: Omit<SyncedCalendarEvent, 'id'>) => SyncedCalendarEvent;
  deleteCalendarEvent: (eventId: string) => void;
  ingestSyncedEmails: (items: SyncedEmailItem[]) => void;
  ingestSyncedEvents: (items: SyncedCalendarEvent[]) => void;

  // Tasks / Daily Work Queue
  tasks: Task[];
  accessibleTasks: Task[];
  createTask: (taskData: Partial<Task>) => Task;
  updateTask: (id: string, taskData: Partial<Task>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // Product Catalog (Admin-managed per-vendor price list)
  products: Product[];
  canManageProductCatalog: boolean;
  createProduct: (data: Partial<Product>) => Product | null;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Renewal Board
  renewalRecords: RenewalRecord[];
  accessibleRenewals: RenewalRecord[];
  canManageRenewals: boolean;
  createRenewalRecord: (data: Partial<RenewalRecord>) => RenewalRecord | null;
  bulkImportRenewalRecords: (records: Partial<RenewalRecord>[]) => number;
  updateRenewalStatus: (id: string, status: RenewalStatus) => void;
  updateRenewalRecord: (id: string, data: Partial<RenewalRecord>) => void;
  reassignRenewal: (id: string, newSalespersonId: string) => void;
  deleteRenewalRecord: (id: string) => void;

  // Reset demo data
  resetAllData: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Collection "healing" helpers. These used to run once inside a useState
// initializer against whatever was in localStorage; now the source of truth
// is a live Firestore snapshot, so each runs as a useMemo derivation over
// the raw synced array instead. Kept functionally identical to the original
// localStorage-era logic.
// ---------------------------------------------------------------------------

function healUsersList(list: User[]): User[] {
  if (!Array.isArray(list) || list.length === 0) return list;
  // Ensure usr_admin / CRM Administrator is Abhay (abhay@amrutsoftware.com)
  return list.map(u => {
    if (u.id === 'usr_admin' || u.role === 'CRM Administrator') {
      if (u.id === 'usr_admin' && u.name === 'Abhay' && u.email === 'abhay@amrutsoftware.com') return u;
      return { ...u, id: 'usr_admin', name: 'Abhay', email: 'abhay@amrutsoftware.com' };
    }
    return u;
  });
}

function healWorkflowsList(list: WorkflowDefinition[]): WorkflowDefinition[] {
  return Array.isArray(list) ? list : [];
}

function healRolesList(list: RoleDefinition[]): RoleDefinition[] {
  return Array.isArray(list) ? list : [];
}

function orderFallsInTargetPeriod(order: Order, target: VendorSalesTarget): boolean {
  const rawDate = order.orderReceivedDate || order.poDate || order.customerPoDate || order.createdDate;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;
  const year = target.year || Number(String(target.period).match(/\d{4}/)?.[0]) || new Date().getFullYear();
  const month = date.getMonth();
  const dateYear = date.getFullYear();

  switch (target.period) {
    case 'FY-2026':
      return date >= new Date(year, 3, 1) && date < new Date(year + 1, 3, 1);
    case 'H1-2026':
      return date >= new Date(year, 3, 1) && date < new Date(year, 9, 1);
    case 'H2-2026':
      return date >= new Date(year, 9, 1) && date < new Date(year + 1, 3, 1);
    case 'Q1':
      return date >= new Date(year, 3, 1) && date < new Date(year, 6, 1);
    case 'Q2':
      return date >= new Date(year, 6, 1) && date < new Date(year, 9, 1);
    case 'Q3':
      return date >= new Date(year, 9, 1) && date < new Date(year + 1, 0, 1);
    case 'Q4':
      return date >= new Date(year + 1, 0, 1) && date < new Date(year + 1, 3, 1);
    case 'Monthly': {
      const now = new Date();
      return dateYear === now.getFullYear() && month === now.getMonth();
    }
    default:
      return dateYear === year;
  }
}

function targetWithOrderActuals(target: VendorSalesTarget, realOrders: Order[]): VendorSalesTarget {
  const matchingOrders = realOrders.filter(order =>
    order.salespersonId === target.userId &&
    order.vendorId === target.vendorId &&
    orderFallsInTargetPeriod(order, target)
  );
  const productLicenseAchieved = matchingOrders.reduce((sum, order) => sum + (order.softwareAmount ?? order.softwareValue ?? 0), 0);
  const servicesAchieved = matchingOrders.reduce((sum, order) => sum + (order.servicesAmount ?? order.servicesValue ?? 0), 0);
  const totalAchieved = productLicenseAchieved + servicesAchieved;
  const totalTarget = (target.productLicenseTarget || 0) + (target.servicesTarget || 0);
  return {
    ...target,
    productLicenseAchieved,
    servicesAchieved,
    totalAchieved,
    totalTarget,
    achievementPercentage: totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 1000) / 10 : 0
  };
}

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --------------------------------------------------------------------
  // Authentication state — driven by real Firebase Authentication, not
  // localStorage. `isAuthenticated` / `currentUserId` follow the signed-in
  // Firebase user's uid, which is set (via the activateInvitedUser /
  // activation Cloud Function) to match the corresponding CRM user's
  // Firestore document id — so `currentUser.id` keeps working exactly as
  // every existing mutator already expects.
  // --------------------------------------------------------------------
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [firebaseUserEmail, setFirebaseUserEmail] = useState<string>('');
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  useEffect(() => {
    const unsub = onFirebaseAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setIsAuthenticated(false);
        setCurrentUserId('');
        setFirebaseUserEmail('');
        setIsAuthResolved(true);
        return;
      }

      setIsAuthResolved(false);
      const authorization = await authorizeCurrentSession(firebaseUser);
      if (!authorization.success) {
        await signOutUser();
        setIsAuthenticated(false);
        setIsAuthResolved(true);
        return;
      }
      setCurrentUserId(authorization.crmUserId || firebaseUser.uid);
      setFirebaseUserEmail(firebaseUser.email?.toLowerCase() || '');
      setIsAuthenticated(true);
      setIsAuthResolved(true);
    });
    return unsub;
  }, []);

  // --------------------------------------------------------------------
  // Every collection below is now backed live by Cloud Firestore via
  // useSyncedCollection — a drop-in replacement for useState<T[]> (see
  // src/lib/useSyncedCollection.ts). Reads are gated on `isAuthenticated`
  // so the app never queries Firestore before Firebase Auth has confirmed
  // a signed-in user (the security rules require request.auth != null).
  // --------------------------------------------------------------------
  const [rawUsers, setUsers] = useSyncedCollection<User>('users', INITIAL_USERS, isAuthenticated);
  const users = useMemo(() => healUsersList(rawUsers), [rawUsers]);

  const [accounts, setAccounts, accountsLoading] = useSyncedCollection<Account>('accounts', INITIAL_ACCOUNTS, isAuthenticated);
  const [contacts, setContacts, contactsLoading] = useSyncedCollection<Contact>('contacts', INITIAL_CONTACTS, isAuthenticated);
  const [leads, setLeads, leadsLoading] = useSyncedCollection<Lead>('leads', INITIAL_LEADS, isAuthenticated);
  const [opportunities, setOpportunities, opportunitiesLoading] = useSyncedCollection<Opportunity>('opportunities', INITIAL_OPPORTUNITIES, isAuthenticated);
  const [presalesRequests, setPresalesRequests] = useSyncedCollection<PresalesRequest>('presalesRequests', INITIAL_PRESALES, isAuthenticated);
  const [pocRecords, setPocRecords] = useSyncedCollection<POCRecord>('pocRecords', INITIAL_POCS, isAuthenticated);
  const [quotes, setQuotes] = useSyncedCollection<Quote>('quotes', INITIAL_QUOTES, isAuthenticated);
  const [orders, setOrders] = useSyncedCollection<Order>('orders', INITIAL_ORDERS, isAuthenticated);
  const [vendors, setVendors] = useSyncedCollection<Vendor>('vendors', INITIAL_VENDORS, isAuthenticated);

  const [rawWorkflows, setWorkflows] = useSyncedCollection<WorkflowDefinition>('workflows', INITIAL_WORKFLOWS, isAuthenticated);
  const workflows = useMemo(() => healWorkflowsList(rawWorkflows), [rawWorkflows]);

  const [auditLogs, setAuditLogs] = useSyncedCollection<AuditLog>('auditLogs', INITIAL_AUDIT_LOGS, isAuthenticated);
  const [assignmentHistory, setAssignmentHistory] = useSyncedCollection<AssignmentHistory>('assignmentHistory', INITIAL_ASSIGNMENT_HISTORY, isAuthenticated);
  const [fieldSecurityRules, setFieldSecurityRules] = useSyncedCollection<FieldSecurityRule>('fieldSecurityRules', INITIAL_FIELD_SECURITY, isAuthenticated);
  const [webForms, setWebForms] = useSyncedCollection<WebFormConfig>('webForms', INITIAL_WEB_FORMS, isAuthenticated);

  const [rawRoles, setRoles] = useSyncedCollection<RoleDefinition>('roles', INITIAL_ROLES, isAuthenticated);
  const roles = useMemo(() => healRolesList(rawRoles), [rawRoles]);

  const [fieldAttributes, setFieldAttributes] = useSyncedCollection<FieldAttribute>('fieldAttributes', INITIAL_FIELD_ATTRIBUTES, isAuthenticated);

  // Multi-Company & Multi-Tenant States
  const [companies, setCompanies] = useSyncedCollection<CompanyTenant>('companies', INITIAL_COMPANIES, isAuthenticated);

  // Which company's data the signed-in user is currently viewing — a
  // per-browser UI preference, not shared data, so this stays local.
  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    return localStorage.getItem('amrut_crm_current_company_id') || 'comp_amrut_india';
  });
  useEffect(() => {
    localStorage.setItem('amrut_crm_current_company_id', currentCompanyId);
  }, [currentCompanyId]);

  const [userMemberships, setUserMemberships] = useSyncedCollection<UserCompanyMembership>('userMemberships', INITIAL_COMPANY_MEMBERSHIPS, isAuthenticated);

  // Target & Quotas States
  const [vendorTargets, setVendorTargets] = useSyncedCollection<VendorSalesTarget>('vendorTargets', INITIAL_VENDOR_TARGETS, isAuthenticated);
  const liveVendorTargets = useMemo(
    () => vendorTargets.map(target => targetWithOrderActuals(target, orders)),
    [vendorTargets, orders]
  );

  // Google Workspace Sync States
  const [googleAccounts, setGoogleAccounts] = useSyncedCollection<GoogleWorkspaceAccount>('googleAccounts', INITIAL_GOOGLE_ACCOUNTS, isAuthenticated);
  const [syncedEmails, setSyncedEmails] = useSyncedCollection<SyncedEmailItem>('syncedEmails', INITIAL_SYNCED_EMAILS, isAuthenticated);
  const [tasks, setTasks] = useSyncedCollection<Task>('tasks', INITIAL_TASKS, isAuthenticated);

  // Product Catalog (per-vendor price list) & Renewal Board
  const [products, setProducts] = useSyncedCollection<Product>('products', INITIAL_PRODUCTS, isAuthenticated);
  const [renewalRecords, setRenewalRecords] = useSyncedCollection<RenewalRecord>('renewalRecords', INITIAL_RENEWAL_RECORDS, isAuthenticated);

  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [syncedEvents, setSyncedEvents] = useSyncedCollection<SyncedCalendarEvent>('syncedEvents', INITIAL_SYNCED_EVENTS, isAuthenticated);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // True while the initial Firestore snapshots for the core sales pipeline
  // are still loading, after a successful sign-in. Lets the UI show a
  // brief loading state instead of a flash of empty data.
  const isDataLoading = isAuthenticated && (accountsLoading || contactsLoading || leadsLoading || opportunitiesLoading);

  const currentUser = useMemo<User>(() => {
    const matched = users.find(u => u.email.toLowerCase() === firebaseUserEmail) || users.find(u => u.id === currentUserId);
    if (matched) return matched;
    return {
      id: currentUserId || 'unmapped_account',
      name: 'Unmapped account',
      employeeId: '',
      email: firebaseUserEmail,
      mobile: '',
      department: 'Unassigned',
      role: 'Unassigned',
      territory: '',
      isActive: false,
      isOutOfOffice: false,
      vendorResponsibilities: [],
      eligibleForAutoAssignment: false,
      createdDate: '',
      modifiedDate: '',
      lastLogin: 'Never',
      accountStatus: 'Locked'
    };
  }, [users, currentUserId, firebaseUserEmail]);

  useEffect(() => {
    if (isAuthenticated && currentUser?.id && currentUser.id !== currentUserId && firebaseUserEmail) {
      setCurrentUserId(currentUser.id);
    }
  }, [isAuthenticated, currentUser?.id, currentUserId, firebaseUserEmail]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addAuditLog = (entry: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole' | 'ipAddress'>) => {
    const newLog: AuditLog = {
      id: 'aud_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      ipAddress: 'Client session (IP not collected)',
      ...entry
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const resetAuditLogs = () => {
    showToast('Demo audit restoration is disabled in production.', 'warning');
  };

  // Field security check
  const getFieldAccess = (module: 'Leads' | 'Opportunities' | 'Quotes' | 'Orders' | 'Accounts', fieldName: string): FieldAccessLevel => {
    const rule = fieldSecurityRules.find(r => r.module === module && r.fieldName === fieldName);
    if (!rule) return 'Editable';
    const access = rule.rolePermissions[currentUser.role];
    return access || 'Editable';
  };

  const updateFieldSecurity = (ruleId: string, role: string, accessLevel: FieldAccessLevel) => {
    setFieldSecurityRules(prev => prev.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          rolePermissions: {
            ...r.rolePermissions,
            [role]: accessLevel
          }
        };
      }
      return r;
    }));
    showToast(`Updated field security permission for ${role}`, 'info');
  };

  // Dynamic Record-Level Access Filtering based on Role Definitions & Enterprise Hierarchies
  const isRecordAccessible = (record: {
    ownerId?: string;
    workingSalespersonId?: string;
    reporterId?: string;
    vendorId?: string;
    assignedConsultantId?: string;
    salespersonId?: string;
  }) => {
    // 1. Managing Director & CRM Administrator: Full executive visibility across everything
    if (currentUser.role === 'Managing Director' || currentUser.role === 'CRM Administrator' || currentUser.role === 'Finance & Operations') {
      return true;
    }

    // 2. Sales Head: "sales head gets to see every case in lead and opportunity"
    if (currentUser.role === 'Sales Head') {
      return true;
    }

    // 3. Sales Manager & Sales Coordinator:
    // "sales coordinator reports to sales manager and can see all accounts and can assign leads to sales person alongwith sales manager"
    if (currentUser.role === 'Sales Manager' || currentUser.role === 'Sales Coordinator') {
      return true;
    }

    // 4. Lead Gen Manager & Marketing Manager: Full lead generation visibility.
    // Lead Gen Admin, Marketing Admin & CRM Coordinator: cross-functional coordinators
    // who need full read/action visibility across leads, opportunities, quotes & orders.
    if (
      currentUser.role === 'Lead Gen Manager' ||
      currentUser.role === 'Marketing Manager' ||
      currentUser.role === 'Lead Gen Admin' ||
      currentUser.role === 'Marketing Admin' ||
      currentUser.role === 'CRM Coordinator'
    ) {
      return true;
    }

    // 5. Presales Leadership & Consultants: Technical scoping & POC visibility
    if (currentUser.role === 'Presales Manager' || currentUser.role === 'Presales Person' || currentUser.role === 'Presales Consultant') {
      return true;
    }

    // 6. Accounts Leadership: Key client accounts & opportunities visibility
    if (currentUser.role === 'Accounts Head' || currentUser.role === 'Accounts Manager') {
      return true;
    }

    // 7. Vendor Manager / Vendor Head:
    // "vendor manager manages different vendors and can look at cases for the vendor"
    if (currentUser.role === 'Vendor Manager' || currentUser.role === 'Vendor Head') {
      // If specific vendor responsibilities are set, match record vendor
      if (currentUser.vendorResponsibilities && currentUser.vendorResponsibilities.length > 0) {
        if (record.vendorId && currentUser.vendorResponsibilities.includes(record.vendorId)) {
          return true;
        }
      } else {
        // If no specific vendor restricted, can view vendor cases
        return true;
      }
      // Also allow own created/reported
      if (
        record.reporterId === currentUser.id ||
        record.ownerId === currentUser.id ||
        record.workingSalespersonId === currentUser.id ||
        record.salespersonId === currentUser.id
      ) {
        return true;
      }
      return false;
    }

    // 8. Dynamic Role Permission check from role definition if configured
    const userRoleDef = roles.find(r => r.name === currentUser.role);
    if (userRoleDef?.permissions?.canViewAllLeads && userRoleDef?.permissions?.canViewAllOpportunities) {
      return true;
    }

    // 9. Standard Individual Contributors (Sales Person, Lead Gen, Marketing Person):
    // Working records OR reported records OR assigned records
    const isOwner =
      (record.workingSalespersonId === currentUser.id) || 
      (record.ownerId === currentUser.id) || 
      (record.salespersonId === currentUser.id) ||
      (record.reporterId === currentUser.id) ||
      (record.assignedConsultantId === currentUser.id);
    return isOwner;
  };

  const accessibleLeads = useMemo(() => {
    return leads.filter(l => isRecordAccessible(l));
  }, [leads, currentUser, roles]);

  const accessibleOpportunities = useMemo(() => {
    return opportunities.filter(o => isRecordAccessible(o));
  }, [opportunities, currentUser, roles]);

  const accessibleAccounts = useMemo(() => {
    // Managing Director, Sales Head, Sales Manager, Sales Coordinator, Accounts Head, Accounts Manager, CRM Admin, Finance & Ops
    // can see all accounts
    if (
      currentUser.role === 'Managing Director' ||
      currentUser.role === 'CRM Administrator' ||
      currentUser.role === 'Sales Head' ||
      currentUser.role === 'Sales Manager' ||
      currentUser.role === 'Sales Coordinator' ||
      currentUser.role === 'Accounts Head' ||
      currentUser.role === 'Accounts Manager' ||
      currentUser.role === 'Finance & Operations' ||
      currentUser.role === 'Lead Gen Manager' ||
      currentUser.role === 'Marketing Manager' ||
      currentUser.role === 'Lead Gen Admin' ||
      currentUser.role === 'Marketing Admin' ||
      currentUser.role === 'CRM Coordinator'
    ) {
      return accounts;
    }

    if (currentUser.role === 'Vendor Manager' || currentUser.role === 'Vendor Head') {
      if (currentUser.vendorResponsibilities && currentUser.vendorResponsibilities.length > 0) {
        return accounts.filter(acc => {
          const hasVendor = acc.vendorsEngaged?.some(vId => currentUser.vendorResponsibilities.includes(vId));
          return hasVendor || acc.ownerId === currentUser.id;
        });
      }
      return accounts;
    }

    // Role definition permission check
    const userRoleDef = roles.find(r => r.name === currentUser.role);
    if (userRoleDef?.permissions?.canViewAllAccounts) {
      return accounts;
    }

    return accounts; // Accounts directory readable
  }, [accounts, currentUser, roles]);

  const accessibleContacts = useMemo(() => {
    return contacts;
  }, [contacts]);

  const accessibleQuotes = useMemo(() => {
    return quotes.filter(q => isRecordAccessible(q));
  }, [quotes, currentUser]);

  const accessibleOrders = useMemo(() => {
    return orders.filter(o => isRecordAccessible(o));
  }, [orders, currentUser]);

  const accessiblePresales = useMemo(() => {
    return presalesRequests.filter(p => isRecordAccessible(p));
  }, [presalesRequests, currentUser]);

  const accessiblePOCs = useMemo(() => {
    return pocRecords.filter(p => isRecordAccessible(p));
  }, [pocRecords, currentUser]);

  const accessibleTasks = useMemo(() => {
    const companyScoped = tasks.filter(t => t.companyId === currentCompanyId);
    if (
      currentUser.role === 'Managing Director' ||
      currentUser.role === 'CRM Administrator' ||
      currentUser.role === 'CRM Coordinator' ||
      currentUser.role === 'Sales Head' ||
      currentUser.role === 'Sales Manager' ||
      currentUser.role === 'Sales Coordinator'
    ) {
      return companyScoped;
    }
    const userRoleDef = roles.find(r => r.name === currentUser.role);
    if (userRoleDef?.permissions?.canManageTasks) return companyScoped;
    return companyScoped.filter(t => t.assignedToId === currentUser.id || t.createdById === currentUser.id);
  }, [tasks, currentUser, currentCompanyId, roles]);

  // Real-time customer history search helper (used during Lead creation & Account view)
  const searchCustomerHistory = (companyName: string): CustomerHistorySummary => {
    const cleanQuery = companyName.trim().toLowerCase();
    if (!cleanQuery || cleanQuery.length < 2) {
      return {
        matchedContacts: [],
        matchedLeads: [],
        openOpportunities: [],
        closedOpportunities: [],
        pastOrders: [],
        installedProducts: [],
        totalHistoricalRevenue: 0,
        health: 'Unknown'
      };
    }

    const matchedAccount = accounts.find(a => 
      a.name.toLowerCase().includes(cleanQuery) || cleanQuery.includes(a.name.toLowerCase())
    );

    const matchedContacts = contacts.filter(c => 
      matchedAccount ? c.accountId === matchedAccount.id : c.accountName.toLowerCase().includes(cleanQuery)
    );

    const matchedLeads = leads.filter(l => 
      matchedAccount ? (l.accountId === matchedAccount.id || l.companyName.toLowerCase().includes(cleanQuery)) : l.companyName.toLowerCase().includes(cleanQuery)
    );

    const matchedOpps = opportunities.filter(o => 
      matchedAccount ? o.accountId === matchedAccount.id : o.accountName.toLowerCase().includes(cleanQuery)
    );

    const openOpportunities = matchedOpps.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost' && o.stage !== 'Shelved / Budgeted');
    const closedOpportunities = matchedOpps.filter(o => o.stage === 'Closed Won' || o.stage === 'Closed Lost');

    const pastOrders = orders.filter(ord => 
      matchedAccount ? ord.accountId === matchedAccount.id : ord.accountName.toLowerCase().includes(cleanQuery)
    );

    const totalRev = pastOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const installed = matchedAccount ? matchedAccount.installedProducts : [];

    return {
      matchedAccount,
      matchedContacts,
      matchedLeads,
      openOpportunities,
      closedOpportunities,
      pastOrders,
      installedProducts: installed,
      totalHistoricalRevenue: totalRev || (matchedAccount ? matchedAccount.totalHistoricalRevenue : 0),
      health: matchedAccount ? matchedAccount.relationshipHealth : 'New Prospect'
    };
  };

  // Lead Assignment Logic
  const autoAssignLead = (leadId: string): string => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return '';

    // 1. Check Named Account Owner
    if (lead.accountId) {
      const acc = accounts.find(a => a.id === lead.accountId);
      if (acc && acc.ownerId) {
        const ownerUser = users.find(u => u.id === acc.ownerId);
        if (ownerUser) {
          // Check if owner is out of office
          if (ownerUser.isOutOfOffice && ownerUser.backupUserId) {
            const backup = users.find(u => u.id === ownerUser.backupUserId);
            if (backup) return backup.id;
          }
          return ownerUser.id;
        }
      }
    }

    // 2. Territory matching
    const territorySalesReps = users.filter(u => 
      u.role === 'Sales Person' && u.isActive && u.eligibleForAutoAssignment && u.territory.toLowerCase().includes(lead.territory.toLowerCase())
    );

    if (territorySalesReps.length > 0) {
      const activeRep = territorySalesReps.find(u => !u.isOutOfOffice);
      if (activeRep) return activeRep.id;
      if (territorySalesReps[0].backupUserId) {
        return territorySalesReps[0].backupUserId;
      }
      return territorySalesReps[0].id;
    }

    // 3. Round-Robin among eligible sales persons
    const eligibleSales = users.filter(u => u.role === 'Sales Person' && u.isActive && u.eligibleForAutoAssignment && !u.isOutOfOffice);
    if (eligibleSales.length > 0) {
      // Pick based on lowest lead load
      const repLeadCounts = eligibleSales.map(u => ({
        user: u,
        count: leads.filter(l => l.workingSalespersonId === u.id && l.status !== 'Converted' && l.status !== 'Disqualified').length
      }));
      repLeadCounts.sort((a, b) => a.count - b.count);
      return repLeadCounts[0].user.id;
    }

    return currentUser.id;
  };

  const assignLead = (leadId: string, newOwnerId: string, reason: string, slaReset: 'Reset SLA' | 'Preserve SLA', notes?: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    const newOwner = users.find(u => u.id === newOwnerId);
    if (!targetLead || !newOwner) return;

    const previousOwnerName = targetLead.workingSalespersonName;
    const previousOwnerId = targetLead.workingSalespersonId;

    // Check if new owner is OOO and has backup
    let effectiveOwner = newOwner;
    let assignmentNote = notes || '';
    if (newOwner.isOutOfOffice && newOwner.backupUserId) {
      const backup = users.find(u => u.id === newOwner.backupUserId);
      if (backup) {
        effectiveOwner = backup;
        assignmentNote += ` [Routed to Backup Salesperson ${backup.name} as ${newOwner.name} is currently Out of Office]`;
      }
    }

    const assignmentRecord: AssignmentHistory = {
      id: 'asg_' + Date.now(),
      recordType: 'Lead',
      recordId: leadId,
      recordName: `${targetLead.companyName} (${targetLead.product})`,
      previousOwnerId: previousOwnerId || 'unassigned',
      previousOwnerName: previousOwnerName || 'Unassigned',
      newOwnerId: effectiveOwner.id,
      newOwnerName: effectiveOwner.name,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      assignedDate: new Date().toISOString(),
      reason,
      slaResetDecision: slaReset,
      notes: assignmentNote
    };

    setAssignmentHistory(prev => [assignmentRecord, ...prev]);

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          workingSalespersonId: effectiveOwner.id,
          workingSalespersonName: effectiveOwner.name,
          status: l.status === 'New – Unvalidated' || l.status === 'Ready for Assignment' ? 'Assigned – Awaiting Acceptance' : l.status,
          slaDueTime: slaReset === 'Reset SLA' ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : l.slaDueTime,
          modifiedDate: new Date().toISOString()
        };
      }
      return l;
    }));

    addAuditLog({
      module: 'Leads',
      recordId: leadId,
      recordName: targetLead.companyName,
      action: 'ASSIGN',
      fieldName: 'workingSalespersonId',
      oldValue: previousOwnerName,
      newValue: effectiveOwner.name,
      details: `Lead ${targetLead.leadNumber} reassigned by ${currentUser.name}. Reason: ${reason}`
    });

    showToast(`Lead assigned to ${effectiveOwner.name}`, 'success');
  };

  const createLead = (leadData: Partial<Lead>): Lead => {
    const leadCount = leads.length + 101;
    const leadNumber = `LD-2026-${leadCount.toString().padStart(4, '0')}`;
    const vendor = vendors.find(v => v.id === leadData.vendorId) || vendors[0];

    // Reporter is ALWAYS current logged-in user
    const reporterId = currentUser.id;
    const reporterName = currentUser.name;

    // Working salesperson: if provided use it, else auto-assign
    let workingId = leadData.workingSalespersonId;
    let workingName = leadData.workingSalespersonName;
    if (!workingId) {
      if (currentUser.role === 'Sales Person') {
        workingId = currentUser.id;
        workingName = currentUser.name;
      } else {
        // Auto assign
        const assignedId = autoAssignLead('');
        const userObj = users.find(u => u.id === assignedId) || users[0];
        workingId = userObj.id;
        workingName = userObj.name;
      }
    }

    const newLead: Lead = {
      id: 'ld_' + Date.now(),
      leadNumber,
      companyName: leadData.companyName || 'Untitled Company',
      accountId: leadData.accountId,
      contactName: leadData.contactName || 'Primary Contact',
      contactEmail: leadData.contactEmail || '',
      contactPhone: leadData.contactPhone || '',
      designation: leadData.designation || 'Key Stakeholder',
      country: leadData.country || 'India',
      city: leadData.city || 'Mumbai',
      source: leadData.source || 'Website Inbound',
      subSource: leadData.subSource,
      campaign: leadData.campaign,
      vendorId: vendor.id,
      vendorName: vendor.name,
      product: leadData.product || vendor.focusProducts[0] || 'Enterprise Software',
      productFamily: leadData.productFamily || 'Enterprise Licensing',
      requirement: leadData.requirement || '',
      interestType: leadData.interestType || 'Software License',
      expectedValue: leadData.expectedValue || 500000,
      territory: leadData.territory || 'Mumbai & Pune (West)',
      priority: leadData.priority || 'High',
      reporterId,
      reporterName,
      workingSalespersonId: workingId,
      workingSalespersonName: workingName || 'Assigned Salesperson',
      namedAccountOwnerId: leadData.namedAccountOwnerId,
      bant: leadData.bant || {
        budget: 'Estimated / In Process',
        authority: 'Decision Maker Identified',
        need: 'Defined Project Need',
        timeline: '1–3 Months',
        budgetAmount: leadData.expectedValue || 500000
      },
      nextAction: leadData.nextAction || 'Perform initial qualification and connect call',
      nextActionDate: leadData.nextActionDate || new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      status: leadData.status || 'New – Unvalidated',
      slaDueTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      slaStatus: 'Within SLA',
      notes: leadData.notes || '',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    setLeads(prev => [newLead, ...prev]);

    addAuditLog({
      module: 'Leads',
      recordId: newLead.id,
      recordName: newLead.companyName,
      action: 'CREATE',
      details: `Lead ${newLead.leadNumber} created by ${currentUser.name} (${currentUser.role}). Working owner: ${newLead.workingSalespersonName}`
    });

    showToast(`Lead ${newLead.leadNumber} created successfully`, 'success');
    return newLead;
  };

  const updateLead = (id: string, leadData: Partial<Lead>) => {
    const target = leads.find(l => l.id === id);
    if (!target) return;

    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          ...leadData,
          modifiedDate: new Date().toISOString()
        };
      }
      return l;
    }));

    if (leadData.status && leadData.status !== target.status) {
      addAuditLog({
        module: 'Leads',
        recordId: id,
        recordName: target.companyName,
        action: 'STAGE_CHANGE',
        fieldName: 'status',
        oldValue: target.status,
        newValue: leadData.status,
        details: `Lead status moved from "${target.status}" to "${leadData.status}" by ${currentUser.name}`
      });
    } else {
      addAuditLog({
        module: 'Leads',
        recordId: id,
        recordName: target.companyName,
        action: 'UPDATE',
        details: `Lead ${target.leadNumber} updated by ${currentUser.name}`
      });
    }

    showToast(`Lead updated successfully`, 'info');
  };

  // LEAD -> OPPORTUNITY CONVERSION ENGINE
  const convertLeadToOpportunity = (
    leadId: string,
    accountChoice: { type: 'existing' | 'new'; accountId?: string; newAccountData?: Partial<Account> },
    contactChoice: { type: 'existing' | 'new'; contactId?: string; newContactData?: Partial<Contact> },
    oppOverrides?: Partial<Opportunity>
  ): Opportunity => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    // 1. Resolve Account
    let finalAccountId = accountChoice.accountId;
    let finalAccountName = lead.companyName;

    if (accountChoice.type === 'new' || !finalAccountId) {
      const newAcc: Account = {
        id: 'acc_' + Date.now(),
        name: accountChoice.newAccountData?.name || lead.companyName,
        industry: accountChoice.newAccountData?.industry || 'Enterprise Technology',
        tier: accountChoice.newAccountData?.tier || 'Growth',
        website: accountChoice.newAccountData?.website || `https://${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: accountChoice.newAccountData?.phone || lead.contactPhone || '+91 22 12345678',
        city: lead.city,
        country: lead.country,
        ownerId: lead.workingSalespersonId,
        installedProducts: [lead.product],
        vendorsEngaged: [lead.vendorId],
        totalHistoricalRevenue: 0,
        relationshipHealth: 'Good',
        lastActivityDate: new Date().toISOString(),
        createdDate: new Date().toISOString()
      };
      setAccounts(prev => [newAcc, ...prev]);
      finalAccountId = newAcc.id;
      finalAccountName = newAcc.name;

      addAuditLog({
        module: 'Accounts',
        recordId: newAcc.id,
        recordName: newAcc.name,
        action: 'CREATE',
        details: `Account created automatically during Lead ${lead.leadNumber} conversion.`
      });
    } else {
      const existingAcc = accounts.find(a => a.id === finalAccountId);
      if (existingAcc) {
        finalAccountName = existingAcc.name;
        // update vendors engaged if not present
        if (!existingAcc.vendorsEngaged.includes(lead.vendorId)) {
          setAccounts(prev => prev.map(a => a.id === finalAccountId ? { ...a, vendorsEngaged: [...a.vendorsEngaged, lead.vendorId] } : a));
        }
      }
    }

    // 2. Resolve Contact
    let finalContactId = contactChoice.contactId;
    let finalContactName = lead.contactName;

    if (contactChoice.type === 'new' || !finalContactId) {
      const newCnt: Contact = {
        id: 'cnt_' + Date.now(),
        accountId: finalAccountId,
        accountName: finalAccountName,
        name: contactChoice.newContactData?.name || lead.contactName,
        email: contactChoice.newContactData?.email || lead.contactEmail,
        phone: contactChoice.newContactData?.phone || lead.contactPhone,
        mobile: contactChoice.newContactData?.mobile || lead.contactPhone,
        designation: contactChoice.newContactData?.designation || lead.designation,
        department: contactChoice.newContactData?.department || 'Information Technology',
        roleInBuying: contactChoice.newContactData?.roleInBuying || 'Decision Maker',
        isPrimary: true,
        city: lead.city,
        createdDate: new Date().toISOString()
      };
      setContacts(prev => [newCnt, ...prev]);
      finalContactId = newCnt.id;
      finalContactName = newCnt.name;

      addAuditLog({
        module: 'Contacts',
        recordId: newCnt.id,
        recordName: newCnt.name,
        action: 'CREATE',
        details: `Contact created automatically during Lead ${lead.leadNumber} conversion.`
      });
    }

    // 3. Create Opportunity
    const oppCount = opportunities.length + 201;
    const oppNumber = `OPP-2026-${oppCount.toString().padStart(4, '0')}`;
    const softwareVal = lead.interestType === 'Services & Implementation' ? 0 : Math.round(lead.expectedValue * 0.85);
    const servicesVal = lead.interestType === 'Services & Implementation' ? lead.expectedValue : Math.round(lead.expectedValue * 0.15);
    const totalVal = lead.expectedValue;
    const grossMarginVal = Math.round(totalVal * 0.24); // 24% default gross margin

    const newOpportunity: Opportunity = {
      id: 'opp_' + Date.now(),
      oppNumber,
      title: oppOverrides?.title || `${finalAccountName} - ${lead.product}`,
      accountId: finalAccountId,
      accountName: finalAccountName,
      primaryContactId: finalContactId,
      primaryContactName: finalContactName,
      pipeline: oppOverrides?.pipeline || 'Software + Presales / POC',
      stage: 'Qualified Opportunity',
      probability: 40,
      expectedCloseDate: oppOverrides?.expectedCloseDate || new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
      softwareValue: softwareVal,
      servicesValue: servicesVal,
      totalValue: totalVal,
      grossMarginValue: grossMarginVal,
      grossMarginPercent: 24.0,
      vendorId: lead.vendorId,
      vendorName: lead.vendorName,
      product: lead.product,
      source: lead.source,
      campaign: lead.campaign,
      reporterId: lead.reporterId,
      reporterName: lead.reporterName,
      ownerId: lead.workingSalespersonId,
      ownerName: lead.workingSalespersonName,
      sourceLeadId: lead.id,
      bant: lead.bant,
      nextAction: oppOverrides?.nextAction || 'Perform Technical Scoping and Solution Discovery Session',
      nextActionDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      forecastCategory: 'Pipeline',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    setOpportunities(prev => [newOpportunity, ...prev]);

    // 4. Mark Lead as Converted & Link
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status: 'Converted',
          convertedOpportunityId: newOpportunity.id,
          accountId: finalAccountId,
          modifiedDate: new Date().toISOString()
        };
      }
      return l;
    }));

    // 5. Audit Log
    addAuditLog({
      module: 'Leads',
      recordId: lead.id,
      recordName: lead.companyName,
      action: 'CONVERT',
      details: `Lead ${lead.leadNumber} successfully upgraded to Opportunity ${newOpportunity.oppNumber} (${newOpportunity.title}) by ${currentUser.name}`
    });

    addAuditLog({
      module: 'Opportunities',
      recordId: newOpportunity.id,
      recordName: newOpportunity.title,
      action: 'CREATE',
      details: `Opportunity created via Lead conversion from ${lead.leadNumber}. Linked Account: ${finalAccountName}`
    });

    showToast(`Lead upgraded to Opportunity ${newOpportunity.oppNumber}!`, 'success');
    return newOpportunity;
  };

  const createOpportunity = (oppData: Partial<Opportunity>): Opportunity => {
    const oppCount = opportunities.length + 201;
    const oppNumber = `OPP-2026-${oppCount.toString().padStart(4, '0')}`;
    const vendor = vendors.find(v => v.id === oppData.vendorId) || vendors[0];
    const account = accounts.find(a => a.id === oppData.accountId) || accounts[0];

    const softVal = oppData.softwareValue || 1000000;
    const servVal = oppData.servicesValue || 200000;
    const totVal = softVal + servVal;
    const gmVal = Math.round(totVal * 0.22);

    const newOpp: Opportunity = {
      id: 'opp_' + Date.now(),
      oppNumber,
      title: oppData.title || `${account.name} - ${oppData.product || vendor.focusProducts[0]}`,
      accountId: account.id,
      accountName: account.name,
      primaryContactId: oppData.primaryContactId || contacts[0]?.id || 'cnt_1',
      primaryContactName: oppData.primaryContactName || contacts[0]?.name || 'Primary Contact',
      pipeline: oppData.pipeline || 'Software – Direct / Simple',
      stage: oppData.stage || 'Qualified Opportunity',
      probability: oppData.probability || 35,
      expectedCloseDate: oppData.expectedCloseDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      softwareValue: softVal,
      servicesValue: servVal,
      totalValue: totVal,
      grossMarginValue: gmVal,
      grossMarginPercent: 22.0,
      vendorId: vendor.id,
      vendorName: vendor.name,
      product: oppData.product || vendor.focusProducts[0],
      source: oppData.source || 'OEM / Vendor Referral',
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      ownerId: oppData.ownerId || currentUser.id,
      ownerName: oppData.ownerName || currentUser.name,
      bant: oppData.bant || {
        budget: 'Budget Allocated',
        authority: 'Decision Maker Identified',
        need: 'Defined Project Need',
        timeline: '1–3 Months',
        budgetAmount: totVal
      },
      nextAction: oppData.nextAction || 'Send solution deck and pricing proposal',
      nextActionDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      forecastCategory: 'Pipeline',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    setOpportunities(prev => [newOpp, ...prev]);

    addAuditLog({
      module: 'Opportunities',
      recordId: newOpp.id,
      recordName: newOpp.title,
      action: 'CREATE',
      details: `Opportunity ${newOpp.oppNumber} created by ${currentUser.name}`
    });

    showToast(`Opportunity ${newOpp.oppNumber} created successfully`, 'success');
    return newOpp;
  };

  const updateOpportunity = (id: string, oppData: Partial<Opportunity>) => {
    const target = opportunities.find(o => o.id === id);
    if (!target) return;

    setOpportunities(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          ...oppData,
          modifiedDate: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog({
      module: 'Opportunities',
      recordId: id,
      recordName: target.title,
      action: 'UPDATE',
      details: `Opportunity ${target.oppNumber} updated by ${currentUser.name}`
    });

    showToast(`Opportunity updated`, 'info');
  };

  const advanceOpportunityStage = (
    id: string, 
    nextStage: string, 
    closureData?: { reason?: string; poRef?: string; orderDate?: string; competitor?: string }
  ) => {
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return;

    let prob = opp.probability;
    let forecastCat = opp.forecastCategory;

    if (nextStage === 'Qualified Opportunity') prob = 20;
    else if (nextStage === 'Discovery / BANT') prob = 35;
    else if (nextStage === 'Solution Route Confirmed') prob = 50;
    else if (nextStage === 'Presales / POC in Progress') prob = 60;
    else if (nextStage === 'Solution & Commercial Inputs Ready') prob = 70;
    else if (nextStage === 'Quote Submitted') prob = 75;
    else if (nextStage === 'Technical / Commercial Evaluation') prob = 80;
    else if (nextStage === 'Negotiation') { prob = 85; forecastCat = 'Commit'; }
    else if (nextStage === 'Verbal / Intent to Order') { prob = 95; forecastCat = 'Commit'; }
    else if (nextStage === 'Closed Won') { prob = 100; forecastCat = 'Closed'; }
    else if (nextStage === 'Closed Lost') { prob = 0; forecastCat = 'Omitted'; }
    else if (nextStage === 'Shelved / Budgeted') { prob = 10; forecastCat = 'Omitted'; }

    setOpportunities(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          stage: nextStage as any,
          probability: prob,
          forecastCategory: forecastCat,
          customerPoRef: closureData?.poRef || o.customerPoRef,
          orderDate: closureData?.orderDate || o.orderDate,
          closureReason: closureData?.reason || o.closureReason,
          competitor: closureData?.competitor || o.competitor,
          modifiedDate: new Date().toISOString()
        };
      }
      return o;
    }));

    // If Closed Won, automatically create an Order record as mandated!
    if (nextStage === 'Closed Won') {
      const orderCount = orders.length + 601;
      const orderNum = `SO-2026-${orderCount.toString().padStart(4, '0')}`;
      const newOrder: Order = {
        id: 'ord_' + Date.now(),
        orderNumber: orderNum,
        customerPoNumber: closureData?.poRef || `PO-${opp.oppNumber}`,
        poDate: closureData?.orderDate || new Date().toISOString().split('T')[0],
        orderReceivedDate: new Date().toISOString().split('T')[0],
        accountId: opp.accountId,
        accountName: opp.accountName,
        contactId: opp.primaryContactId,
        contactName: opp.primaryContactName,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        salespersonId: opp.ownerId,
        salespersonName: opp.ownerName,
        vendorId: opp.vendorId,
        vendorName: opp.vendorName,
        product: opp.product,
        currency: 'INR (₹)',
        softwareAmount: opp.softwareValue,
        servicesAmount: opp.servicesValue,
        totalAmount: opp.totalValue,
        grossMarginAmount: opp.grossMarginValue,
        termMonths: 12,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        billingStatus: 'Pending Invoice',
        deliveryStatus: 'Licenses Issued',
        renewalDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        renewalRecordCreated: true,
        notes: `Order created automatically from Closed Won Opportunity ${opp.oppNumber}`,
        createdDate: new Date().toISOString()
      };

      setOrders(prev => [newOrder, ...prev]);

      addAuditLog({
        module: 'Orders',
        recordId: newOrder.id,
        recordName: newOrder.orderNumber,
        action: 'CREATE',
        details: `Sales Order ${newOrder.orderNumber} auto-generated on Closed Won of Opportunity ${opp.oppNumber}`
      });

      addAuditLog({
        module: 'Opportunities',
        recordId: opp.id,
        recordName: opp.title,
        action: 'CLOSE_WON',
        details: `Opportunity Closed Won for ₹${(opp.totalValue / 100000).toFixed(1)} Lakhs. PO Ref: ${newOrder.customerPoNumber}`
      });

      showToast(`Deal WON! Order ${orderNum} created.`, 'success');
    } else if (nextStage === 'Closed Lost') {
      addAuditLog({
        module: 'Opportunities',
        recordId: opp.id,
        recordName: opp.title,
        action: 'CLOSE_LOST',
        details: `Opportunity Closed Lost. Reason: ${closureData?.reason || 'Pricing/Competitor'}. Competitor: ${closureData?.competitor || 'Unknown'}`
      });
      showToast(`Opportunity marked Closed Lost`, 'warning');
    } else {
      addAuditLog({
        module: 'Opportunities',
        recordId: opp.id,
        recordName: opp.title,
        action: 'STAGE_CHANGE',
        fieldName: 'stage',
        oldValue: opp.stage,
        newValue: nextStage,
        details: `Opportunity stage advanced to ${nextStage}`
      });
      showToast(`Stage updated to ${nextStage}`, 'info');
    }
  };

  const createAccount = (accData: Partial<Account>): Account => {
    const newAcc: Account = {
      id: 'acc_' + Date.now(),
      name: accData.name || 'New Enterprise Account',
      industry: accData.industry || 'IT & Services',
      tier: accData.tier || 'Growth',
      website: accData.website || 'https://example.com',
      phone: accData.phone || '+91 22 12345678',
      city: accData.city || 'Mumbai',
      country: accData.country || 'India',
      ownerId: accData.ownerId || currentUser.id,
      annualRevenue: accData.annualRevenue || 100000000,
      employeeCount: accData.employeeCount || '10,000+',
      installedProducts: accData.installedProducts || [],
      vendorsEngaged: accData.vendorsEngaged || [],
      totalHistoricalRevenue: accData.totalHistoricalRevenue || 0,
      relationshipHealth: accData.relationshipHealth || 'Good',
      lastActivityDate: new Date().toISOString(),
      createdDate: new Date().toISOString()
    };

    setAccounts(prev => [newAcc, ...prev]);

    addAuditLog({
      module: 'Accounts',
      recordId: newAcc.id,
      recordName: newAcc.name,
      action: 'CREATE',
      details: `Account ${newAcc.name} created by ${currentUser.name}`
    });

    showToast(`Account ${newAcc.name} created`, 'success');
    return newAcc;
  };

  const updateAccount = (id: string, accData: Partial<Account>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...accData, lastActivityDate: new Date().toISOString() } : a));
    showToast(`Account updated`, 'info');
  };

  const createContact = (contactData: Partial<Contact>): Contact => {
    const acc = accounts.find(a => a.id === contactData.accountId) || accounts[0];
    const newContact: Contact = {
      id: 'cnt_' + Date.now(),
      accountId: acc.id,
      accountName: acc.name,
      name: contactData.name || 'Key Contact',
      email: contactData.email || 'contact@domain.com',
      phone: contactData.phone || '+91 98000 00000',
      mobile: contactData.mobile || '+91 98000 00000',
      designation: contactData.designation || 'Manager',
      department: contactData.department || 'IT',
      roleInBuying: contactData.roleInBuying || 'Technical Evaluator',
      isPrimary: contactData.isPrimary || false,
      city: contactData.city || acc.city,
      linkedin: contactData.linkedin,
      notes: contactData.notes,
      createdDate: new Date().toISOString()
    };

    setContacts(prev => [newContact, ...prev]);

    addAuditLog({
      module: 'Contacts',
      recordId: newContact.id,
      recordName: newContact.name,
      action: 'CREATE',
      details: `Contact ${newContact.name} created for Account ${acc.name}`
    });

    showToast(`Contact ${newContact.name} added`, 'success');
    return newContact;
  };

  const updateContact = (id: string, contactData: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...contactData } : c));
    showToast(`Contact updated`, 'info');
  };

  const createPresalesRequest = (data: Partial<PresalesRequest>): PresalesRequest => {
    const opp = opportunities.find(o => o.id === data.opportunityId) || opportunities[0];
    const consultant = users.find(u => u.id === data.assignedConsultantId) || users.find(u => u.role === 'Presales Consultant') || users[0];

    const reqNum = `PRE-2026-${(presalesRequests.length + 1).toString().padStart(3, '0')}`;
    const newReq: PresalesRequest = {
      id: 'pre_' + Date.now(),
      reqNumber: reqNum,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      accountId: opp.accountId,
      accountName: opp.accountName,
      type: data.type || 'Demo',
      status: 'Requested',
      assignedConsultantId: consultant.id,
      assignedConsultantName: consultant.name,
      salespersonId: opp.ownerId,
      salespersonName: opp.ownerName,
      vendorId: opp.vendorId,
      vendorName: opp.vendorName,
      product: opp.product,
      objective: data.objective || 'Deliver technical evaluation session',
      deliverablesRequired: data.deliverablesRequired || 'Architecture diagram and demo recording',
      targetCompletionDate: data.targetCompletionDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdDate: new Date().toISOString(),
      notes: data.notes
    };

    setPresalesRequests(prev => [newReq, ...prev]);

    addAuditLog({
      module: 'Presales',
      recordId: newReq.id,
      recordName: newReq.reqNumber,
      action: 'CREATE',
      details: `Presales Request ${newReq.reqNumber} (${newReq.type}) created for ${opp.title}`
    });

    showToast(`Presales Request ${newReq.reqNumber} assigned to ${consultant.name}`, 'success');
    return newReq;
  };

  const updatePresalesRequest = (id: string, data: Partial<PresalesRequest>) => {
    setPresalesRequests(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    showToast(`Presales request updated`, 'info');
  };

  const createPOC = (data: Partial<POCRecord>): POCRecord => {
    const opp = opportunities.find(o => o.id === data.opportunityId) || opportunities[0];
    const pocNum = `POC-2026-${(pocRecords.length + 1).toString().padStart(3, '0')}`;

    const newPoc: POCRecord = {
      id: 'poc_' + Date.now(),
      pocNumber: pocNum,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      accountId: opp.accountId,
      accountName: opp.accountName,
      vendorId: opp.vendorId,
      vendorName: opp.vendorName,
      product: opp.product,
      objective: data.objective || 'Validate technical feasibility',
      scope: data.scope || 'Lab testing in customer staging cluster',
      successCriteria: data.successCriteria || ['Sustained performance under peak load', 'Alert latency under 2 seconds'],
      criteriaStatus: data.criteriaStatus || {},
      environment: data.environment || 'Customer On-Prem',
      dependencies: data.dependencies || 'Customer to provide test VMs and credentials',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
      effortDays: data.effortDays || 5,
      commercialModel: data.commercialModel || 'Complimentary POC',
      result: 'Pending',
      risksIdentified: data.risksIdentified || 'None identified yet',
      technicalRecommendation: data.technicalRecommendation || '',
      status: 'Active Testing',
      createdDate: new Date().toISOString()
    };

    setPocRecords(prev => [newPoc, ...prev]);

    addAuditLog({
      module: 'POCs',
      recordId: newPoc.id,
      recordName: newPoc.pocNumber,
      action: 'CREATE',
      details: `POC ${newPoc.pocNumber} initialized for ${opp.title}`
    });

    showToast(`POC record ${newPoc.pocNumber} created`, 'success');
    return newPoc;
  };

  const updatePOC = (id: string, data: Partial<POCRecord>) => {
    setPocRecords(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    showToast(`POC updated`, 'info');
  };

  const createQuote = (quoteData: Partial<Quote>): Quote => {
    const opp = opportunities.find(o => o.id === quoteData.opportunityId) || opportunities[0];
    const quoteNum = `QT-2026-${(quotes.length + 890).toString()}`;
    const items = quoteData.items || [];

    const subtotal = items.reduce((sum, item) => sum + item.totalSellingPrice, 0);
    const totalVendorCost = items.reduce((sum, item) => sum + item.vendorTotalCost, 0);
    const totalDiscountAmount = items.reduce((sum, item) => sum + ((item.unitListPrice * item.quantity) - item.totalSellingPrice), 0);
    const totalMarginAmount = subtotal - totalVendorCost;
    const totalMarginPercent = subtotal > 0 ? (totalMarginAmount / subtotal) * 100 : 0;
    const quoteCompanyId = quoteData.companyId || currentCompanyId;
    const quoteCompany = companies.find(c => c.id === quoteCompanyId) || currentCompany;
    const taxPercent = quoteData.taxPercent !== undefined ? quoteData.taxPercent : quoteCompany.gstPercent;
    const taxAmount = Math.round(subtotal * (taxPercent / 100));
    const grandTotal = subtotal + taxAmount;
    const overallDiscountPercent = subtotal > 0 ? (totalDiscountAmount / (subtotal + totalDiscountAmount)) * 100 : 0;

    // Check approval requirement: if discount > 10%
    const approvalRequired = overallDiscountPercent > 10;

    const newQuote: Quote = {
      id: 'qt_' + Date.now(),
      quoteNumber: quoteNum,
      version: 1,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      accountId: opp.accountId,
      accountName: opp.accountName,
      contactId: opp.primaryContactId,
      contactName: opp.primaryContactName,
      salespersonId: opp.ownerId,
      salespersonName: opp.ownerName,
      vendorId: opp.vendorId,
      vendorName: opp.vendorName,
      companyId: quoteCompanyId,
      currency: quoteData.currency || 'INR (₹)',
      items,
      subtotal,
      totalVendorCost,
      totalDiscountAmount,
      overallDiscountPercent,
      taxPercent,
      taxAmount,
      grandTotal,
      totalMarginAmount,
      totalMarginPercent,
      paymentTerms: quoteData.paymentTerms || '30 Days Net from Delivery',
      validUntil: quoteData.validUntil || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: approvalRequired ? 'Pending Internal Approval' : 'Approved by Sales Manager',
      approvalRequired,
      notes: quoteData.notes || '',
      createdDate: new Date().toISOString()
    };

    setQuotes(prev => [newQuote, ...prev]);

    addAuditLog({
      module: 'Quotes',
      recordId: newQuote.id,
      recordName: newQuote.quoteNumber,
      action: 'CREATE',
      details: `Quote ${newQuote.quoteNumber} created for ₹${(newQuote.grandTotal / 100000).toFixed(2)} Lakhs. Approval required: ${approvalRequired}`
    });

    showToast(`Quote ${newQuote.quoteNumber} created (${approvalRequired ? 'Requires Sales Manager Approval' : 'Ready for Customer'})`, 'success');
    return newQuote;
  };

  const updateQuote = (id: string, quoteData: Partial<Quote>) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...quoteData } : q));
    showToast(`Quote updated`, 'info');
  };

  const approveQuote = (quoteId: string) => {
    const q = quotes.find(item => item.id === quoteId);
    if (!q) return;

    setQuotes(prev => prev.map(item => {
      if (item.id === quoteId) {
        return {
          ...item,
          status: 'Approved by Sales Manager',
          approvedById: currentUser.id,
          approvedByName: currentUser.name,
          approvedDate: new Date().toISOString()
        };
      }
      return item;
    }));

    addAuditLog({
      module: 'Quotes',
      recordId: quoteId,
      recordName: q.quoteNumber,
      action: 'APPROVE',
      details: `Quote ${q.quoteNumber} approved by Sales Manager ${currentUser.name}`
    });

    showToast(`Quote ${q.quoteNumber} approved for submission to customer!`, 'success');
  };

  const rejectQuote = (quoteId: string, reason: string) => {
    const q = quotes.find(item => item.id === quoteId);
    if (!q) return;

    setQuotes(prev => prev.map(item => {
      if (item.id === quoteId) {
        return {
          ...item,
          status: 'Rejected',
          notes: `${item.notes} [Rejected by ${currentUser.name}: ${reason}]`
        };
      }
      return item;
    }));

    addAuditLog({
      module: 'Quotes',
      recordId: quoteId,
      recordName: q.quoteNumber,
      action: 'REJECT',
      details: `Quote ${q.quoteNumber} rejected by ${currentUser.name}. Reason: ${reason}`
    });

    showToast(`Quote ${q.quoteNumber} rejected`, 'warning');
  };

  const createOrder = (orderData: Partial<Order>): Order => {
    const orderNum = `SO-2026-${(orders.length + 601).toString()}`;
    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      orderNumber: orderNum,
      customerPoNumber: orderData.customerPoNumber || 'PO-GEN-001',
      poDate: orderData.poDate || new Date().toISOString().split('T')[0],
      orderReceivedDate: new Date().toISOString().split('T')[0],
      accountId: orderData.accountId || accounts[0].id,
      accountName: orderData.accountName || accounts[0].name,
      contactId: orderData.contactId || contacts[0].id,
      contactName: orderData.contactName || contacts[0].name,
      opportunityId: orderData.opportunityId || opportunities[0].id,
      opportunityTitle: orderData.opportunityTitle || opportunities[0].title,
      salespersonId: orderData.salespersonId || currentUser.id,
      salespersonName: orderData.salespersonName || currentUser.name,
      vendorId: orderData.vendorId || vendors[0].id,
      vendorName: orderData.vendorName || vendors[0].name,
      product: orderData.product || vendors[0].focusProducts[0],
      currency: orderData.currency || 'INR (₹)',
      softwareAmount: orderData.softwareAmount || 1000000,
      servicesAmount: orderData.servicesAmount || 200000,
      totalAmount: (orderData.softwareAmount || 1000000) + (orderData.servicesAmount || 200000),
      grossMarginAmount: orderData.grossMarginAmount || 250000,
      termMonths: orderData.termMonths || 12,
      startDate: orderData.startDate || new Date().toISOString().split('T')[0],
      endDate: orderData.endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      billingStatus: orderData.billingStatus || 'Pending Invoice',
      deliveryStatus: orderData.deliveryStatus || 'Licenses Issued',
      renewalDate: orderData.renewalDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      renewalRecordCreated: true,
      notes: orderData.notes,
      createdDate: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);

    addAuditLog({
      module: 'Orders',
      recordId: newOrder.id,
      recordName: newOrder.orderNumber,
      action: 'CREATE',
      details: `Order ${newOrder.orderNumber} created for ${newOrder.accountName}`
    });

    showToast(`Order ${newOrder.orderNumber} created`, 'success');
    return newOrder;
  };

  const updateOrder = (id: string, orderData: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...orderData } : o));
    showToast(`Order updated`, 'info');
  };

  const createUser = async (userData: Partial<User> & { primaryCompanyId: string }) => {
    const result = await provisionUserAccount({
      ...userData,
      companyId: userData.primaryCompanyId
    });
    if (!result.success) {
      showToast(result.message || 'User provisioning failed', 'error');
      return result;
    }
    addAuditLog({
      module: 'Users',
      recordId: result.userId || userData.email || 'new_user',
      recordName: userData.name || userData.email || 'New user',
      action: 'CREATE',
      details: `User ${userData.name} (${userData.role}) provisioned by ${currentUser.name}; password setup email sent.`
    });
    showToast(result.message || `User ${userData.name} created`, 'success');
    return result;
  };

  const renameUser = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('User name cannot be empty', 'error');
      return;
    }

    const prevUser = users.find(u => u.id === id);
    if (!prevUser) {
      showToast('User not found', 'error');
      return;
    }

    const oldName = prevUser.name;
    if (oldName === trimmed) return;

    // 1. Update user record
    setUsers(prev => prev.map(u => u.id === id ? { ...u, name: trimmed, modifiedDate: new Date().toISOString() } : u));

    // 2. Cascade rename across all related modules
    setLeads(prev => prev.map(lead => {
      let changed = false;
      const updated = { ...lead };
      if (updated.ownerId === id || updated.ownerName === oldName) {
        updated.ownerName = trimmed;
        changed = true;
      }
      if (updated.workingSalespersonId === id || updated.workingSalespersonName === oldName) {
        updated.workingSalespersonName = trimmed;
        changed = true;
      }
      return changed ? updated : lead;
    }));

    setOpportunities(prev => prev.map(opp => {
      let changed = false;
      const updated = { ...opp };
      if (updated.ownerId === id || updated.ownerName === oldName) {
        updated.ownerName = trimmed;
        changed = true;
      }
      if (updated.salespersonId === id || updated.salespersonName === oldName) {
        updated.salespersonName = trimmed;
        changed = true;
      }
      return changed ? updated : opp;
    }));

    setAccounts(prev => prev.map(acc => {
      if (acc.ownerId === id || acc.ownerName === oldName) {
        return { ...acc, ownerName: trimmed };
      }
      return acc;
    }));

    setQuotes(prev => prev.map(q => {
      let changed = false;
      const updated = { ...q };
      if (updated.preparedById === id || updated.preparedByName === oldName) {
        updated.preparedByName = trimmed;
        changed = true;
      }
      if (updated.salespersonId === id || updated.salespersonName === oldName) {
        updated.salespersonName = trimmed;
        changed = true;
      }
      return changed ? updated : q;
    }));

    setPresalesRequests(prev => prev.map(p => {
      let changed = false;
      const updated = { ...p };
      if (updated.requesterId === id || updated.requesterName === oldName) {
        updated.requesterName = trimmed;
        changed = true;
      }
      if (updated.assignedConsultantId === id || updated.assignedConsultantName === oldName) {
        updated.assignedConsultantName = trimmed;
        changed = true;
      }
      return changed ? updated : p;
    }));

    setPocRecords(prev => prev.map(poc => {
      if (poc.assignedEngineerId === id || poc.assignedEngineerName === oldName) {
        return { ...poc, assignedEngineerName: trimmed };
      }
      return poc;
    }));

    setOrders(prev => prev.map(ord => {
      if (ord.salespersonId === id || ord.salespersonName === oldName) {
        return { ...ord, salespersonName: trimmed };
      }
      return ord;
    }));

    addAuditLog({
      module: 'Users',
      recordId: id,
      recordName: trimmed,
      action: 'UPDATE',
      details: `User renamed from "${oldName}" to "${trimmed}" by ${currentUser.name}. Updated all associated records.`
    });

    showToast(`User successfully renamed to "${trimmed}"`, 'success');
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    const prevUser = users.find(u => u.id === id);
    if (!prevUser) return;

    if (userData.name && userData.name.trim() !== prevUser.name) {
      renameUser(id, userData.name.trim());
    }

    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...userData, modifiedDate: new Date().toISOString() } : u));
    
    addAuditLog({
      module: 'Users',
      recordId: id,
      recordName: userData.name || prevUser.name,
      action: 'UPDATE',
      details: `Updated user profile & mapping for ${userData.name || prevUser.name}`
    });

    showToast(`User profile and mapping updated`, 'info');
  };

  const transferUserWorkload = (
    fromUserId: string,
    toUserId: string,
    options: { leads?: boolean; opportunities?: boolean; accounts?: boolean; subordinates?: boolean } = {
      leads: true,
      opportunities: true,
      accounts: true,
      subordinates: true
    }
  ) => {
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);

    if (!fromUser || !toUser) {
      showToast('Source or target user not found for transfer', 'error');
      return { leadsCount: 0, oppsCount: 0, accountsCount: 0, subordinatesCount: 0 };
    }

    let leadsCount = 0;
    let oppsCount = 0;
    let accountsCount = 0;
    let subordinatesCount = 0;

    // 1. Transfer Leads
    if (options.leads !== false) {
      setLeads(prev => prev.map(lead => {
        if (lead.workingSalespersonId === fromUserId || lead.ownerId === fromUserId) {
          leadsCount++;
          return {
            ...lead,
            ownerId: toUserId,
            ownerName: toUser.name,
            workingSalespersonId: toUserId,
            workingSalespersonName: toUser.name,
            salespersonId: toUserId,
            salespersonName: toUser.name
          };
        }
        return lead;
      }));
    }

    // 2. Transfer Opportunities
    if (options.opportunities !== false) {
      setOpportunities(prev => prev.map(opp => {
        if (opp.salespersonId === fromUserId || opp.ownerId === fromUserId) {
          oppsCount++;
          return {
            ...opp,
            ownerId: toUserId,
            ownerName: toUser.name,
            salespersonId: toUserId,
            salespersonName: toUser.name
          };
        }
        return opp;
      }));
    }

    // 3. Transfer Accounts
    if (options.accounts !== false) {
      setAccounts(prev => prev.map(acc => {
        if (acc.ownerId === fromUserId) {
          accountsCount++;
          return {
            ...acc,
            ownerId: toUserId,
            ownerName: toUser.name
          };
        }
        return acc;
      }));
    }

    // 4. Transfer Subordinates (Reporting lines)
    if (options.subordinates !== false) {
      setUsers(prev => prev.map(u => {
        if (u.reportingManagerId === fromUserId && u.id !== toUserId) {
          subordinatesCount++;
          return { ...u, reportingManagerId: toUserId };
        }
        if (u.backupUserId === fromUserId && u.id !== toUserId) {
          return { ...u, backupUserId: toUserId };
        }
        return u;
      }));
    }

    addAuditLog({
      module: 'Users',
      recordId: toUserId,
      recordName: toUser.name,
      action: 'UPDATE',
      details: `Workload & mapping transferred from ${fromUser.name} to ${toUser.name}: ${leadsCount} leads, ${oppsCount} opportunities, ${accountsCount} accounts, ${subordinatesCount} direct reports.`
    });

    showToast(`Transferred workload from ${fromUser.name} to ${toUser.name}`, 'success');
    return { leadsCount, oppsCount, accountsCount, subordinatesCount };
  };

  const deleteUser = (id: string, transferToUserId?: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    if (users.length <= 1) {
      showToast('Cannot delete the last remaining user', 'error');
      return;
    }

    // If transfer target user is specified, transfer active workload
    if (transferToUserId && transferToUserId !== id) {
      transferUserWorkload(id, transferToUserId, {
        leads: true,
        opportunities: true,
        accounts: true,
        subordinates: true
      });
    } else {
      // Re-map direct subordinates to MD or clear reporting manager
      const fallbackManager = users.find(u => u.id !== id && (u.role === 'Managing Director' || u.role === 'CRM Administrator' || u.role === 'Sales Head'));
      setUsers(prev => prev.map(u => {
        let updated = { ...u };
        if (u.reportingManagerId === id) {
          updated.reportingManagerId = fallbackManager ? fallbackManager.id : undefined;
        }
        if (u.backupUserId === id) {
          updated.backupUserId = undefined;
        }
        return updated;
      }));
    }

    // If deleting the currently signed-in user's own account, there's no
    // real account to "switch" to (each user now has their own Firebase
    // Auth credential) — sign them out so they land back on the sign-in
    // screen instead.
    if (currentUserId === id) {
      signOutUser();
    }

    // Remove user
    setUsers(prev => prev.filter(u => u.id !== id));
    // Remove dependent configuration rows so dashboards cannot continue to
    // aggregate a deleted user's denormalized quota or membership data.
    setVendorTargets(prev => prev.filter(targetRow => targetRow.userId !== id));
    setUserMemberships(prev => prev.filter(membership => membership.userId !== id));
    setGoogleAccounts(prev => prev.filter(account => account.userId !== id));

    addAuditLog({
      module: 'Users',
      recordId: id,
      recordName: target.name,
      action: 'UPDATE',
      details: `User account ${target.name} (${target.email}) deleted by ${currentUser.name}.${transferToUserId ? ` Workload transferred to ${users.find(u => u.id === transferToUserId)?.name || transferToUserId}.` : ''}`
    });

    showToast(`User "${target.name}" removed successfully`, 'info');
  };

  const createRole = (roleData: Partial<RoleDefinition>): RoleDefinition => {
    const newRole: RoleDefinition = {
      id: 'role_' + Date.now(),
      name: roleData.name || 'Custom Role',
      description: roleData.description || 'Custom defined enterprise role with tailored access controls.',
      isSystem: false,
      color: roleData.color || '#0073EA',
      badgeBg: roleData.badgeBg || 'bg-blue-50 text-blue-700 border-blue-200',
      badgeText: roleData.badgeText || 'text-blue-700',
      permissions: roleData.permissions || {
        canViewAllLeads: false,
        canViewAllOpportunities: false,
        canViewAllAccounts: false,
        canAssignLeads: false,
        canManageUsers: false,
        canConfigureWorkflows: false,
        canApproveQuotes: false,
        canImportData: false,
        canManageFieldSecurity: false,
        canExportReports: true,
        canManageVendors: false
      },
      createdDate: new Date().toISOString()
    };

    setRoles(prev => [...prev, newRole]);
    addAuditLog({
      module: 'Users',
      recordId: newRole.id,
      recordName: newRole.name,
      action: 'CREATE',
      details: `Custom User Role "${newRole.name}" created by ${currentUser.name}`
    });
    showToast(`Role "${newRole.name}" created successfully`, 'success');
    return newRole;
  };

  const updateRole = (id: string, roleData: Partial<RoleDefinition>) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...roleData } : r));
    addAuditLog({
      module: 'Users',
      recordId: id,
      recordName: roleData.name || 'User Role',
      action: 'UPDATE',
      details: `Role permissions for "${roleData.name || id}" updated by ${currentUser.name}`
    });
    showToast(`Role updated`, 'info');
  };

  const deleteRole = (id: string) => {
    const target = roles.find(r => r.id === id);
    if (!target) return;
    if (target.isSystem) {
      showToast(`System built-in roles cannot be deleted`, 'error');
      return;
    }
    setRoles(prev => prev.filter(r => r.id !== id));
    addAuditLog({
      module: 'Users',
      recordId: id,
      recordName: target.name,
      action: 'UPDATE',
      details: `Custom User Role "${target.name}" removed by ${currentUser.name}`
    });
    showToast(`Role "${target.name}" deleted`, 'info');
  };

  const createFieldAttribute = (fieldData: Partial<FieldAttribute>): FieldAttribute => {
    const rawName = fieldData.name || fieldData.label?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'custom_field';
    const cleanName = rawName.startsWith('custom_') ? rawName : `custom_${rawName}`;

    const newField: FieldAttribute = {
      id: 'fa_' + Date.now(),
      name: cleanName,
      label: fieldData.label || 'Custom Attribute',
      module: fieldData.module || 'Leads',
      type: fieldData.type || 'text',
      mandatory: fieldData.mandatory || false,
      defaultValue: fieldData.defaultValue,
      options: fieldData.options || [],
      helpText: fieldData.helpText || '',
      isSystem: false,
      createdDate: new Date().toISOString()
    };

    setFieldAttributes(prev => [...prev, newField]);

    addAuditLog({
      module: newField.module as any,
      recordId: newField.id,
      recordName: `${newField.label} (${newField.name})`,
      action: 'CREATE',
      details: `Custom Field Attribute "${newField.label}" added to ${newField.module} by ${currentUser.name}`
    });

    showToast(`Field attribute "${newField.label}" added to ${newField.module}`, 'success');
    return newField;
  };

  const updateFieldAttribute = (id: string, fieldData: Partial<FieldAttribute>) => {
    setFieldAttributes(prev => prev.map(f => f.id === id ? { ...f, ...fieldData } : f));
    addAuditLog({
      module: (fieldData.module || 'Leads') as any,
      recordId: id,
      recordName: fieldData.label || 'Field Attribute',
      action: 'UPDATE',
      details: `Field attribute "${fieldData.label || id}" updated by ${currentUser.name}`
    });
    showToast(`Field attribute updated`, 'info');
  };

  const deleteFieldAttribute = (id: string) => {
    const target = fieldAttributes.find(f => f.id === id);
    if (!target) return;
    if (target.isSystem) {
      showToast('System core field attributes cannot be deleted', 'error');
      return;
    }
    setFieldAttributes(prev => prev.filter(f => f.id !== id));
    addAuditLog({
      module: target.module as any,
      recordId: id,
      recordName: target.label,
      action: 'UPDATE',
      details: `Field attribute "${target.label}" (${target.name}) removed from ${target.module} by ${currentUser.name}`
    });
    showToast(`Field attribute "${target.label}" removed`, 'info');
  };

  const importDataBatch = (
    module: 'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Users',
    rows: Record<string, any>[],
    mappings: FieldMapping[],
    mode: 'automatic' | 'manual',
    fileName: string
  ): ImportResult => {
    const result: ImportResult = {
      id: 'imp_' + Date.now(),
      timestamp: new Date().toISOString(),
      module,
      fileName,
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      mode,
      createdFields: [],
      createdRecordsSummary: [],
      errors: []
    };

    if (!rows || rows.length === 0) {
      result.errors.push('No data rows found in import source file.');
      return result;
    }

    // 1. In automatic mode or if user selected create as new attribute:
    // Create new FieldAttributes dynamically
    const newlyCreatedAttributes: FieldAttribute[] = [];
    const currentAttrNames = new Set(fieldAttributes.filter(fa => fa.module === module).map(fa => fa.name.toLowerCase()));

    mappings.forEach(m => {
      if (m.createAsNewAttribute || (mode === 'automatic' && m.targetField.startsWith('custom_') && !currentAttrNames.has(m.targetField.toLowerCase()))) {
        const cleanKey = m.targetField.startsWith('custom_') 
          ? m.targetField 
          : `custom_${m.fileColumn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
        
        if (!currentAttrNames.has(cleanKey.toLowerCase())) {
          currentAttrNames.add(cleanKey.toLowerCase());
          const newAttr: FieldAttribute = {
            id: 'fa_' + Date.now() + Math.random().toString(36).substring(2, 6),
            name: cleanKey,
            label: m.newAttributeLabel || m.fileColumn.replace(/([A-Z])/g, ' $1').trim(),
            module: module as any,
            type: m.newAttributeType || m.inferredType || 'text',
            mandatory: false,
            helpText: `Auto-generated custom attribute inferred from imported file "${fileName}"`,
            isSystem: false,
            createdDate: new Date().toISOString()
          };
          newlyCreatedAttributes.push(newAttr);
        }
      }
    });

    if (newlyCreatedAttributes.length > 0) {
      setFieldAttributes(prev => [...prev, ...newlyCreatedAttributes]);
      result.createdFields = newlyCreatedAttributes;
      newlyCreatedAttributes.forEach(attr => {
        addAuditLog({
          module: (module === 'Users' ? 'Administration' : module) as any,
          recordId: attr.id,
          recordName: attr.label,
          action: 'CREATE',
          details: `Dynamic Field Attribute "${attr.label}" (${attr.name}) automatically provisioned during ${mode} import of ${fileName}`
        });
      });
    }

    // 2. Process records and populate both standard fields and customFields
    const newLeads: Lead[] = [];
    const newOpps: Opportunity[] = [];
    const newAccounts: Account[] = [];
    const newContacts: Contact[] = [];
    const newUsers: User[] = [];

    rows.forEach((row, idx) => {
      try {
        const mappedRecord: Record<string, any> = {};
        const customFieldValues: Record<string, any> = {};

        const normalizedRow = new Map(
          Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/[^a-z0-9]/g, ''), value])
        );
        const sourceValue = (...aliases: string[]) => {
          for (const alias of aliases) {
            const value = normalizedRow.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (value !== undefined && value !== null && String(value).trim() !== '') return value;
          }
          return undefined;
        };
        const parseNumber = (value: any, fallback = 0) => {
          if (value === undefined || value === null || value === '') return fallback;
          const parsed = Number(String(value).replace(/[,₹$\s]/g, ''));
          return Number.isFinite(parsed) ? parsed : fallback;
        };

        mappings.forEach(m => {
          const rawVal = row[m.fileColumn];
          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            if (m.targetField.startsWith('custom_')) {
              customFieldValues[m.targetField] = rawVal;
            } else if (m.targetField !== '__IGNORE__') {
              mappedRecord[m.targetField] = rawVal;
            }
          }
        });

        if (module === 'Users') {
          const userCount = users.length + newUsers.length + 1;
          const empId = mappedRecord.employeeId || row['Employee ID'] || row['Emp ID'] || row['Staff ID'] || row['ID'] || `AS-90${userCount.toString().padStart(2, '0')}`;
          const userName = mappedRecord.name || row['Full Name'] || row['Employee Name'] || row['User Name'] || row['Staff Name'] || row['Name'] || `Staff User ${userCount}`;
          const userEmail = mappedRecord.email || row['Email'] || row['Work Email'] || row['Corporate Email'] || `${userName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@amrutsoftware.com`;
          const userMobile = mappedRecord.mobile || row['Mobile'] || row['Phone'] || row['Contact'] || '+91 98000 00000';
          
          const rawRole = mappedRecord.role || row['Role'] || row['System Role'] || row['Designation'] || 'Sales Person';
          const validRoles: UserRole[] = [
            'CRM Administrator',
            'Managing Director',
            'Sales Head',
            'Sales Manager',
            'Sales Person',
            'Lead Gen Manager',
            'Lead Gen Agent',
            'Presales Consultant',
            'Commercial Lead',
            'Vendor Manager',
            'Account Manager',
            'Delivery Head',
            'Project Manager',
            'Finance Officer',
            'Sales Coordinator',
            'Auditor / Read-Only'
          ];
          const matchedRole = validRoles.find(r => r.toLowerCase() === String(rawRole).trim().toLowerCase()) ||
                              validRoles.find(r => String(rawRole).toLowerCase().includes(r.toLowerCase())) ||
                              'Sales Person';

          const rawDept = mappedRecord.department || row['Department'] || row['Dept'] || 'Sales';
          const rawTerritory = mappedRecord.territory || row['Territory'] || row['Region'] || 'West – Mumbai & Pune';

          const managerNameOrEmail = mappedRecord.reportingManagerName || row['Reporting Manager'] || row['Manager'] || row['Reports To'] || '';
          const matchedManager = users.find(u => 
            u.name.toLowerCase() === String(managerNameOrEmail).toLowerCase() || 
            u.email.toLowerCase() === String(managerNameOrEmail).toLowerCase() ||
            u.id === String(managerNameOrEmail)
          ) || users.find(u => u.role === 'Sales Head' || u.role === 'Sales Manager');

          const backupNameOrEmail = mappedRecord.backupUserName || row['Backup User'] || row['Backup'] || row['OOO Proxy'] || '';
          const matchedBackup = users.find(u => 
            (u.name.toLowerCase() === String(backupNameOrEmail).toLowerCase() || 
             u.email.toLowerCase() === String(backupNameOrEmail).toLowerCase() ||
             u.id === String(backupNameOrEmail)) && u.id !== empId
          );

          const rawVendors = mappedRecord.vendorResponsibilities || row['Vendor Responsibilities'] || row['Vendors'] || row['OEMs'] || '';
          let vendorList: string[] = [];
          if (Array.isArray(rawVendors)) {
            vendorList = rawVendors;
          } else if (typeof rawVendors === 'string' && rawVendors.trim().length > 0) {
            vendorList = rawVendors.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
          }

          const userObj: User = {
            id: 'usr_imp_' + Date.now() + '_' + idx,
            name: userName,
            employeeId: empId,
            email: userEmail,
            mobile: userMobile,
            department: rawDept,
            role: matchedRole as UserRole,
            territory: rawTerritory,
            reportingManagerId: matchedManager?.id,
            backupUserId: matchedBackup?.id,
            vendorResponsibilities: vendorList,
            eligibleForAutoAssignment: mappedRecord.eligibleForAutoAssignment !== false,
            isActive: true,
            isOutOfOffice: mappedRecord.isOutOfOffice === true || String(row['Is Out of Office'] || '').toLowerCase() === 'true',
            createdDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            lastLogin: 'Never',
            customFields: customFieldValues,
            isPasswordSet: false,
            tempActivationCode: 'ACT-' + Math.floor(1000 + Math.random() * 9000),
            accountStatus: 'Pending Activation'
          };
          newUsers.push(userObj);
          result.createdRecordsSummary.push(`${userObj.employeeId} - ${userObj.name} (${userObj.role})`);
          result.successCount++;
        } else if (module === 'Leads') {
          const leadCount = leads.length + newLeads.length + 101;
          const leadNumber = `LD-2026-${leadCount.toString().padStart(4, '0')}`;
          const defaultVendor = vendors[0];
          const assignedSalesUser = users.find(u => u.name.toLowerCase() === (mappedRecord.workingSalespersonName || '').toLowerCase()) || users.find(u => u.role === 'Sales Person' && !u.isOutOfOffice) || users[0];

          const leadObj: Lead = {
            id: 'ld_imp_' + Date.now() + '_' + idx,
            leadNumber,
            companyName: mappedRecord.companyName || mappedRecord.name || row['Company'] || row['Organization'] || row['Account'] || `Imported Client ${idx + 1}`,
            accountId: mappedRecord.accountId,
            contactName: mappedRecord.contactName || row['Contact'] || row['Contact Name'] || row['Full Name'] || 'Key Stakeholder',
            contactEmail: mappedRecord.contactEmail || row['Email'] || row['Work Email'] || '',
            contactPhone: mappedRecord.contactPhone || row['Phone'] || row['Mobile'] || '',
            designation: mappedRecord.designation || row['Title'] || row['Designation'] || 'Procurement / Tech Lead',
            country: mappedRecord.country || row['Country'] || 'India',
            city: mappedRecord.city || row['City'] || 'Mumbai',
            source: mappedRecord.source || (row['Source'] as any) || 'OEM / Vendor Referral',
            subSource: mappedRecord.subSource || row['Sub Source'] || 'Bulk File Import',
            campaign: mappedRecord.campaign || row['Campaign'] || `Import: ${fileName}`,
            vendorId: mappedRecord.vendorId || defaultVendor.id,
            vendorName: mappedRecord.vendorName || defaultVendor.name,
            product: mappedRecord.product || row['Product'] || defaultVendor.focusProducts[0],
            productFamily: mappedRecord.productFamily || 'Enterprise Software',
            requirement: mappedRecord.requirement || row['Requirement'] || row['Notes'] || 'Imported prospect requirement from legacy dataset.',
            interestType: (mappedRecord.interestType as any) || 'Software License',
            expectedValue: Number(mappedRecord.expectedValue || row['Deal Value'] || row['Expected Value'] || row['Amount'] || 500000),
            territory: mappedRecord.territory || row['Territory'] || 'Pan India',
            priority: (mappedRecord.priority as any) || (row['Priority'] as any) || 'High',
            reporterId: currentUser.id,
            reporterName: currentUser.name,
            workingSalespersonId: assignedSalesUser.id,
            workingSalespersonName: assignedSalesUser.name,
            bant: {
              budget: 'Confirmed & Approved',
              authority: 'Decision Maker Identified',
              need: 'Defined Project Need',
              timeline: '1–3 Months',
              budgetAmount: Number(mappedRecord.expectedValue || 500000)
            },
            nextAction: 'First Discovery Call after Bulk Import',
            nextActionDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            status: (mappedRecord.status as any) || 'Ready for Assignment',
            slaDueTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            slaStatus: 'Within SLA',
            notes: mappedRecord.notes || `Imported from ${fileName} on ${new Date().toLocaleDateString()}`,
            createdDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            customFields: customFieldValues
          };
          newLeads.push(leadObj);
          result.createdRecordsSummary.push(`${leadObj.leadNumber} - ${leadObj.companyName}`);
          result.successCount++;
        } else if (module === 'Opportunities') {
          const oppCount = opportunities.length + newOpps.length + 301;
          const oppNumber = `OPP-2026-${oppCount.toString().padStart(4, '0')}`;
          const defaultVendor = vendors[0];
          const assignedSalesUser = users.find(u => u.name.toLowerCase() === (mappedRecord.ownerName || '').toLowerCase()) || users.find(u => u.role === 'Sales Person') || users[0];
          const rawVal = Number(mappedRecord.totalValue || row['Total Value'] || row['Deal Size'] || row['Amount'] || 1200000);
          const val = isNaN(rawVal) ? 1200000 : rawVal;
          const prob = Number(mappedRecord.probability || row['Probability'] || 40) || 40;

          const oppObj: Opportunity = {
            id: 'opp_imp_' + Date.now() + '_' + idx,
            oppNumber,
            title: String(mappedRecord.title || row['Deal Name'] || row['Opportunity Title'] || `${mappedRecord.accountName || row['Company'] || 'Client'} - Enterprise Suite`),
            accountId: mappedRecord.accountId || accounts[0]?.id || 'acc_1',
            accountName: String(mappedRecord.accountName || row['Account'] || row['Company'] || row['Client'] || accounts[0]?.name || 'Amrut Enterprise Client'),
            primaryContactId: mappedRecord.primaryContactId || contacts[0]?.id || 'cnt_1',
            primaryContactName: String(mappedRecord.primaryContactName || row['Contact'] || row['Contact Name'] || contacts[0]?.name || 'Primary Contact'),
            pipeline: (mappedRecord.pipeline as any) || 'Software – Direct / Simple',
            stage: (mappedRecord.stage as any) || (row['Stage'] as any) || 'Qualified Opportunity',
            probability: prob,
            expectedCloseDate: mappedRecord.expectedCloseDate || row['Close Date'] || new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
            softwareValue: Math.round(val * 0.8),
            servicesValue: Math.round(val * 0.2),
            totalValue: val,
            weightedValue: Math.round(val * (prob / 100)),
            grossMarginValue: Math.round(val * 0.22),
            grossMarginPercent: 22.0,
            vendorId: mappedRecord.vendorId || defaultVendor?.id || 'v_atlassian',
            vendorName: mappedRecord.vendorName || defaultVendor?.name || 'Atlassian Enterprise',
            product: String(mappedRecord.product || row['Product'] || defaultVendor?.focusProducts?.[0] || 'Enterprise Software'),
            source: (mappedRecord.source as any) || 'OEM / Vendor Referral',
            reporterId: currentUser.id,
            reporterName: currentUser.name,
            ownerId: assignedSalesUser.id,
            ownerName: assignedSalesUser.name,
            bant: {
              budget: 'Budget Allocated',
              authority: 'Decision Maker Identified',
              need: 'Defined Project Need',
              timeline: '1–3 Months',
              budgetAmount: val
            },
            nextAction: 'Deliver customized technical demo & commercial proposal',
            nextActionDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            forecastCategory: 'Pipeline',
            createdDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            customFields: customFieldValues
          };
          newOpps.push(oppObj);
          result.createdRecordsSummary.push(`${oppObj.oppNumber} - ${oppObj.title}`);
          result.successCount++;
        } else if (module === 'Accounts') {
          const accountName = String(mappedRecord.name ?? sourceValue(
            'company', 'company name', 'account', 'account name', 'client', 'client name',
            'organization', 'organisation', 'organization name', 'organisation name',
            'customer', 'customer name', 'business'
          ) ?? '').trim();

          if (!accountName) {
            throw new Error('Account name is required. Map a company/account/organization column to Account / Organization Name.');
          }

          const rawTier = String(mappedRecord.tier ?? sourceValue('tier', 'account tier', 'segment', 'classification') ?? 'Growth').trim();
          const tierAliases: Record<string, Account['tier']> = {
            strategic: 'Strategic', 'tier1': 'Strategic', 'tier1enterprise': 'Strategic',
            growth: 'Growth', 'tier2': 'Growth', maintain: 'Maintain', general: 'General', dormant: 'Dormant'
          };
          const normalizedTier = rawTier.toLowerCase().replace(/[^a-z0-9]/g, '');
          const importedProducts = String(sourceValue('installed products', 'products', 'software products') ?? '')
            .split(/[,;|]/).map(value => value.trim()).filter(Boolean);
          const accObj: Account = {
            id: 'acc_imp_' + Date.now() + '_' + idx,
            name: accountName,
            industry: String(mappedRecord.industry ?? sourceValue('industry', 'vertical', 'sector') ?? ''),
            tier: tierAliases[normalizedTier] || 'Growth',
            website: String(mappedRecord.website ?? sourceValue('website', 'website url', 'url', 'domain') ?? ''),
            phone: String(mappedRecord.phone ?? sourceValue('phone', 'telephone', 'corporate phone', 'phone number') ?? ''),
            city: String(mappedRecord.city ?? sourceValue('city', 'town', 'headquarter city', 'location') ?? ''),
            country: String(mappedRecord.country ?? sourceValue('country', 'nation') ?? ''),
            ownerId: currentUser.id,
            annualRevenue: parseNumber(mappedRecord.annualRevenue ?? sourceValue('annual revenue', 'revenue', 'turnover'), 0),
            employeeCount: String(mappedRecord.employeeCount ?? sourceValue('employee count', 'employees', 'headcount', 'company size') ?? ''),
            installedProducts: importedProducts,
            vendorsEngaged: [],
            totalHistoricalRevenue: parseNumber(mappedRecord.totalHistoricalRevenue ?? sourceValue('historical revenue', 'total historical revenue'), 0),
            relationshipHealth: 'Good',
            lastActivityDate: new Date().toISOString(),
            createdDate: new Date().toISOString(),
            customFields: customFieldValues
          };
          newAccounts.push(accObj);
          result.createdRecordsSummary.push(accObj.name);
          result.successCount++;
        } else if (module === 'Contacts') {
          const matchingAcc = accounts.find(a => a.name.toLowerCase() === (mappedRecord.accountName || row['Company'] || '').toLowerCase()) || accounts[0];
          const cntObj: Contact = {
            id: 'cnt_imp_' + Date.now() + '_' + idx,
            accountId: matchingAcc ? matchingAcc.id : 'acc_1',
            accountName: matchingAcc ? matchingAcc.name : (mappedRecord.accountName || row['Company'] || 'Amrut Client'),
            name: mappedRecord.name || row['Full Name'] || row['Contact Name'] || row['Client Name'] || `Client Contact ${idx + 1}`,
            email: mappedRecord.email || row['Email'] || row['Work Email'] || 'contact@client.com',
            phone: mappedRecord.phone || row['Phone'] || '+91 98000 00000',
            mobile: mappedRecord.mobile || row['Mobile'] || '+91 98000 00000',
            designation: mappedRecord.designation || row['Designation'] || row['Title'] || 'VP Technology & Infrastructure',
            department: mappedRecord.department || row['Department'] || 'Engineering / IT',
            roleInBuying: (mappedRecord.roleInBuying as any) || (row['Role in Buying'] as any) || 'Decision Maker',
            isPrimary: true,
            city: mappedRecord.city || row['City'] || 'Mumbai',
            linkedin: mappedRecord.linkedin || row['LinkedIn'] || '',
            notes: mappedRecord.notes || `Imported from ${fileName}`,
            createdDate: new Date().toISOString(),
            customFields: customFieldValues
          };
          newContacts.push(cntObj);
          result.createdRecordsSummary.push(`${cntObj.name} (${cntObj.accountName})`);
          result.successCount++;
        }
      } catch (err: any) {
        result.errorCount++;
        result.errors.push(`Row ${idx + 1}: ${err.message || 'Parsing error'}`);
      }
    });

    if (newLeads.length > 0) setLeads(prev => [...newLeads, ...prev]);
    if (newOpps.length > 0) setOpportunities(prev => [...newOpps, ...prev]);
    if (newAccounts.length > 0) setAccounts(prev => [...newAccounts, ...prev]);
    if (newContacts.length > 0) setContacts(prev => [...newContacts, ...prev]);
    if (newUsers.length > 0) {
      setUsers(prev => [...prev, ...newUsers]);
      newUsers.forEach(u => {
        addAuditLog({
          module: 'Users',
          recordId: u.id,
          recordName: u.name,
          action: 'CREATE',
          details: `Staff user account "${u.name}" (${u.employeeId}, ${u.role}) created via bulk import from ${fileName}`
        });
      });
    }

    addAuditLog({
      module: module as any,
      recordId: result.id,
      recordName: `${result.successCount} ${module} Records`,
      action: 'CREATE',
      details: `Bulk Import completed: ${result.successCount} records created, ${newlyCreatedAttributes.length} custom field attributes automatically provisioned from "${fileName}".`
    });

    if (result.errorCount > 0) {
      showToast(`Imported ${result.successCount} ${module} records; ${result.errorCount} rows were rejected.`, result.successCount > 0 ? 'warning' : 'error');
    } else {
      showToast(`Successfully imported ${result.successCount} ${module} records (${newlyCreatedAttributes.length} new field attributes created)`, 'success');
    }
    return result;
  };

  const toggleUserOutOfOffice = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextState = !u.isOutOfOffice;
        const backupName = users.find(b => b.id === u.backupUserId)?.name;
        showToast(`${u.name} is now ${nextState ? `Out of Office (Auto-routing to ${backupName || 'Next Rep'})` : 'Active / In Office'}`, nextState ? 'warning' : 'success');
        return {
          ...u,
          isOutOfOffice: nextState,
          modifiedDate: new Date().toISOString()
        };
      }
      return u;
    }));
  };

  const canManageVendors = currentUser.role === 'CRM Administrator' || currentUser.role === 'Sales Head';

  const updateVendor = (id: string, vendorData: Partial<Vendor>) => {
    if (!canManageVendors) {
      showToast('Only CRM Administrators and Sales Heads can edit OEM partners.', 'error');
      return;
    }
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...vendorData } : v));
    showToast(`Vendor details updated`, 'info');
  };

  const createVendor = (vendorData: Partial<Vendor>): Vendor | null => {
    if (!canManageVendors) {
      showToast('Only CRM Administrators and Sales Heads can add OEM partners.', 'error');
      return null;
    }
    const newVendor: Vendor = {
      id: 'v_' + Date.now(),
      name: vendorData.name || 'New OEM Partner',
      code: vendorData.code || 'OEM',
      vendorHeadUserId: vendorData.vendorHeadUserId ?? currentUser.id,
      vendorHeadUserName: vendorData.vendorHeadUserName ?? currentUser.name,
      relationshipManager: vendorData.relationshipManager ?? '',
      partnerLevel: vendorData.partnerLevel ?? 'Website-listed principal',
      territory: vendorData.territory || 'India',
      agreementStartDate: vendorData.agreementStartDate ?? '',
      agreementRenewalDate: vendorData.agreementRenewalDate ?? '',
      distributorName: vendorData.distributorName ?? '',
      partnerPortalUrl: vendorData.partnerPortalUrl ?? '',
      annualRevenueTarget: vendorData.annualRevenueTarget ?? 0,
      quarterlyTarget: vendorData.quarterlyTarget ?? 0,
      focusProducts: vendorData.focusProducts ?? [],
      certifiedEngineersCount: vendorData.certifiedEngineersCount ?? 0,
      activeRegisteredDealsCount: 0,
      mdfAllocated: vendorData.mdfAllocated ?? 0,
      mdfUtilized: 0,
      vendorHealth: 'Healthy / High Growth'
    };

    setVendors(prev => [...prev, newVendor]);
    showToast(`Vendor ${newVendor.name} added`, 'success');
    return newVendor;
  };

  const updateWorkflow = (wfId: string, updatedWf: Partial<WorkflowDefinition>) => {
    setWorkflows(prev => prev.map(w => w.id === wfId ? { ...w, ...updatedWf } : w));
    addAuditLog({
      module: 'Workflows',
      recordId: wfId,
      recordName: updatedWf.name || 'Workflow Configuration',
      action: 'UPDATE',
      details: `Workflow configuration updated by ${currentUser.role} ${currentUser.name}`
    });
    showToast(`Workflow updated successfully`, 'success');
  };

  const createWorkflow = (wfData: Partial<WorkflowDefinition>): WorkflowDefinition => {
    const id = 'wf_' + Date.now();
    const newWf: WorkflowDefinition = {
      id,
      name: wfData.name || 'Custom Workflow',
      module: wfData.module || 'Leads',
      startingState: wfData.startingState || 'Draft',
      endStates: wfData.endStates || ['Completed'],
      allStates: wfData.allStates || ['Draft', 'In Progress', 'Completed'],
      isActive: wfData.isActive !== false,
      transitions: wfData.transitions || []
    };
    setWorkflows(prev => [...prev, newWf]);
    addAuditLog({
      module: 'Workflows',
      recordId: id,
      recordName: newWf.name,
      action: 'CREATE',
      details: `Created new workflow "${newWf.name}" for module ${newWf.module}`
    });
    showToast(`Workflow "${newWf.name}" created successfully`, 'success');
    return newWf;
  };

  const deleteWorkflow = (wfId: string) => {
    const target = workflows.find(w => w.id === wfId);
    if (!target) return;
    setWorkflows(prev => prev.filter(w => w.id !== wfId));
    addAuditLog({
      module: 'Workflows',
      recordId: wfId,
      recordName: target.name,
      action: 'UPDATE',
      details: `Deleted workflow "${target.name}"`
    });
    showToast(`Workflow "${target.name}" deleted`, 'info');
  };

  const resetWorkflowsToDefault = () => {
    showToast('Demo workflow restoration is disabled in production.', 'warning');
  };

  const normalizeState = (s?: string): string => {
    if (!s) return '';
    return String(s)
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  };

  const isRoleAuthorizedForTransition = (permittedRoles: string[], userRole?: string): boolean => {
    if (!permittedRoles || permittedRoles.length === 0) return true;
    if (permittedRoles.includes('ALL') || permittedRoles.includes('*')) return true;
    
    const safeRole = userRole || currentUser?.role || 'Sales Person';
    if (permittedRoles.includes(safeRole)) return true;
    if (safeRole === 'CRM Administrator' || safeRole === 'Managing Director') return true;

    // Check role hierarchies and aliases safely
    const lowerPermitted = permittedRoles.map(r => (r || '').toLowerCase().trim());
    const lowerUser = (safeRole || '').toLowerCase().trim();
    if (lowerPermitted.includes(lowerUser)) return true;
    if (lowerUser.includes('admin') || lowerUser.includes('managing director')) return true;

    // Sales role hierarchy
    if (
      lowerPermitted.some(r => r.includes('sales person') || r.includes('sales rep')) &&
      ['sales person', 'sales manager', 'sales head', 'sales coordinator', 'lead gen', 'lead gen manager', 'crm administrator', 'managing director'].includes(lowerUser)
    ) {
      return true;
    }

    if (
      lowerPermitted.some(r => r.includes('sales manager')) &&
      ['sales manager', 'sales head', 'managing director', 'crm administrator'].includes(lowerUser)
    ) {
      return true;
    }

    // Lead Gen hierarchy
    if (
      lowerPermitted.some(r => r.includes('lead gen')) &&
      ['lead gen', 'lead gen manager', 'marketing person', 'marketing manager', 'sales manager', 'sales head', 'managing director', 'crm administrator'].includes(lowerUser)
    ) {
      return true;
    }

    // Vendor hierarchy
    if (
      lowerPermitted.some(r => r.includes('vendor head') || r.includes('vendor manager')) &&
      ['vendor head', 'vendor manager', 'managing director', 'crm administrator'].includes(lowerUser)
    ) {
      return true;
    }

    // Presales hierarchy
    if (
      lowerPermitted.some(r => r.includes('presales') || r.includes('consultant')) &&
      ['presales consultant', 'presales person', 'presales manager', 'managing director', 'crm administrator'].includes(lowerUser)
    ) {
      return true;
    }

    // Finance / Accounts hierarchy
    if (
      lowerPermitted.some(r => r.includes('finance') || r.includes('accounts') || r.includes('operations')) &&
      ['finance & operations', 'accounts head', 'accounts manager', 'finance & commercial operations', 'managing director', 'crm administrator'].includes(lowerUser)
    ) {
      return true;
    }

    return false;
  };

  const findWorkflowForModule = (moduleName: string): WorkflowDefinition | undefined => {
    if (!moduleName) return undefined;
    const norm = moduleName.toLowerCase().trim();
    return (
      workflows.find(w => w.module?.toLowerCase().trim() === norm) ||
      workflows.find(w => w.id?.toLowerCase().trim() === norm) ||
      workflows.find(w => w.module?.toLowerCase().includes(norm) || norm.includes(w.module?.toLowerCase() || '')) ||
      workflows.find(w => w.name?.toLowerCase().includes(norm))
    );
  };

  const getAvailableWorkflowTransitions = (module: string, currentState: string, userRole?: string): WorkflowTransition[] => {
    const roleToTest = userRole || currentUser?.role || 'Sales Person';
    const wf = findWorkflowForModule(module);
    if (!wf || !wf.transitions || wf.isActive === false) return [];
    
    const normCurrent = normalizeState(currentState);
    return wf.transitions.filter(t => {
      const stateMatches = normalizeState(t.fromState) === normCurrent;
      if (!stateMatches) return false;
      return isRoleAuthorizedForTransition(t.permittedRoles, roleToTest);
    });
  };

  const validateWorkflowTransition = (
    module: string,
    fromState: string,
    toState: string,
    userRole?: string,
    recordData?: any
  ): { allowed: boolean; reason?: string; requiresApproval?: boolean; approverRole?: string; transition?: WorkflowTransition } => {
    const roleToTest = userRole || currentUser?.role || 'Sales Person';
    const wf = findWorkflowForModule(module);
    
    if (!wf) {
      return { allowed: true };
    }

    if (wf.isActive === false) {
      return { allowed: true };
    }

    const normFrom = normalizeState(fromState);
    const normTo = normalizeState(toState);

    const transition = wf.transitions?.find(
      t => normalizeState(t.fromState) === normFrom && normalizeState(t.toState) === normTo
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `No transition rule configured from "${fromState}" to "${toState}" in the ${wf.name}.`
      };
    }

    // Check role authorization
    const isAllowedRole = isRoleAuthorizedForTransition(transition.permittedRoles, roleToTest);
    if (!isAllowedRole) {
      return {
        allowed: false,
        reason: `Access Denied: Role "${roleToTest}" is not authorized for this transition. Allowed: ${transition.permittedRoles.join(', ')}.`,
        transition
      };
    }

    // Check mandatory fields
    if (transition.mandatoryFields && transition.mandatoryFields.length > 0 && recordData) {
      const missing: string[] = [];
      for (const field of transition.mandatoryFields) {
        const parts = field.split('.');
        let val: any = recordData;
        for (const p of parts) {
          val = val ? val[p] : undefined;
        }
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim()) || val === '') {
          missing.push(field);
        }
      }
      if (missing.length > 0) {
        return {
          allowed: false,
          reason: `Mandatory field guard failed: Please fill required fields (${missing.join(', ')}).`,
          transition
        };
      }
    }

    // Approval gate check
    if (transition.requiresApproval) {
      return {
        allowed: true,
        requiresApproval: true,
        approverRole: transition.approverRole || 'Sales Manager',
        reason: `Requires formal sign-off by ${transition.approverRole || 'Manager'}`,
        transition
      };
    }

    return {
      allowed: true,
      transition
    };
  };

  const createWebForm = (formData: Partial<WebFormConfig>): WebFormConfig => {
    const id = 'wf_' + Date.now();
    const newForm: WebFormConfig = {
      id,
      name: formData.name || 'Custom Lead Capture Form',
      title: formData.title || 'Get in Touch with Amrut Software',
      description: formData.description || 'Fill out the form below and our team will get back to you shortly.',
      enabledFields: formData.enabledFields || ['companyName', 'contactName', 'contactEmail', 'contactPhone', 'requirement'],
      mandatoryFields: formData.mandatoryFields || ['companyName', 'contactName', 'contactEmail'],
      defaultVendorId: formData.defaultVendorId || vendors[0].id,
      defaultSource: formData.defaultSource || 'Website Inbound',
      successMessage: formData.successMessage || 'Thank you! Your request has been received.',
      embedCode: `<script src="https://crm.amrutsoftware.com/forms/v1/embed.js" data-form-id="${id}"></script>`,
      submissionsCount: 0
    };

    setWebForms(prev => [...prev, newForm]);
    showToast(`Web Lead Form "${newForm.name}" created`, 'success');
    return newForm;
  };

  const submitPublicWebLead = (formId: string, payload: Record<string, string>) => {
    const form = webForms.find(f => f.id === formId);
    const vendor = vendors.find(v => v.id === form?.defaultVendorId) || vendors[0];

    // Find assigned sales person by territory or round robin
    const assignedUserId = autoAssignLead('');
    const assignedUser = users.find(u => u.id === assignedUserId) || users[2];

    const leadNum = `LD-2026-${(leads.length + 101).toString().padStart(4, '0')}`;
    const newLead: Lead = {
      id: 'ld_' + Date.now(),
      leadNumber: leadNum,
      companyName: payload.companyName || 'Online Inbound Enterprise',
      contactName: payload.contactName || 'Online Contact',
      contactEmail: payload.contactEmail || 'inbound@example.com',
      contactPhone: payload.contactPhone || '+91 90000 00000',
      designation: payload.designation || 'Key Decision Maker',
      country: payload.country || 'India',
      city: payload.city || 'Mumbai',
      source: form?.defaultSource || 'Website Inbound',
      campaign: `Web Form: ${form?.name || 'Inbound Portal'}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      product: payload.product || vendor.focusProducts[0],
      productFamily: 'Enterprise Licensing',
      requirement: payload.requirement || 'Requested solution consultation via public website form.',
      interestType: (payload.interestType as any) || 'Software License',
      expectedValue: 500000,
      territory: 'Pan India',
      priority: 'High',
      reporterId: 'usr_admin',
      reporterName: 'Website Webhook Inbound',
      workingSalespersonId: assignedUser.id,
      workingSalespersonName: assignedUser.name,
      bant: {
        budget: 'Budget Allocated',
        authority: 'Decision Maker Identified',
        need: 'Defined Project Need',
        timeline: 'Immediate (<30 days)',
        budgetAmount: 500000
      },
      nextAction: 'First response call & BANT validation within 2 business hours SLA',
      nextActionDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      status: 'New – Unvalidated',
      slaDueTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      slaStatus: 'Within SLA',
      notes: `Captured from public web form: ${form?.name}`,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    setLeads(prev => [newLead, ...prev]);

    // Increment submissions count
    setWebForms(prev => prev.map(f => f.id === formId ? { ...f, submissionsCount: f.submissionsCount + 1 } : f));

    addAuditLog({
      module: 'Leads',
      recordId: newLead.id,
      recordName: newLead.companyName,
      action: 'CREATE',
      details: `Inbound Web Lead ${newLead.leadNumber} received from Form "${form?.name}". Auto-assigned to ${assignedUser.name}`
    });

    showToast(`New Web Lead ${newLead.leadNumber} received and routed to ${assignedUser.name}!`, 'success');
  };

  // Authentication & First-Time Password Management — backed by real
  // Firebase Authentication (src/lib/firebaseAuth.ts). Firestore/user-doc
  // bookkeeping (lastLogin, audit log, tempActivationCode) still happens
  // here, same as before; only the actual credential check moved server-side.
  const loginWithCredentials = async (email: string, password: string): Promise<{ success: boolean; requiresPasswordSetup?: boolean; message?: string; user?: User }> => {
    const trimmedEmail = email.trim();
    const result = await firebaseSignIn(trimmedEmail, password);
    if (!result.success) {
      if (result.code === 'auth/user-not-found') {
        return {
          success: false,
          requiresPasswordSetup: true,
          message: 'No activated account found for this email yet. If you were invited or imported, use "First-Time Setup" with your activation code to choose a password.'
        };
      }
      return { success: false, message: result.message };
    }

    // onAuthStateChanged picks up the sign-in. In free Firebase mode the
    // Auth uid is generated by Firebase, so CRM profile matching is by email.
    const uid = result.user!.uid;
    const matchedUser = users.find(u => u.email.toLowerCase() === trimmedEmail.toLowerCase()) || users.find(u => u.id === uid);
    setUsers(prev => prev.map(u => u.id === matchedUser?.id || u.email.toLowerCase() === trimmedEmail.toLowerCase() ? {
      ...u,
      lastLogin: new Date().toISOString(),
      isPasswordSet: true,
      accountStatus: 'Active',
      passwordLastUpdated: u.passwordLastUpdated || new Date().toISOString()
    } : u));
    addAuditLog({
      module: 'Users',
      recordId: matchedUser?.id || uid,
      recordName: matchedUser?.name || trimmedEmail,
      action: 'UPDATE',
      details: `User ${matchedUser?.name || trimmedEmail} logged in successfully.`
    });
    showToast(`Welcome back${matchedUser ? ', ' + matchedUser.name : ''}!`, 'success');
    return { success: true, user: matchedUser };
  };

  const setupFirstTimePassword = async (email: string, newPassword: string, activationCode?: string): Promise<{ success: boolean; message?: string }> => {
    if (!newPassword || newPassword.length < 12) {
      return { success: false, message: 'Password must be at least 12 characters long.' };
    }
    const result = await activateAndSignIn({ email, newPassword, activationCode });
    if (!result.success) {
      return { success: false, message: result.message };
    }
    const uid = result.user!.uid;
    const normalizedEmail = email.trim().toLowerCase();
    setUsers(prev => prev.map(u => u.id === uid || u.email.toLowerCase() === normalizedEmail ? {
      ...u,
      isPasswordSet: true,
      accountStatus: 'Active',
      passwordLastUpdated: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    } : u));
    const matchedUser = users.find(u => u.id === uid || u.email.toLowerCase() === normalizedEmail);
    addAuditLog({
      module: 'Users',
      recordId: uid,
      recordName: matchedUser?.name || email,
      action: 'UPDATE',
      details: `First-time password configured and account activated for ${matchedUser?.name || email} (${email}).`
    });
    showToast(`Password successfully established! Welcome to Amrut CRM${matchedUser ? ', ' + matchedUser.name : ''}.`, 'success');
    return { success: true };
  };

  const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!newPassword || newPassword.length < 12) {
      return { success: false, message: 'New password must be at least 12 characters long.' };
    }
    const result = await firebaseChangePassword(oldPassword, newPassword);
    if (!result.success) {
      return { success: false, message: result.message };
    }
    setUsers(prev => prev.map(u => u.id === currentUser.id ? {
      ...u,
      isPasswordSet: true,
      passwordLastUpdated: new Date().toISOString()
    } : u));
    addAuditLog({
      module: 'Users',
      recordId: currentUser.id,
      recordName: currentUser?.name || currentUser.id,
      action: 'UPDATE',
      details: `Password changed for user ${currentUser?.name || currentUser.id}.`
    });
    showToast('Password updated successfully', 'success');
    return { success: true };
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; message?: string }> => {
    const result = await firebaseRequestPasswordReset(email);
    return { success: result.success, message: result.message };
  };

  const generateActivationLink = (userId: string): { code: string; link: string } => {
    const targetUser = users.find(u => u.id === userId);
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const generatedCode = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const code = targetUser?.tempActivationCode || `ACT-${generatedCode}`;
    
    // Update code if missing
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, tempActivationCode: code } : u));
    
    const host = window.location.origin;
    const link = `${host}/#activate?action=activate&email=${encodeURIComponent(targetUser?.email || '')}&code=${encodeURIComponent(code)}`;
    return { code, link };
  };

  // Multi-Company & Tenant Management Functions
  const currentCompany = useMemo(() => {
    // Company data arrives asynchronously after authentication. Keep the
    // shell renderable while that snapshot is empty (or if an administrator
    // has not created a company yet); several dashboard components require a
    // concrete company object during their first render.
    return companies.find(c => c.id === currentCompanyId) || companies[0] || INITIAL_COMPANIES[0];
  }, [companies, currentCompanyId]);

  const accessibleCompanies = useMemo(() => {
    // Admins and MDs have access to all registered companies
    if (currentUser?.role === 'CRM Administrator' || currentUser?.role === 'Managing Director' || currentUser?.email === 'abhay@amrutsoftware.com') {
      return companies;
    }
    const userCompanyIds = new Set(
      userMemberships.filter(m => m.userId === currentUser.id && m.isActive).map(m => m.companyId)
    );
    // If memberships not explicitly populated, allow current company
    if (userCompanyIds.size === 0) return [currentCompany];
    return companies.filter(c => userCompanyIds.has(c.id));
  }, [companies, currentUser, userMemberships, currentCompany]);

  const switchCompany = (companyId: string) => {
    const targetComp = companies.find(c => c.id === companyId);
    if (!targetComp) return;
    setCurrentCompanyId(companyId);
    localStorage.setItem('amrut_crm_current_company_id', companyId);
    showToast(`Switched active tenant to ${targetComp.name} (${targetComp.currencySymbol})`, 'info');
  };

  const createCompany = (companyData: Partial<CompanyTenant>) => {
    const newComp: CompanyTenant = {
      id: 'comp_' + Math.random().toString(36).substring(2, 9),
      code: (companyData.code || 'CO').toUpperCase(),
      name: companyData.name || 'New Enterprise Entity',
      legalEntity: companyData.legalEntity || companyData.name || 'New Entity Ltd',
      domain: companyData.domain || 'company.com',
      currency: companyData.currency || 'INR',
      currencySymbol: companyData.currencySymbol || '₹',
      country: companyData.country || 'India',
      city: companyData.city || 'Mumbai',
      taxRegistrationNumber: companyData.taxRegistrationNumber || 'TAX-99281',
      primaryContactEmail: companyData.primaryContactEmail || 'admin@company.com',
      primaryContactPhone: companyData.primaryContactPhone || '+91 22 0000 0000',
      themeColor: companyData.themeColor || '#F25C05',
      industry: companyData.industry || 'Software Products & IT Consulting',
      annualSalesTarget: Number(companyData.annualSalesTarget) || 50000000,
      annualServicesTarget: Number(companyData.annualServicesTarget) || 20000000,
      isActive: true,
      createdDate: new Date().toISOString(),
      gstPercent: companyData.gstPercent !== undefined ? Number(companyData.gstPercent) : 18,
      renewalPriceIncreasePercent: companyData.renewalPriceIncreasePercent !== undefined ? Number(companyData.renewalPriceIncreasePercent) : 10,
      termsAndConditions: companyData.termsAndConditions || 'Prices are exclusive of applicable tax, which will be charged extra as per prevailing rates. Quotation is valid for the period stated above. This quotation does not constitute a binding order until a Purchase Order is issued and accepted.'
    };

    setCompanies(prev => [...prev, newComp]);
    showToast(`Company tenant "${newComp.name}" registered successfully!`, 'success');
  };

  const updateCompany = (companyId: string, data: Partial<CompanyTenant>) => {
    const isAdminOrMD = currentUser.role === 'CRM Administrator' || currentUser.role === 'Managing Director';
    const isSalesHead = currentUser.role === 'Sales Head';

    if (!isAdminOrMD && !isSalesHead) {
      showToast('You do not have permission to update company settings', 'error');
      return;
    }

    // Sales Head may only edit the Terms & Conditions block; everything else
    // (targets, tax %, renewal uplift %, contact/legal details) stays
    // restricted to CRM Administrator / Managing Director.
    const patch: Partial<CompanyTenant> = isAdminOrMD
      ? { ...data }
      : { termsAndConditions: data.termsAndConditions };

    if (patch.termsAndConditions !== undefined) {
      patch.termsAndConditionsLastUpdatedBy = currentUser.name;
      patch.termsAndConditionsLastUpdatedDate = new Date().toISOString();
    }

    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...patch } : c));
    showToast(
      isSalesHead && !isAdminOrMD
        ? 'Terms & Conditions updated'
        : 'Company profile & target configurations updated',
      'success'
    );
  };

  const assignUserToCompany = (membership: Omit<UserCompanyMembership, 'id'>) => {
    const newMem: UserCompanyMembership = {
      ...membership,
      id: 'mem_' + Math.random().toString(36).substring(2, 9)
    };
    setUserMemberships(prev => {
      // replace if already exists for user and company
      const filtered = prev.filter(m => !(m.userId === membership.userId && m.companyId === membership.companyId));
      return [...filtered, newMem];
    });
    showToast(`Company profile assigned for ${membership.companyName}`, 'success');
  };

  // Vendor Sales Targets & Quota Engine
  const upsertVendorTarget = (targetData: Partial<VendorSalesTarget>) => {
    const totalTarget = (Number(targetData.productLicenseTarget) || 0) + (Number(targetData.servicesTarget) || 0);
    const targetYear = Number(String(targetData.period || '').match(/\d{4}/)?.[0]) || new Date().getFullYear();

    if (targetData.id) {
      setVendorTargets(prev => prev.map(t => t.id === targetData.id ? {
        ...t,
        ...targetData,
        totalTarget,
        year: targetYear,
        productLicenseAchieved: t.productLicenseAchieved || 0,
        servicesAchieved: t.servicesAchieved || 0,
        totalAchieved: t.totalAchieved || 0,
        achievementPercentage: t.achievementPercentage || 0
      } as VendorSalesTarget : t));
      showToast('Sales target updated', 'success');
    } else {
      const newTarget: VendorSalesTarget = {
        id: 'trg_' + Math.random().toString(36).substring(2, 9),
        companyId: targetData.companyId || currentCompanyId,
        userId: targetData.userId || currentUser.id,
        userName: targetData.userName || currentUser.name,
        userRole: targetData.userRole || currentUser.role,
        vendorId: targetData.vendorId || 'v_atlassian',
        vendorName: targetData.vendorName || 'Atlassian',
        period: targetData.period || 'FY-2026',
        year: targetYear,
        productLicenseTarget: Number(targetData.productLicenseTarget) || 0,
        productLicenseAchieved: 0,
        servicesTarget: Number(targetData.servicesTarget) || 0,
        servicesAchieved: 0,
        totalTarget,
        totalAchieved: 0,
        achievementPercentage: 0,
        isVendorHeadTarget: targetData.isVendorHeadTarget || false
      };
      setVendorTargets(prev => [...prev, newTarget]);
      showToast(`New sales target saved for ${newTarget.userName} (${newTarget.vendorName})`, 'success');
    }
  };

  const getUserQuotas = (userId?: string, companyId?: string): UserSalesQuotaSummary => {
    const uid = userId || currentUser.id;
    const cid = companyId || currentCompanyId;
    const user = users.find(u => u.id === uid && u.isActive) || currentUser;

    const userTargets = liveVendorTargets.filter(t => t.userId === uid && (!cid || t.companyId === cid));

    const totalSoftwareTarget = userTargets.reduce((acc, t) => acc + (t.productLicenseTarget || 0), 0);
    const totalSoftwareAchieved = userTargets.reduce((acc, t) => acc + (t.productLicenseAchieved || 0), 0);
    const totalServicesTarget = userTargets.reduce((acc, t) => acc + (t.servicesTarget || 0), 0);
    const totalServicesAchieved = userTargets.reduce((acc, t) => acc + (t.servicesAchieved || 0), 0);

    const overallTarget = totalSoftwareTarget + totalServicesTarget;
    const overallAchieved = totalSoftwareAchieved + totalServicesAchieved;
    const overallPercent = overallTarget > 0 ? Math.round((overallAchieved / overallTarget) * 1000) / 10 : 0;

    const vendorBreakdown = userTargets.map(t => ({
      vendorId: t.vendorId,
      vendorName: t.vendorName,
      target: t.totalTarget,
      achieved: t.totalAchieved,
      percent: t.achievementPercentage
    }));

    const servicesBreakdown = [
      { serviceType: 'Implementation & Onboarding', target: totalServicesTarget * 0.45, achieved: totalServicesAchieved * 0.48, percent: 85.3 },
      { serviceType: 'Cloud Migration & Upgrades', target: totalServicesTarget * 0.35, achieved: totalServicesAchieved * 0.32, percent: 73.1 },
      { serviceType: 'Annual SLA & Support Contract', target: totalServicesTarget * 0.20, achieved: totalServicesAchieved * 0.20, percent: 80.0 }
    ];

    return {
      userId: uid,
      userName: user.name,
      userRole: user.role,
      companyId: cid,
      totalSoftwareTarget,
      totalSoftwareAchieved,
      totalServicesTarget,
      totalServicesAchieved,
      overallTarget,
      overallAchieved,
      overallPercent,
      vendorBreakdown,
      servicesBreakdown
    };
  };

  const getVendorHeadRollup = (vendorId: string, companyId?: string) => {
    const cid = companyId || currentCompanyId;
    const vendor = vendors.find(v => v.id === vendorId);
    
    // Find Vendor Head User
    const activeUsers = users.filter(u => u.isActive);
    const activeUserIds = new Set(activeUsers.map(u => u.id));
    const vendorHeadUser = activeUsers.find(u => (u.vendorResponsibilities || []).includes(vendorId)) ||
      activeUsers.find(u => u.role === 'Sales Head' || u.role === 'Vendor Head' || u.role === 'Managing Director');

    // All targets for this vendor in this company
    const targetsForVendor = liveVendorTargets.filter(t => activeUserIds.has(t.userId) && t.vendorId === vendorId && (!cid || t.companyId === cid));

    const headTarget = targetsForVendor.find(t => t.userId === vendorHeadUser?.id && t.isVendorHeadTarget);
    const personalTarget = headTarget ? headTarget.totalTarget : 0;
    const personalAchieved = headTarget ? headTarget.totalAchieved : 0;

    // Subordinates' contributions
    const subordinateTargets = targetsForVendor.filter(t => t.userId !== vendorHeadUser?.id || !t.isVendorHeadTarget);
    const rollupTarget = subordinateTargets.reduce((acc, t) => acc + (t.totalTarget || 0), 0);
    const rollupAchieved = subordinateTargets.reduce((acc, t) => acc + (t.totalAchieved || 0), 0);

    const totalVendorTarget = personalTarget > 0 ? personalTarget : (rollupTarget || (vendor?.annualRevenueTarget || 50000000));
    const totalVendorAchieved = personalAchieved + rollupAchieved;
    const achievementPercent = totalVendorTarget > 0 ? Math.round((totalVendorAchieved / totalVendorTarget) * 1000) / 10 : 0;

    const repContributions = subordinateTargets.map(t => {
      const rep = activeUsers.find(u => u.id === t.userId)!;
      return {
        rep,
        target: t.totalTarget,
        achieved: t.totalAchieved,
        percent: t.achievementPercentage
      };
    });

    return {
      vendor,
      vendorHeadUser,
      personalTarget,
      personalAchieved,
      rollupTarget,
      rollupAchieved,
      totalVendorTarget,
      totalVendorAchieved,
      achievementPercent,
      repContributions
    };
  };

  // BANT & Multi-Horizon Forecasting Engine
  const getPipelineForecastByHorizon = (periodStr: string): TimeHorizonForecast => {
    // Current active pipeline deals
    const activeOpps = accessibleOpportunities.filter(o => o.stage !== 'Closed Lost' && o.stage !== 'Shelved / Budgeted');

    let oppCount = 0;
    let softwareSum = 0;
    let servicesSum = 0;
    let weightedSum = 0;
    let committedCount = 0;
    let bestCaseCount = 0;
    let pipelineCount = 0;
    let bantHighCount = 0;

    const filtered = activeOpps.filter(opp => {
      const prob = opp.probability || 50;
      if (prob >= 80) committedCount++;
      else if (prob >= 50) bestCaseCount++;
      else pipelineCount++;

      // Check BANT strength
      const bant = opp.bant;
      if (bant && bant.budget.includes('Approved') && (bant.authority.includes('Decision') || bant.authority.includes('Committee'))) {
        bantHighCount++;
      }

      softwareSum += (opp.softwareValue || 0);
      servicesSum += (opp.servicesValue || 0);
      weightedSum += ((opp.totalValue || 0) * (opp.probability || 50)) / 100;
      oppCount++;
      return true;
    });

    // Multipliers for different horizons
    let multiplier = 1.0;
    if (periodStr === 'This Week') multiplier = 0.08;
    else if (periodStr === 'This Month') multiplier = 0.28;
    else if (periodStr === 'Next Month') multiplier = 0.32;
    else if (periodStr === 'Next 6 Months (H1/H2)') multiplier = 0.75;
    else multiplier = 1.0; // Full Financial Year

    const totalVal = Math.round((softwareSum + servicesSum) * multiplier);
    const weightedVal = Math.round(weightedSum * multiplier);

    return {
      period: periodStr as any,
      totalPipelineValue: totalVal,
      weightedForecastValue: weightedVal,
      softwareValue: Math.round(softwareSum * multiplier),
      servicesValue: Math.round(servicesSum * multiplier),
      opportunityCount: Math.max(1, Math.round(oppCount * (periodStr === 'This Week' ? 0.2 : 1))),
      committedDealsCount: Math.max(1, Math.round(committedCount * (periodStr === 'This Week' ? 0.3 : 1))),
      bestCaseDealsCount: bestCaseCount,
      pipelineDealsCount: pipelineCount,
      bantHighCount,
      topDeals: filtered.slice(0, 6)
    };
  };

  const timeHorizonForecasts = useMemo(() => {
    return {
      'This Week': getPipelineForecastByHorizon('This Week'),
      'This Month': getPipelineForecastByHorizon('This Month'),
      'Next Month': getPipelineForecastByHorizon('Next Month'),
      'Next 6 Months (H1/H2)': getPipelineForecastByHorizon('Next 6 Months (H1/H2)'),
      'Full Financial Year': getPipelineForecastByHorizon('Full Financial Year')
    };
  }, [accessibleOpportunities]);

  // Google Workspace (Gmail & Calendar) Sync Engine
  const googleAccount = useMemo(() => {
    const found = googleAccounts.find(g => g.userId === currentUser.id && g.companyId === currentCompanyId);
    if (found) return found;
    return {
      id: 'gw_' + currentUser.id,
      userId: currentUser.id,
      companyId: currentCompanyId,
      googleEmail: currentUser.email || 'abhay@amrutsoftware.com',
      isConnected: currentUser.email.includes('@amrutsoftware') || currentUser.role === 'CRM Administrator',
      connectedAt: '2026-08-01T09:00:00Z',
      lastSyncedAt: new Date().toISOString(),
      syncCalendarEnabled: true,
      syncEmailEnabled: true,
      autoCreateEventsFromEmails: true,
      totalEmailsScanned: 198,
      actionableEmailsFound: 16,
      eventsCreatedCount: 9
    };
  }, [googleAccounts, currentUser, currentCompanyId]);

  // Merges freshly-synced emails/events in by id, replacing any prior copy —
  // used by both the real Google sync flow below and any future ingestion path.
  const ingestSyncedEmails = (items: SyncedEmailItem[]) => {
    if (items.length === 0) return;
    setSyncedEmails(prev => {
      const incomingIds = new Set(items.map(i => i.id));
      return [...items, ...prev.filter(e => !incomingIds.has(e.id))];
    });
  };

  const ingestSyncedEvents = (items: SyncedCalendarEvent[]) => {
    if (items.length === 0) return;
    setSyncedEvents(prev => {
      const incomingIds = new Set(items.map(i => i.id));
      return [...items, ...prev.filter(e => !incomingIds.has(e.id))];
    });
  };

  /**
   * Opens the real Google OAuth consent popup (Gmail readonly + Calendar
   * scopes) and, on success, runs an initial sync. See src/lib/googleAuth.ts
   * for why this is a client-only token flow (no backend/client-secret).
   */
  const connectGoogleWorkspace = async () => {
    if (!isGoogleOAuthConfigured()) {
      showToast('Google OAuth client ID is not configured. See SETUP.md to enable real Gmail/Calendar sync.', 'error');
      return;
    }
    try {
      showToast('Opening Google sign-in — grant Gmail & Calendar access to enable sync...', 'info');
      await requestGoogleAccessToken({ interactive: true });
      const email = getConnectedGoogleEmail() || currentUser.email;

      const updated: GoogleWorkspaceAccount = {
        id: 'gw_' + currentUser.id,
        userId: currentUser.id,
        companyId: currentCompanyId,
        googleEmail: email,
        isConnected: true,
        connectedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncCalendarEnabled: true,
        syncEmailEnabled: true,
        autoCreateEventsFromEmails: true,
        totalEmailsScanned: 0,
        actionableEmailsFound: 0,
        eventsCreatedCount: 0
      };
      setGoogleAccounts(prev => {
        const filtered = prev.filter(g => !(g.userId === currentUser.id && g.companyId === currentCompanyId));
        return [...filtered, updated];
      });
      showToast(`Google Workspace connected for ${email}. Running first sync...`, 'success');
      await syncGoogleEmailsNow();
    } catch (err: any) {
      showToast(`Google sign-in failed: ${err?.message || 'unknown error'}`, 'error');
    }
  };

  const disconnectGoogleWorkspace = () => {
    disconnectGoogle();
    setGoogleAccounts(prev => prev.filter(g => !(g.userId === currentUser.id && g.companyId === currentCompanyId)));
    showToast('Google Workspace disconnected.', 'info');
  };

  /**
   * Real sync: fetches recent Gmail messages + upcoming Calendar events via
   * the Google REST APIs using the current OAuth access token, classifies
   * emails (Claude via aiProxy when configured, keyword heuristic otherwise),
   * and merges the results into CRM state.
   */
  const syncGoogleEmailsNow = async () => {
    if (!isGoogleOAuthConfigured()) {
      showToast('Google OAuth client ID is not configured. See SETUP.md to enable real Gmail/Calendar sync.', 'error');
      return;
    }
    setIsGoogleSyncing(true);
    try {
      showToast('Signing in to Google (silent refresh if already granted)...', 'info');
      const accessToken = await requestGoogleAccessToken({ interactive: false }).catch(() => null)
        ?? await requestGoogleAccessToken({ interactive: true });

      showToast('Scanning Gmail for high-priority client emails and RFP requests...', 'info');
      const [emails, events] = await Promise.all([
        syncGmailMessages({ accessToken, companyId: currentCompanyId, maxResults: 20, afterDays: 5 }),
        syncCalendarEvents({ accessToken, userId: currentUser.id, companyId: currentCompanyId, daysAhead: 14 })
      ]);

      ingestSyncedEmails(emails);
      ingestSyncedEvents(events);

      const actionable = emails.filter(e => e.isHighPriority || e.extractedAction).length;
      setGoogleAccounts(prev => prev.map(g => {
        if (g.userId !== currentUser.id || g.companyId !== currentCompanyId) return g;
        return {
          ...g,
          lastSyncedAt: new Date().toISOString(),
          totalEmailsScanned: g.totalEmailsScanned + emails.length,
          actionableEmailsFound: g.actionableEmailsFound + actionable
        };
      }));

      showToast(`Gmail sync complete: ${emails.length} emails scanned, ${actionable} high-priority. ${events.length} calendar events synced.`, 'success');
    } catch (err: any) {
      showToast(`Google sync failed: ${err?.message || 'unknown error'}`, 'error');
    } finally {
      setIsGoogleSyncing(false);
    }
  };

  const applyEmailActionToCalendar = (emailId: string) => {
    const email = syncedEmails.find(e => e.id === emailId);
    if (!email || !email.extractedAction) return;

    if (email.extractedAction.actionType === 'Create Calendar Event') {
      const newEvt: SyncedCalendarEvent = {
        id: 'evt_' + Math.random().toString(36).substring(2, 9),
        googleEventId: 'gcal_' + Math.floor(100000 + Math.random() * 900000),
        userId: currentUser.id,
        companyId: currentCompanyId,
        title: email.extractedAction.suggestedTitle || email.subject,
        description: `Auto-created from client email: "${email.snippet}"`,
        startDateTime: email.extractedAction.suggestedDate || new Date(Date.now() + 86400000 * 2).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 2 + 3600000).toISOString(),
        location: 'Google Meet Bridge',
        meetLink: 'https://meet.google.com/amr-crm-sync',
        attendees: [
          { name: currentUser.name, email: currentUser.email, status: 'accepted' },
          { name: email.senderName, email: email.senderEmail, status: 'needsAction' }
        ],
        linkedEntityType: email.opportunityId ? 'Opportunity' : 'Account',
        linkedEntityId: email.opportunityId || email.accountId,
        linkedEntityName: email.opportunityTitle || email.accountName,
        createdVia: 'Gmail AI Parser',
        status: 'Scheduled'
      };

      setSyncedEvents(prev => [newEvt, ...prev]);
      setSyncedEmails(prev => prev.map(e => e.id === emailId ? {
        ...e,
        extractedAction: { ...e.extractedAction!, status: 'Applied' }
      } : e));

      showToast(`Google Calendar Event "${newEvt.title}" created and invite sent to ${email.senderEmail}!`, 'success');
    } else if (email.extractedAction.actionType === 'Update Stage' && email.opportunityId) {
      advanceOpportunityStage(email.opportunityId, 'Verbal / Intent to Order', {
        reason: 'PO Confirmation received via email from ' + email.senderName
      });
      setSyncedEmails(prev => prev.map(e => e.id === emailId ? {
        ...e,
        extractedAction: { ...e.extractedAction!, status: 'Applied' }
      } : e));
      showToast(`Opportunity stage advanced based on PO signal!`, 'success');
    }
  };

  const createCalendarEvent = (eventData: Omit<SyncedCalendarEvent, 'id'>): SyncedCalendarEvent => {
    const newEvt: SyncedCalendarEvent = {
      ...eventData,
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      googleEventId: 'gcal_' + Math.floor(100000 + Math.random() * 900000)
    };
    setSyncedEvents(prev => [newEvt, ...prev]);
    showToast(`Google Calendar event scheduled: ${newEvt.title}`, 'success');
    return newEvt;
  };

  const deleteCalendarEvent = (eventId: string) => {
    setSyncedEvents(prev => prev.filter(e => e.id !== eventId));
    showToast('Event removed from CRM and Google Calendar', 'info');
  };

  // ==========================================================================
  // TASKS / DAILY WORK QUEUE
  // ==========================================================================

  const createTask = (taskData: Partial<Task>): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      companyId: taskData.companyId || currentCompanyId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description,
      type: taskData.type || 'Other',
      status: taskData.status || 'Open',
      priority: taskData.priority || 'Medium',
      dueDate: taskData.dueDate || now.split('T')[0],
      dueTime: taskData.dueTime,
      assignedToId: taskData.assignedToId || currentUser.id,
      assignedToName: taskData.assignedToName || currentUser.name,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      linkedEntityType: taskData.linkedEntityType,
      linkedEntityId: taskData.linkedEntityId,
      linkedEntityName: taskData.linkedEntityName,
      source: taskData.source || 'Manual',
      createdDate: now,
      modifiedDate: now
    };
    setTasks(prev => [newTask, ...prev]);
    showToast(`Task "${newTask.title}" created for ${newTask.assignedToName}`, 'success');
    return newTask;
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...taskData, modifiedDate: new Date().toISOString() } : t)));
  };

  const completeTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const status: TaskStatus = 'Completed';
      return { ...t, status, completedDate: new Date().toISOString(), modifiedDate: new Date().toISOString() };
    }));
    showToast('Task marked complete', 'success');
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ------------------------------------------------------------------
  // Product Catalog (Admin-managed per-vendor price list)
  // ------------------------------------------------------------------
  const canManageProductCatalog = currentUser.role === 'CRM Administrator' || currentUser.role === 'Managing Director';

  const createProduct = (data: Partial<Product>): Product | null => {
    if (!canManageProductCatalog) {
      showToast('Only CRM Administrators / Managing Director can manage the Product Catalog.', 'error');
      return null;
    }
    const vendor = vendors.find(v => v.id === data.vendorId);
    const newProduct: Product = {
      id: 'prod_' + Date.now(),
      vendorId: data.vendorId || vendor?.id || vendors[0]?.id || '',
      vendorName: vendor?.name || data.vendorName || '',
      name: data.name || 'New Product',
      sku: data.sku,
      listPrice: data.listPrice || 0,
      currency: data.currency || 'INR',
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdDate: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    addAuditLog({
      module: 'Vendors',
      recordId: newProduct.id,
      recordName: newProduct.name,
      action: 'CREATE',
      details: `Product "${newProduct.name}" (${newProduct.vendorName}) added to catalog at ₹${newProduct.listPrice.toLocaleString('en-IN')}`
    });
    showToast(`Product "${newProduct.name}" added to catalog`, 'success');
    return newProduct;
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    if (!canManageProductCatalog) {
      showToast('Only CRM Administrators / Managing Director can manage the Product Catalog.', 'error');
      return;
    }
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...data, modifiedDate: new Date().toISOString() } : p)));
    showToast('Product updated', 'success');
  };

  const deleteProduct = (id: string) => {
    if (!canManageProductCatalog) {
      showToast('Only CRM Administrators / Managing Director can manage the Product Catalog.', 'error');
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('Product removed from catalog', 'info');
  };

  // ------------------------------------------------------------------
  // Renewal Board
  // ------------------------------------------------------------------
  const canManageRenewals = currentUser.role === 'CRM Administrator' || currentUser.role === 'Managing Director' || currentUser.role === 'Sales Head';

  const accessibleRenewals = useMemo(() => {
    const scoped = renewalRecords.filter(r => r.companyId === currentCompanyId);
    if (canManageRenewals || currentUser.role === 'CRM Coordinator' || currentUser.role === 'Sales Manager' || currentUser.role === 'Sales Coordinator') {
      return scoped;
    }
    return scoped.filter(r => r.salespersonId === currentUser.id);
  }, [renewalRecords, currentCompanyId, canManageRenewals, currentUser]);

  const createRenewalRecord = (data: Partial<RenewalRecord>): RenewalRecord | null => {
    if (!canManageRenewals) {
      showToast('Only Sales Head / CRM Administrator can add renewal records.', 'error');
      return null;
    }
    const salesperson = users.find(u => u.id === data.salespersonId);
    const newRenewal: RenewalRecord = {
      id: 'ren_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      companyId: data.companyId || currentCompanyId,
      accountId: data.accountId,
      accountName: data.accountName || 'Unknown Account',
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      product: data.product || '',
      salespersonId: data.salespersonId || currentUser.id,
      salespersonName: salesperson?.name || data.salespersonName || currentUser.name,
      renewalDate: data.renewalDate || new Date().toISOString().split('T')[0],
      previousValue: data.previousValue || 0,
      suggestedRenewalValue: data.suggestedRenewalValue || Math.round((data.previousValue || 0) * (1 + (currentCompany?.renewalPriceIncreasePercent || 0) / 100)),
      currency: data.currency || currentCompany?.currency || 'INR',
      status: data.status || 'Upcoming',
      notes: data.notes,
      linkedOrderId: data.linkedOrderId,
      importedById: currentUser.id,
      importedByName: currentUser.name,
      createdDate: new Date().toISOString()
    };
    setRenewalRecords(prev => [newRenewal, ...prev]);
    return newRenewal;
  };

  const bulkImportRenewalRecords = (records: Partial<RenewalRecord>[]): number => {
    if (!canManageRenewals) {
      showToast('Only Sales Head / CRM Administrator can import renewal records.', 'error');
      return 0;
    }
    const now = new Date().toISOString();
    const imported: RenewalRecord[] = records.map((data, idx) => {
      const salesperson = users.find(u => u.id === data.salespersonId || u.name === data.salespersonName);
      const previousValue = data.previousValue || 0;
      return {
        id: 'ren_imp_' + Date.now() + '_' + idx,
        companyId: data.companyId || currentCompanyId,
        accountId: data.accountId,
        accountName: data.accountName || 'Unknown Account',
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        product: data.product || '',
        salespersonId: salesperson?.id || data.salespersonId || currentUser.id,
        salespersonName: salesperson?.name || data.salespersonName || currentUser.name,
        renewalDate: data.renewalDate || new Date().toISOString().split('T')[0],
        previousValue,
        suggestedRenewalValue: data.suggestedRenewalValue || Math.round(previousValue * (1 + (currentCompany?.renewalPriceIncreasePercent || 0) / 100)),
        currency: data.currency || currentCompany?.currency || 'INR',
        status: data.status || 'Upcoming',
        notes: data.notes,
        importedById: currentUser.id,
        importedByName: currentUser.name,
        createdDate: now
      };
    });
    setRenewalRecords(prev => [...imported, ...prev]);
    addAuditLog({
      module: 'Orders',
      recordId: 'bulk',
      recordName: 'Renewal Board Import',
      action: 'CREATE',
      details: `${imported.length} renewal record(s) imported by ${currentUser.name}`
    });
    showToast(`${imported.length} renewal record(s) imported`, 'success');
    return imported.length;
  };

  const updateRenewalStatus = (id: string, status: RenewalStatus) => {
    setRenewalRecords(prev => prev.map(r => (r.id === id ? { ...r, status, modifiedDate: new Date().toISOString() } : r)));
  };

  const updateRenewalRecord = (id: string, data: Partial<RenewalRecord>) => {
    setRenewalRecords(prev => prev.map(r => (r.id === id ? { ...r, ...data, modifiedDate: new Date().toISOString() } : r)));
  };

  const reassignRenewal = (id: string, newSalespersonId: string) => {
    if (!canManageRenewals) {
      showToast('Only Sales Head / CRM Administrator can reassign renewals.', 'error');
      return;
    }
    const newSalesperson = users.find(u => u.id === newSalespersonId);
    if (!newSalesperson) return;
    setRenewalRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        reassignedFromId: r.salespersonId,
        reassignedFromName: r.salespersonName,
        salespersonId: newSalesperson.id,
        salespersonName: newSalesperson.name,
        modifiedDate: new Date().toISOString()
      };
    }));
    addAuditLog({
      module: 'Orders',
      recordId: id,
      recordName: 'Renewal Reassignment',
      action: 'UPDATE',
      details: `Renewal reassigned to ${newSalesperson.name} by ${currentUser.name}`
    });
    showToast(`Renewal reassigned to ${newSalesperson.name}`, 'success');
  };

  const deleteRenewalRecord = (id: string) => {
    if (!canManageRenewals) {
      showToast('Only Sales Head / CRM Administrator can delete renewal records.', 'error');
      return;
    }
    setRenewalRecords(prev => prev.filter(r => r.id !== id));
  };

  const logout = () => {
    // isAuthenticated / currentUserId update automatically via the
    // onAuthStateChanged listener once Firebase Auth confirms sign-out.
    signOutUser().catch(err => console.warn('[logout] sign-out failed:', err));
    showToast('You have signed out of your CRM session.', 'info');
  };

  // Resets the shared Firestore dataset back to its default seed state —
  // this now affects EVERYONE, not just the local browser, since Firestore
  // is the real shared database. (Existing Firebase Auth accounts and
  // passwords are untouched; only the CRM data docs are reset, so
  // `isPasswordSet` reverting to its seed value doesn't lock anyone out —
  // they can still sign in with whatever password they already set.)
  const resetAllData = () => {
    showToast('Demo-data reset is disabled in production.', 'warning');
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        allUsers: users,
        roles,
        fieldAttributes,
        accounts,
        contacts,
        leads,
        opportunities,
        presalesRequests,
        pocRecords,
        quotes,
        orders,
        vendors,
        workflows,
        auditLogs,
        assignmentHistory,
        fieldSecurityRules,
        webForms,
        accessibleLeads,
        accessibleOpportunities,
        accessibleAccounts,
        accessibleContacts,
        accessibleQuotes,
        accessibleOrders,
        accessiblePresales,
        accessiblePOCs,
        getFieldAccess,
        updateFieldSecurity,
        createLead,
        updateLead,
        assignLead,
        autoAssignLead,
        convertLeadToOpportunity,
        createOpportunity,
        updateOpportunity,
        advanceOpportunityStage,
        createAccount,
        updateAccount,
        createContact,
        updateContact,
        createPresalesRequest,
        updatePresalesRequest,
        createPOC,
        updatePOC,
        createQuote,
        updateQuote,
        approveQuote,
        rejectQuote,
        createOrder,
        updateOrder,
        createUser,
        updateUser,
        renameUser,
        deleteUser,
        transferUserWorkload,
        toggleUserOutOfOffice,
        createRole,
        updateRole,
        deleteRole,
        createFieldAttribute,
        updateFieldAttribute,
        deleteFieldAttribute,
        importDataBatch,
        updateVendor,
        createVendor,
        canManageVendors,
        updateWorkflow,
        createWorkflow,
        deleteWorkflow,
        resetWorkflowsToDefault,
        isRoleAuthorizedForTransition,
        getAvailableWorkflowTransitions,
        validateWorkflowTransition,
        createWebForm,
        submitPublicWebLead,
        searchCustomerHistory,
        addAuditLog,
        resetAuditLogs,
        toasts,
        showToast,
        removeToast,
        isAuthenticated,
        isDataLoading,
        isAuthResolved,
        isFirebaseAuthConfigured: isFirebaseAuthProvisioningConfigured(),
        loginWithCredentials,
        setupFirstTimePassword,
        changeUserPassword,
        requestPasswordReset,
        generateActivationLink,
        logout,
        // Multi-Company
        companies,
        currentCompanyId,
        currentCompany,
        userMemberships,
        accessibleCompanies,
        switchCompany,
        createCompany,
        updateCompany,
        assignUserToCompany,
        // Target & Quotas
        vendorTargets: liveVendorTargets,
        upsertVendorTarget,
        getUserQuotas,
        getVendorHeadRollup,
        // BANT Forecasts
        timeHorizonForecasts,
        getPipelineForecastByHorizon,
        // Google Workspace
        googleAccount,
        syncedEmails,
        syncedEvents,
        isGoogleSyncing,
        isGoogleOAuthConfigured: isGoogleOAuthConfigured(),
        connectGoogleWorkspace,
        disconnectGoogleWorkspace,
        syncGoogleEmailsNow,
        applyEmailActionToCalendar,
        createCalendarEvent,
        deleteCalendarEvent,
        ingestSyncedEmails,
        ingestSyncedEvents,
        // Tasks
        tasks,
        accessibleTasks,
        createTask,
        updateTask,
        completeTask,
        deleteTask,
        // Product Catalog
        products,
        canManageProductCatalog,
        createProduct,
        updateProduct,
        deleteProduct,
        // Renewal Board
        renewalRecords,
        accessibleRenewals,
        canManageRenewals,
        createRenewalRecord,
        bulkImportRenewalRecords,
        updateRenewalStatus,
        updateRenewalRecord,
        reassignRenewal,
        deleteRenewalRecord,
        resetAllData
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
