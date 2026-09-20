import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  MarketingProject,
  Campaign,
  LeadGenDataset,
  DatasetRecord,
  CampaignMetrics
} from '../types';
import {
  INITIAL_MARKETING_PROJECTS,
  INITIAL_CAMPAIGNS,
  INITIAL_DATASETS,
  INITIAL_DATASET_RECORDS
} from '../data/marketingFinanceData';
import { useCRM } from './CRMContext';
import { useSyncedCollection } from '../lib/useSyncedCollection';

interface MarketingContextType {
  projects: MarketingProject[];
  accessibleProjects: MarketingProject[];
  campaigns: Campaign[];
  accessibleCampaigns: Campaign[];
  datasets: LeadGenDataset[];
  accessibleDatasets: LeadGenDataset[];
  datasetRecords: DatasetRecord[];

  createProject: (data: Partial<MarketingProject>) => MarketingProject;
  updateProject: (id: string, data: Partial<MarketingProject>) => void;

  createCampaign: (data: Partial<Campaign>) => Campaign;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  updateCampaignMetrics: (id: string, metrics: Partial<CampaignMetrics>) => void;
  deleteCampaign: (id: string) => void;

  createDataset: (data: Partial<LeadGenDataset>, records: Partial<DatasetRecord>[]) => LeadGenDataset;
  getRecordsForDataset: (datasetId: string) => DatasetRecord[];
  updateDatasetRecord: (id: string, data: Partial<DatasetRecord>) => void;
  convertRecordToLead: (recordId: string, overrides?: Record<string, any>) => void;
  bulkConvertToLeads: (recordIds: string[]) => number;
}

const MarketingContext = createContext<MarketingContextType | undefined>(undefined);

