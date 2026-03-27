import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { STRUCTURE_DATA } from '../data/structures';
import { PLAN_LIMITS, PLAN_NAMES } from '../data/plans';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/useToast';
import {
    saveLocal,
    loadLocal,
    deleteLocal,
    syncToCloud,
    syncDeleteToCloud,
    pullFromCloud,
    startAutoSync,
    stopAutoSync,
    onSyncStatusChange,
    onIdChange,
    processQueue,
} from '../db/syncEngine';
import { subscribeToProject } from '../db/realtimeSync';
import { logActivity } from '../db/collaborationService';
import ProjectsContext from './projects-context';
import { buildCompanyKey, canAccessCompanyProject, deriveCompanyName } from '../utils/companyAccess';

export function ProjectsProvider({ children }) {
    const { user, setView } = useAuth();
    const toast = useToast();

    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showSelector, setShowSelector] = useState(false);
    const [showAnalyzer, setShowAnalyzer] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [workspaceIntent, setWorkspaceIntent] = useState(null);
    const [syncStatus, setSyncStatus] = useState({ state: 'synced' });
    const lastRemoteUpdate = useRef(0);
    const lastUserIdRef = useRef(user?.id || null);

    const filterVisibleProjects = useCallback((incomingProjects = []) => {
        if (!user) return [];

        return incomingProjects.filter((project) => {
            if (!project) return false;

            const hasCloudAccessMeta = !!project.user_id
                || Array.isArray(project.collaborators)
                || !!project.access_mode
                || !!project.company_key;

            if (hasCloudAccessMeta) {
                return canAccessCompanyProject(user, project);
            }

            return project.userId === user.id || String(project.id || '').startsWith('local_');
        });
    }, [user]);

    useEffect(() => {
        const currentUserId = user?.id || null;
        if (currentUserId === lastUserIdRef.current) return;

        lastUserIdRef.current = currentUserId;
        setActiveProjectId(null);
        setActiveTab('dashboard');
        setShowSelector(false);
        setShowAnalyzer(false);
        setIsCreating(false);
        setFocusMode(false);
        setWorkspaceIntent(null);

        if (!currentUserId) {
            setProjects([]);
        }
    }, [user?.id]);

    // ── Load projects: local first, then cloud ──
    useEffect(() => {
        if (!user) {
            setProjects([]);
            return;
        }

        let cancelled = false;

        const init = async () => {
            // 1. Instant load from Dexie
            const localProjects = await loadLocal();
            const visibleLocalProjects = filterVisibleProjects(localProjects);
            if (!cancelled && visibleLocalProjects.length > 0) {
                setProjects(visibleLocalProjects);
            }

            // 2. Background pull from cloud and merge
            const merged = await pullFromCloud();
            if (!cancelled && merged) {
                setProjects(filterVisibleProjects(merged));
            } else if (!cancelled && visibleLocalProjects.length === 0) {
                // If no local data and pull failed, we still load from local (empty)
                // but also try loading from cloud directly for first-time users
                const { getProjects } = await import('../db/database');
                try {
                    const cloudData = await getProjects();
                    const visibleCloudData = filterVisibleProjects(cloudData);
                    if (!cancelled && visibleCloudData.length > 0) {
                        // Save to local DB for next time
                        for (const p of visibleCloudData) {
                            await saveLocal(p);
                        }
                        setProjects(visibleCloudData);
                    }
                } catch {
                    // Offline and no local data — that's fine
                }
            }
        };

        init();

        // Start auto-sync (processes queue every 30s, syncs on reconnect)
        startAutoSync();

        return () => {
            cancelled = true;
            stopAutoSync();
        };
    }, [filterVisibleProjects, user]);

    // ── Listen for sync status changes ──
    useEffect(() => {
        const unsubscribe = onSyncStatusChange((status) => {
            setSyncStatus(status);
        });
        return unsubscribe;
    }, []);

    // ── Listen for ID changes (when local_ gets a real cloud ID) ──
    useEffect(() => {
        const unsubscribe = onIdChange((oldId, newId) => {
            setProjects(prev => prev.map(p =>
                p.id === oldId ? { ...p, id: newId } : p
            ));
            if (activeProjectId === oldId) {
                setActiveProjectId(newId);
            }
        });
        return unsubscribe;
    }, [activeProjectId]);

    // ── Real-time listener for active project (live collaboration) ──
    useEffect(() => {
        if (!activeProjectId || activeProjectId.startsWith('local_')) return;

        const unsubscribe = subscribeToProject(activeProjectId, (remoteProject) => {
            // Throttle: only process remote updates at most once per 2 seconds
            const now = Date.now();
            if (now - lastRemoteUpdate.current < 2000) return;
            lastRemoteUpdate.current = now;

            // Update the project in state with remote data
            setProjects(prev => prev.map(p =>
                p.id === remoteProject.id ? { ...p, ...remoteProject } : p
            ));

            // Also update local Dexie to keep in sync
            saveLocal(remoteProject);
        });

        return () => unsubscribe();
    }, [activeProjectId]);

    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId) || projects[0] || null;
    }, [projects, activeProjectId]);

    useEffect(() => {
        if (!user) return;

        if (!projects.length) {
            if (activeTab === 'workspace' || focusMode) {
                setActiveTab('dashboard');
                setFocusMode(false);
            }
            setActiveProjectId(null);
            return;
        }

        if (activeProjectId && !projects.some(project => project.id === activeProjectId)) {
            setActiveProjectId(null);
            if (activeTab === 'workspace') {
                setActiveTab('dashboard');
                setFocusMode(false);
            }
        }
    }, [activeProjectId, activeTab, focusMode, projects, user]);

    const calculateTotalValue = useMemo(() => {
        try {
            if (!activeProject || !activeProject.sections) return 0;
            return activeProject.sections.reduce((acc, section) => {
                if (!section || !section.items) return acc;
                return acc + section.items.reduce((itemAcc, item) => itemAcc + (item.total || 0), 0);
            }, 0);
        } catch (err) {
            console.error('calculateTotalValue error:', err);
            return 0;
        }
    }, [activeProject]);

    const forceSync = useCallback(async () => {
        const merged = await pullFromCloud();
        if (merged) {
            setProjects(filterVisibleProjects(merged));
            toast.success('Synced with cloud!');
        }
        await processQueue();
    }, [filterVisibleProjects, toast]);

    const handleCreateProject = () => {
        const limits = PLAN_LIMITS[user?.plan] || PLAN_LIMITS[PLAN_NAMES.FREE];
        if (projects.length >= limits.maxProjects) {
            setView('pricing');
            return;
        }
        setShowSelector(true);
    };

    const clearWorkspaceIntent = useCallback(() => {
        setWorkspaceIntent(null);
    }, []);

    const openWorkspace = useCallback((projectId, intent = null) => {
        setActiveProjectId(projectId);
        setActiveTab('workspace');
        setFocusMode(true);
        setWorkspaceIntent(intent ? {
            ...intent,
            projectId,
            nonce: Date.now()
        } : null);
    }, []);

    const buildProjectSections = useCallback((sections = [], { unpriced = true } = {}) => {
        return sections.map(section => ({
            id: Math.random().toString(36).substr(2, 9),
            title: section.title,
            expanded: true,
            items: (section.items || []).map(item => {
                const qty = Number(item.qty) || 0;
                const templateRate = Number(item.rate) || 0;
                const templateBenchmark = Number(item.benchmark) || templateRate || 0;
                const initialRate = unpriced ? 0 : templateRate;
                const initialBenchmark = unpriced ? 0 : templateBenchmark;

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    description: item.description,
                    subcategory: item.subcategory || '',
                    materials: Array.isArray(item.materials) ? item.materials : [],
                    unit: item.unit,
                    qty,
                    rate: initialRate,
                    benchmark: initialBenchmark,
                    useBenchmark: false,
                    total: qty * initialRate,
                    isVO: false,
                    breakdown: item.breakdown || null,
                    customPricing: item.customPricing || null
                };
            })
        }));
    }, []);

    const handleStructureSelect = async (structureId, structureName, manualSections = null) => {
        if (structureId === 'ai-analysis') {
            setShowSelector(false);
            setShowAnalyzer(true);
            return;
        }

        let sectionsToProcess = manualSections;

        if (!sectionsToProcess) {
            // Fallback for old calls or cases where sections aren't passed
            // Search through categories for the structure name if simple ID is used
            for (const cat of Object.values(STRUCTURE_DATA)) {
                if (cat.subtypes && cat.subtypes[structureId]) {
                    sectionsToProcess = cat.subtypes[structureId].sections;
                    break;
                }
            }
        }

        if (!sectionsToProcess) {
            toast.error('Could not find components for this structure type.');
            return;
        }

        const processedSections = buildProjectSections(sectionsToProcess);

        const projectId = `local_${Date.now()}`;
        const newProj = {
            id: projectId,
            name: `${structureName || structureId} Project`,
            type: structureId,
            status: 'Active',
            sections: processedSections,
            date: new Date().toLocaleDateString(),
            region: 'Lagos',
            pricingMode: 'user-entered'
        };

        setIsCreating(true);
        try {
            // 1. Save locally (instant)
            await saveLocal(newProj);

            // 2. Update UI immediately
            setProjects(prev => [newProj, ...prev]);
            setActiveProjectId(projectId);
            setShowSelector(false);
            setActiveTab('workspace');
            setFocusMode(true);

            toast.success('Project created!');

            // 3. Background cloud sync + activity log
            syncToCloud(newProj);
            logActivity(projectId, 'project_created', { name: newProj.name, type: newProj.type });
        } catch (err) {
            console.error('❌ Create project failed:', err);
            toast.error('Error creating project.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCompleteWizard = async (projectConfig) => {
        const isUnpricedTemplate = projectConfig.isUnpricedTemplate !== false;
        const isCustomMode = projectConfig.projectMode === 'custom';
        const company_name = deriveCompanyName({
            companyName: user?.company_name,
            email: user?.email
        });
        const company_key = buildCompanyKey({
            companyKey: user?.company_key,
            companyName: company_name,
            email: user?.email
        });
        const processedSections = buildProjectSections(projectConfig.sections || [], {
            unpriced: isUnpricedTemplate
        });

        const projectId = `local_${Date.now()}`;
        const newProj = {
            id: projectId,
            name: projectConfig.name || `${projectConfig.subtype || projectConfig.type} Project`,
            clientName: projectConfig.clientName || '',
            type: projectConfig.type,
            subtype: projectConfig.subtype,
            projectMode: projectConfig.projectMode || 'default',
            access_mode: isCustomMode ? 'company' : 'private',
            company_name,
            company_key,
            share_enabled: isCustomMode,
            collaboration_enabled: isCustomMode,
            status: 'Active',
            sections: processedSections,
            date: new Date().toLocaleDateString(),
            region: projectConfig.region || 'Lagos',
            notes: projectConfig.notes || '',
            assumptions: projectConfig.assumptions || '',
            exclusions: projectConfig.exclusions || '',
            customSectionCount: Number(projectConfig.customSectionCount) || 0,
            customItemCount: Number(projectConfig.customItemCount) || 0,
            pricingMode: isUnpricedTemplate ? 'user-entered' : 'template-rates',
            preparedBy: user?.displayName || user?.email || 'Engineer',
            checkedBy: ''
        };

        setIsCreating(true);
        try {
            await saveLocal(newProj);
            setProjects(prev => [newProj, ...prev]);
            setActiveProjectId(projectId);
            setShowSelector(false);
            setActiveTab('workspace');
            setFocusMode(true);
            toast.success('Project created successfully!');
            syncToCloud(newProj);
            logActivity(projectId, 'project_created', { name: newProj.name, type: newProj.type });
        } catch (err) {
            console.error('❌ Create wizard project failed:', err);
            toast.error('Error creating project.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleAnalysisComplete = async (elements) => {
        const analyzedSections = elements.map(el => ({
            id: Math.random().toString(36).substr(2, 9),
            title: el.title,
            expanded: true,
            items: Array.from({ length: 3 }).map((_, idx) => ({
                id: Math.random().toString(36).substr(2, 9),
                description: `Identified Component ${idx + 1} from ${el.title}`,
                subcategory: 'Analyzed Item',
                materials: [],
                unit: 'm³',
                qty: Math.floor(Math.random() * 50) + 10,
                rate: 0,
                total: 0,
                isAnalyzed: true
            }))
        }));

        const projectId = `local_${Date.now()}`;
        const newProj = {
            id: projectId,
            name: `AI Draft: ${new Date().toLocaleDateString()}`,
            type: 'AI Drawing Analysis',
            status: 'Draft',
            sections: analyzedSections,
            date: new Date().toLocaleDateString(),
            region: 'Lagos'
        };

        try {
            await saveLocal(newProj);
            setProjects(prev => [newProj, ...prev]);
            setActiveProjectId(projectId);
            setShowAnalyzer(false);
            setActiveTab('workspace');
            setFocusMode(true);
            syncToCloud(newProj);
        } catch (err) {
            console.error('Error creating project from analysis:', err);
        }
    };

    const handleUpdateProject = async (projectId, updatedSections, region = null, additionalUpdates = {}) => {
        // 1. Optimistic UI update
        let updatedProject = null;
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            updatedProject = {
                ...p,
                ...additionalUpdates,
                sections: updatedSections,
                region: region || p.region || 'Lagos'
            };
            return updatedProject;
        }));

        if (!updatedProject) {
            // Project not found in state — find from current projects
            const currentProject = projects.find(p => p.id === projectId);
            if (currentProject) {
                updatedProject = {
                    ...currentProject,
                    ...additionalUpdates,
                    sections: updatedSections,
                    region: region || currentProject.region || 'Lagos'
                };
            }
        }

        if (updatedProject) {
            // 2. Save locally (instant)
            await saveLocal(updatedProject);
            // 3. Background cloud sync (debounced) + activity log
            syncToCloud(updatedProject);
            logActivity(projectId, 'project_updated', { region: updatedProject.region });
        }
    };

    const handleAddSection = async (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newSection = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'New Workspace Section',
            expanded: true,
            items: []
        };

        const updatedSections = [...(project.sections || []), newSection];
        await handleUpdateProject(projectId, updatedSections);
        logActivity(projectId, 'section_added', { title: newSection.title });
    };

    const handleDeleteSectionOrItem = async (projectId, sectionId, itemId = null) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        let updatedSections;
        if (itemId) {
            updatedSections = project.sections.map(s => {
                if (s.id !== sectionId) return s;
                return { ...s, items: s.items.filter(i => i.id !== itemId) };
            });
        } else {
            updatedSections = project.sections.filter(s => s.id !== sectionId);
        }

        await handleUpdateProject(projectId, updatedSections);
    };

    const handleDeleteProject = async (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const canDeleteProject = String(projectId || '').startsWith('local_')
            || project.isOwner === true
            || project.user_id === user?.id;

        if (!canDeleteProject) {
            toast.error('Only the project owner can delete this project.');
            return;
        }

        // 1. Remove from local DB immediately
        await deleteLocal(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));

        if (activeProjectId === projectId) {
            setActiveProjectId(null);
            setActiveTab('dashboard');
        }

        // 2. Background cloud delete
        const success = await syncDeleteToCloud(projectId);
        if (success) {
            toast.success('Project deleted.');
        } else {
            toast.info('Project deleted locally. Cloud sync will complete later.');
        }
    };

    const handleQuickCustomPricingTest = useCallback(async () => {
        const existingProject = projects.find((project) => project.isQuickCustomPricingTest && (project.sections || []).some((section) => (section.items || []).length > 0));
        if (existingProject) {
            const firstItem = (existingProject.sections || []).flatMap((section) =>
                (section.items || []).map((item) => ({ sectionId: section.id, item }))
            )[0];

            openWorkspace(existingProject.id, {
                type: 'custom-pricing-test',
                itemId: firstItem?.item?.id || null
            });
            toast.success('Opened the custom pricing test bench.');
            return;
        }

        const projectId = `local_test_${Date.now()}`;
        const sectionId = `sec_${Date.now()}`;
        const itemId = `itm_${Date.now()}`;
        const quickTestProject = {
            id: projectId,
            name: 'Custom Pricing Test Bench',
            type: 'Quick Test',
            status: 'Draft',
            isQuickCustomPricingTest: true,
            sections: [
                {
                    id: sectionId,
                    title: 'Custom Pricing Sandbox',
                    expanded: true,
                    items: [
                        {
                            id: itemId,
                            description: 'Backyard Entrance Gate',
                            subcategory: 'Quick Test Item',
                            materials: ['Steel frame', 'Hinges', 'Lock set', 'Touch-up paint'],
                            unit: 'nr',
                            qty: 1,
                            rate: 185000,
                            benchmark: 165000,
                            useBenchmark: false,
                            total: 185000,
                            isVO: false,
                            qtySource: 'manual',
                            rateSource: 'custom',
                            customPricing: {
                                workType: 'entranceworks',
                                materialsCost: 112000,
                                labourCost: 24000,
                                plantCost: 6000,
                                transportCost: 18000,
                                wastePercent: 4,
                                siteAdjustmentPercent: 4,
                                overheadsPercent: 12,
                                profitPercent: 12,
                                roundingStep: 100,
                                pricingReference: 'Quick custom pricing test shortcut',
                                supplierQuote: 'Sandbox sample item',
                                notes: 'Use this sample item to test the custom pricing studio without creating a full project.'
                            }
                        }
                    ]
                }
            ],
            date: new Date().toLocaleDateString(),
            region: 'Lagos',
            pricingMode: 'user-entered'
        };

        try {
            await saveLocal(quickTestProject);
            setProjects((prev) => [quickTestProject, ...prev]);
            openWorkspace(projectId, {
                type: 'custom-pricing-test',
                itemId
            });
            toast.success('Custom pricing test bench is ready.');
        } catch (err) {
            console.error('Error creating quick custom pricing test:', err);
            toast.error('Could not open the custom pricing test bench.');
        }
    }, [openWorkspace, projects, toast]);

    const value = {
        projects,
        setProjects,
        activeProjectId,
        setActiveProjectId,
        activeProject,
        activeTab,
        setActiveTab,
        showSelector,
        setShowSelector,
        showAnalyzer,
        setShowAnalyzer,
        isCreating,
        focusMode,
        setFocusMode,
        workspaceIntent,
        clearWorkspaceIntent,
        calculateTotalValue,
        syncStatus,
        forceSync,
        handleCreateProject,
        handleQuickCustomPricingTest,
        handleCompleteWizard,
        handleStructureSelect,
        handleAnalysisComplete,
        handleUpdateProject,
        handleAddSection,
        handleDeleteSectionOrItem,
        handleDeleteProject,
    };

    return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export default ProjectsProvider;