export const MarketingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, currentCompanyId, createLead, showToast, roles, isAuthenticated } = useCRM();

  const [projects, setProjects] = useSyncedCollection<MarketingProject>('marketingProjects', INITIAL_MARKETING_PROJECTS, isAuthenticated);
  const [campaigns, setCampaigns] = useSyncedCollection<Campaign>('campaigns', INITIAL_CAMPAIGNS, isAuthenticated);
  const [datasets, setDatasets] = useSyncedCollection<LeadGenDataset>('datasets', INITIAL_DATASETS, isAuthenticated);
  const [datasetRecords, setDatasetRecords] = useSyncedCollection<DatasetRecord>('datasetRecords', INITIAL_DATASET_RECORDS, isAuthenticated);

  const canSeeAllMarketing = useMemo(() => {
    if (
      currentUser.role === 'Managing Director' ||
      currentUser.role === 'CRM Administrator' ||
      currentUser.role === 'CRM Coordinator' ||
      currentUser.role === 'Marketing Admin' ||
      currentUser.role === 'Marketing Manager' ||
      currentUser.role === 'Lead Gen Admin' ||
      currentUser.role === 'Lead Gen Manager' ||
      currentUser.role === 'Sales Head'
    ) {
      return true;
    }
    const roleDef = roles.find(r => r.name === currentUser.role);
    return !!roleDef?.permissions?.canViewAllMarketing;
  }, [currentUser, roles]);

  const accessibleProjects = useMemo(() => {
    const scoped = projects.filter(p => p.companyId === currentCompanyId);
    return canSeeAllMarketing ? scoped : scoped.filter(p => p.ownerId === currentUser.id);
  }, [projects, currentCompanyId, canSeeAllMarketing, currentUser.id]);

  const accessibleCampaigns = useMemo(() => {
    const scoped = campaigns.filter(c => c.companyId === currentCompanyId);
    return canSeeAllMarketing ? scoped : scoped.filter(c => c.ownerId === currentUser.id);
  }, [campaigns, currentCompanyId, canSeeAllMarketing, currentUser.id]);

  const accessibleDatasets = useMemo(() => {
    const scoped = datasets.filter(d => d.companyId === currentCompanyId);
    return canSeeAllMarketing ? scoped : scoped.filter(d => d.uploadedById === currentUser.id);
  }, [datasets, currentCompanyId, canSeeAllMarketing, currentUser.id]);

  const createProject = (data: Partial<MarketingProject>): MarketingProject => {
    const newProject: MarketingProject = {
      id: 'proj_' + Date.now(),
      companyId: data.companyId || currentCompanyId,
      name: data.name || 'Untitled Project',
      code: data.code || 'PRJ-' + Math.floor(1000 + Math.random() * 9000),
      description: data.description,
      objective: data.objective || '',
      ownerId: data.ownerId || currentUser.id,
      ownerName: data.ownerName || currentUser.name,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate,
      budget: data.budget || 0,
      spend: 0,
      status: data.status || 'Planning',
      targetVendorIds: data.targetVendorIds || [],
      targetIndustries: data.targetIndustries || [],
      targetRegions: data.targetRegions || [],
      createdDate: new Date().toISOString()
    };
    setProjects(prev => [newProject, ...prev]);
    showToast(`Marketing project "${newProject.name}" created`, 'success');
    return newProject;
  };

  const updateProject = (id: string, data: Partial<MarketingProject>) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
  };

  const createCampaign = (data: Partial<Campaign>): Campaign => {
    const project = projects.find(p => p.id === data.projectId);
    const newCampaign: Campaign = {
      id: 'camp_' + Date.now(),
      companyId: data.companyId || currentCompanyId,
      projectId: data.projectId || '',
      projectName: project?.name || data.projectName || '',
      name: data.name || 'Untitled Campaign',
      channel: data.channel || 'Email',
      status: data.status || 'Draft',
      ownerId: data.ownerId || currentUser.id,
      ownerName: data.ownerName || currentUser.name,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      budget: data.budget || 0,
      spend: 0,
      targetAudienceSize: data.targetAudienceSize || 0,
      datasetId: data.datasetId,
      messagingTemplate: data.messagingTemplate,
      utmSource: data.utmSource,
      utmCampaign: data.utmCampaign,
      metrics: {
        sent: 0, delivered: 0, opened: 0, clicked: 0, responded: 0,
        leadsGenerated: 0, qualifiedLeads: 0, opportunitiesCreated: 0, revenueInfluenced: 0
      },
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };
    setCampaigns(prev => [newCampaign, ...prev]);
    showToast(`Campaign "${newCampaign.name}" created under ${newCampaign.projectName || 'Unassigned Project'}`, 'success');
    return newCampaign;
  };

  const updateCampaign = (id: string, data: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => (c.id === id ? { ...c, ...data, modifiedDate: new Date().toISOString() } : c)));
  };

  const updateCampaignMetrics = (id: string, metrics: Partial<CampaignMetrics>) => {
    setCampaigns(prev => prev.map(c => (c.id === id ? { ...c, metrics: { ...c.metrics, ...metrics }, modifiedDate: new Date().toISOString() } : c)));
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    showToast('Campaign removed', 'info');
  };

  const createDataset = (data: Partial<LeadGenDataset>, records: Partial<DatasetRecord>[]): LeadGenDataset => {
    const datasetId = 'ds_' + Date.now();
    const now = new Date().toISOString();

    // De-duplicate on (email, companyName) within the same import batch.
    const seen = new Set<string>();
    const mapped: DatasetRecord[] = records.map((r, idx) => {
      const key = `${(r.contactEmail || '').toLowerCase()}|${(r.companyName || '').toLowerCase()}`;
      const isDup = seen.has(key) && !!r.contactEmail;
      seen.add(key);
      return {
        id: `dr_${datasetId}_${idx}`,
        datasetId,
        companyId: data.companyId || currentCompanyId,
        companyName: r.companyName || 'Unknown Company',
        contactName: r.contactName || 'Unknown Contact',
        contactEmail: r.contactEmail || '',
        contactPhone: r.contactPhone,
        designation: r.designation,
        industry: r.industry,
        city: r.city,
        country: r.country,
        status: isDup ? 'Duplicate' : (r.status || 'New'),
        raw: r.raw,
        createdDate: now
      };
    });

    const newDataset: LeadGenDataset = {
      id: datasetId,
      companyId: data.companyId || currentCompanyId,
      projectId: data.projectId,
      name: data.name || 'Untitled Dataset',
      description: data.description,
      sourceType: data.sourceType || 'CSV Upload',
      fileName: data.fileName,
      totalRecords: mapped.length,
      validRecords: mapped.filter(r => r.status !== 'Duplicate' && r.status !== 'Invalid').length,
      duplicateRecords: mapped.filter(r => r.status === 'Duplicate').length,
      convertedToLeadsCount: 0,
      uploadedById: currentUser.id,
      uploadedByName: currentUser.name,
      tags: data.tags || [],
      createdDate: now
    };

    setDatasets(prev => [newDataset, ...prev]);
    setDatasetRecords(prev => [...mapped, ...prev]);
    showToast(`Dataset "${newDataset.name}" imported: ${newDataset.validRecords} valid, ${newDataset.duplicateRecords} duplicates`, 'success');
    return newDataset;
  };

  const getRecordsForDataset = (datasetId: string) => datasetRecords.filter(r => r.datasetId === datasetId);

  const updateDatasetRecord = (id: string, data: Partial<DatasetRecord>) => {
    setDatasetRecords(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
  };

  const convertRecordToLead = (recordId: string, overrides: Record<string, any> = {}) => {
    const record = datasetRecords.find(r => r.id === recordId);
    if (!record) return;
    const dataset = datasets.find(d => d.id === record.datasetId);

    const newLead = createLead({
      companyName: record.companyName,
      contactName: record.contactName,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone || '',
      designation: record.designation || '',
      country: record.country || '',
      city: record.city || '',
      source: 'Cold Calling',
      campaign: dataset?.name,
      requirement: `Sourced from dataset: ${dataset?.name || record.datasetId}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      workingSalespersonId: overrides.workingSalespersonId || currentUser.id,
      workingSalespersonName: overrides.workingSalespersonName || currentUser.name,
      ...overrides
    });

    setDatasetRecords(prev => prev.map(r => (r.id === recordId ? { ...r, status: 'Converted to Lead', convertedLeadId: newLead.id } : r)));
    setDatasets(prev => prev.map(d => (d.id === record.datasetId ? { ...d, convertedToLeadsCount: d.convertedToLeadsCount + 1 } : d)));
    showToast(`Lead created from dataset record: ${record.contactName} (${record.companyName})`, 'success');
  };

  const bulkConvertToLeads = (recordIds: string[]): number => {
    let count = 0;
    recordIds.forEach(id => {
      const record = datasetRecords.find(r => r.id === id);
      if (record && record.status !== 'Converted to Lead' && record.status !== 'Duplicate' && record.status !== 'Invalid') {
        convertRecordToLead(id);
        count++;
      }
    });
    return count;
  };

  return (
    <MarketingContext.Provider
      value={{
        projects,
        accessibleProjects,
        campaigns,
        accessibleCampaigns,
        datasets,
        accessibleDatasets,
        datasetRecords,
        createProject,
        updateProject,
        createCampaign,
        updateCampaign,
        updateCampaignMetrics,
        deleteCampaign,
        createDataset,
        getRecordsForDataset,
        updateDatasetRecord,
        convertRecordToLead,
        bulkConvertToLeads
      }}
    >
      {children}
    </MarketingContext.Provider>
  );
};

export const useMarketing = () => {
  const context = useContext(MarketingContext);
  if (!context) {
    throw new Error('useMarketing must be used within a MarketingProvider');
  }
  return context;
};
