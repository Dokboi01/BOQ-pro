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
import { getWorkspaceState as getCloudWorkspaceState, saveWorkspaceState as saveCloudWorkspaceState } from '../db/database';
import ProjectsContext from './projects-context';
import { buildCompanyKey, canAccessCompanyProject, deriveCompanyName } from '../utils/companyAccess';

const RESTORABLE_WORKSPACE_TABS = new Set(['workspace', 'reports', 'library']);

const normalizeWorkspaceTab = (tab) => (
    RESTORABLE_WORKSPACE_TABS.has(tab) ? tab : 'workspace'
);

const getWorkspaceTimestamp = (value) => (
    Date.parse(
        value?.projects?.[value?.lastProjectId]?.savedAt
        || value?.savedAt
        || ''
    ) || 0
);

const normalizeWorkspaceSnapshot = (rawState) => {
    if (!rawState || typeof rawState !== 'object') return null;

    if (rawState.projectId) {
        const activeTab = normalizeWorkspaceTab(rawState.activeTab);
        const focusMode = activeTab === 'workspace' ? true : rawState.focusMode !== false;
        const savedAt = rawState.savedAt || '';

        return {
            version: 1,
            lastProjectId: rawState.projectId,
            savedAt,
            projects: {
                [rawState.projectId]: {
                    activeTab,
                    focusMode,
                    savedAt,
                }
            }
        };
    }

    const projects = Object.entries(rawState.projects || {}).reduce((acc, [projectId, value]) => {
        if (!projectId) return acc;

        const activeTab = normalizeWorkspaceTab(value?.activeTab);
        acc[projectId] = {
            activeTab,
            focusMode: activeTab === 'workspace' ? true : value?.focusMode !== false,
            savedAt: value?.savedAt || '',
        };

        return acc;
    }, {});

    const fallbackProjectId = rawState.lastProjectId || Object.keys(projects)[0] || null;
    if (!fallbackProjectId) return null;

    if (!projects[fallbackProjectId]) {
        const activeTab = normalizeWorkspaceTab(rawState.activeTab || rawState.lastActiveTab);
        projects[fallbackProjectId] = {
            activeTab,
            focusMode: activeTab === 'workspace' ? true : rawState.lastFocusMode !== false && rawState.focusMode !== false,
            savedAt: rawState.savedAt || '',
        };
    }

    return {
        version: 1,
        lastProjectId: fallbackProjectId,
        savedAt: projects[fallbackProjectId]?.savedAt || rawState.savedAt || '',
        projects,
    };
};

const pickPreferredWorkspaceSnapshot = (localState, cloudState) => {
    const normalizedLocal = normalizeWorkspaceSnapshot(localState);
    const normalizedCloud = normalizeWorkspaceSnapshot(cloudState);

    if (!normalizedLocal) return normalizedCloud;
    if (!normalizedCloud) return normalizedLocal;

    return getWorkspaceTimestamp(normalizedCloud) > getWorkspaceTimestamp(normalizedLocal)
        ? normalizedCloud
        : normalizedLocal;
};

const buildWorkspaceSnapshot = (baseState, projectId, activeTab, focusMode) => {
    if (!projectId) return null;

    const normalizedBase = normalizeWorkspaceSnapshot(baseState) || {
        version: 1,
        lastProjectId: null,
        savedAt: '',
        projects: {},
    };

    const nextTab = normalizeWorkspaceTab(activeTab);
    const nextFocusMode = nextTab === 'workspace' ? true : focusMode !== false;
    const savedAt = new Date().toISOString();

    return {
        version: 1,
        lastProjectId: projectId,
        savedAt,
        projects: {
            ...normalizedBase.projects,
            [projectId]: {
                activeTab: nextTab,
                focusMode: nextFocusMode,
                savedAt,
            }
        }
    };
};

const remapWorkspaceSnapshotProjectId = (baseState, oldId, newId) => {
    const normalizedBase = normalizeWorkspaceSnapshot(baseState);
    if (!normalizedBase) return null;

    const nextProjects = { ...normalizedBase.projects };
    const oldProjectState = nextProjects[oldId];
    const existingNewProjectState = nextProjects[newId];

    if (!oldProjectState && normalizedBase.lastProjectId !== oldId) {
        return normalizedBase;
    }

    if (oldProjectState) {
        nextProjects[newId] = getWorkspaceTimestamp({
            lastProjectId: newId,
            projects: { [newId]: existingNewProjectState || {} },
            savedAt: existingNewProjectState?.savedAt || '',
        }) > getWorkspaceTimestamp({
            lastProjectId: oldId,
            projects: { [oldId]: oldProjectState },
            savedAt: oldProjectState.savedAt || '',
        })
            ? existingNewProjectState
            : oldProjectState;
        delete nextProjects[oldId];
    }

    return {
        ...normalizedBase,
        lastProjectId: normalizedBase.lastProjectId === oldId ? newId : normalizedBase.lastProjectId,
        projects: nextProjects,
        savedAt: nextProjects[normalizedBase.lastProjectId === oldId ? newId : normalizedBase.lastProjectId]?.savedAt || normalizedBase.savedAt,
    };
};

const removeWorkspaceSnapshotProject = (baseState, projectId) => {
    const normalizedBase = normalizeWorkspaceSnapshot(baseState);
    if (!normalizedBase) return null;

    const nextProjects = { ...normalizedBase.projects };
    delete nextProjects[projectId];

    const remainingProjectIds = Object.keys(nextProjects);
    if (!remainingProjectIds.length) return null;

    const nextLastProjectId = normalizedBase.lastProjectId === projectId
        ? remainingProjectIds[0]
        : normalizedBase.lastProjectId;

    return {
        version: 1,
        lastProjectId: nextLastProjectId,
        savedAt: nextProjects[nextLastProjectId]?.savedAt || normalizedBase.savedAt,
        projects: nextProjects,
    };
};

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
    const [cloudWorkspaceState, setCloudWorkspaceState] = useState(null);
    const [cloudWorkspaceReady, setCloudWorkspaceReady] = useState(false);
    const lastRemoteUpdate = useRef(0);
    const lastUserIdRef = useRef(user?.id || null);
    const hasRestoredWorkspaceRef = useRef(false);
    const cloudWorkspaceSaveTimerRef = useRef(null);
    const lastPersistedWorkspaceSignatureRef = useRef('');

    const getWorkspaceStateStorageKey = useCallback(() => (
        user?.id ? `boq_pro_last_workspace:${user.id}` : null
    ), [user?.id]);

    const readSavedWorkspaceState = useCallback(() => {
        const storageKey = getWorkspaceStateStorageKey();
        if (!storageKey) return null;

        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? normalizeWorkspaceSnapshot(JSON.parse(raw)) : null;
        } catch {
            return null;
        }
    }, [getWorkspaceStateStorageKey]);

    const writeSavedWorkspaceState = useCallback((nextState) => {
        const storageKey = getWorkspaceStateStorageKey();
        if (!storageKey) return;

        if (!nextState) {
            localStorage.removeItem(storageKey);
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify(normalizeWorkspaceSnapshot(nextState)));
    }, [getWorkspaceStateStorageKey]);

    const persistWorkspaceState = useCallback((nextState) => {
        const normalizedState = normalizeWorkspaceSnapshot(nextState);

        writeSavedWorkspaceState(normalizedState);
        setCloudWorkspaceState(normalizedState);

        if (!user?.id) return;

        if (cloudWorkspaceSaveTimerRef.current) {
            clearTimeout(cloudWorkspaceSaveTimerRef.current);
        }

        cloudWorkspaceSaveTimerRef.current = setTimeout(async () => {
            try {
                await saveCloudWorkspaceState(normalizedState);
            } catch (err) {
                console.warn('Workspace state cloud save failed:', err?.message || err);
            }
        }, 500);
    }, [user?.id, writeSavedWorkspaceState]);

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
        hasRestoredWorkspaceRef.current = false;
        setActiveProjectId(null);
        setActiveTab('dashboard');
        setShowSelector(false);
        setShowAnalyzer(false);
        setIsCreating(false);
        setFocusMode(false);
        setWorkspaceIntent(null);
        setCloudWorkspaceState(null);
        setCloudWorkspaceReady(false);
        lastPersistedWorkspaceSignatureRef.current = '';

        if (cloudWorkspaceSaveTimerRef.current) {
            clearTimeout(cloudWorkspaceSaveTimerRef.current);
            cloudWorkspaceSaveTimerRef.current = null;
        }

        if (!currentUserId) {
            setProjects([]);
        }
    }, [user?.id]);

    useEffect(() => {
        return () => {
            if (cloudWorkspaceSaveTimerRef.current) {
                clearTimeout(cloudWorkspaceSaveTimerRef.current);
            }
        };
    }, []);

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

    useEffect(() => {
        if (!user?.id) return;

        let cancelled = false;
        setCloudWorkspaceReady(false);

        const loadCloudWorkspaceState = async () => {
            try {
                const remoteWorkspaceState = normalizeWorkspaceSnapshot(await getCloudWorkspaceState());
                if (cancelled) return;

                setCloudWorkspaceState(remoteWorkspaceState);
                setCloudWorkspaceReady(true);

                const preferredState = pickPreferredWorkspaceSnapshot(
                    readSavedWorkspaceState(),
                    remoteWorkspaceState
                );

                if (preferredState) {
                    writeSavedWorkspaceState(preferredState);
                }
            } catch (err) {
                if (cancelled) return;
                console.warn('Workspace state cloud load failed:', err?.message || err);
                setCloudWorkspaceReady(true);
            }
        };

        loadCloudWorkspaceState();

        return () => {
            cancelled = true;
        };
    }, [readSavedWorkspaceState, user?.id, writeSavedWorkspaceState]);

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

            const nextWorkspaceState = remapWorkspaceSnapshotProjectId(
                pickPreferredWorkspaceSnapshot(readSavedWorkspaceState(), cloudWorkspaceState),
                oldId,
                newId
            );

            if (nextWorkspaceState) {
                persistWorkspaceState(nextWorkspaceState);
            }
        });
        return unsubscribe;
    }, [activeProjectId, cloudWorkspaceState, persistWorkspaceState, readSavedWorkspaceState]);

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
        if (!user?.id || hasRestoredWorkspaceRef.current || !projects.length) return;

        const sharedProjectId = new URLSearchParams(window.location.search).get('project');
        if (sharedProjectId) {
            hasRestoredWorkspaceRef.current = true;
            return;
        }

        if (!cloudWorkspaceReady) return;

        const savedWorkspaceState = pickPreferredWorkspaceSnapshot(
            readSavedWorkspaceState(),
            cloudWorkspaceState
        );
        hasRestoredWorkspaceRef.current = true;

        if (!savedWorkspaceState?.lastProjectId) return;

        const matchingProject = projects.find((project) => project.id === savedWorkspaceState.lastProjectId);
        if (!matchingProject) {
            persistWorkspaceState(removeWorkspaceSnapshotProject(savedWorkspaceState, savedWorkspaceState.lastProjectId));
            return;
        }

        const projectWorkspaceState = savedWorkspaceState.projects?.[matchingProject.id];
        const nextTab = normalizeWorkspaceTab(projectWorkspaceState?.activeTab);

        setActiveProjectId(matchingProject.id);
        setActiveTab(nextTab);
        setFocusMode(projectWorkspaceState?.focusMode !== false || nextTab === 'workspace');
        setWorkspaceIntent(null);
    }, [cloudWorkspaceReady, cloudWorkspaceState, persistWorkspaceState, projects, readSavedWorkspaceState, user?.id]);

    const hasActiveProject = useMemo(() => (
        !!activeProjectId && projects.some((project) => project.id === activeProjectId)
    ), [activeProjectId, projects]);

    useEffect(() => {
        if (!user?.id || !activeProjectId || !hasActiveProject) {
            return;
        }

        const nextTab = activeTab === 'dashboard' ? 'workspace' : activeTab;
        const nextFocusMode = nextTab === 'workspace' ? true : focusMode !== false;
        const nextSignature = `${activeProjectId}:${nextTab}:${nextFocusMode ? '1' : '0'}`;

        if (lastPersistedWorkspaceSignatureRef.current === nextSignature) {
            return;
        }

        lastPersistedWorkspaceSignatureRef.current = nextSignature;

        persistWorkspaceState(
            buildWorkspaceSnapshot(
                pickPreferredWorkspaceSnapshot(readSavedWorkspaceState(), cloudWorkspaceState),
                activeProjectId,
                nextTab,
                nextFocusMode
            )
        );
    }, [activeProjectId, activeTab, cloudWorkspaceState, focusMode, hasActiveProject, persistWorkspaceState, readSavedWorkspaceState, user?.id]);

    useEffect(() => {
        if (!user) return;

        if (!projects.length) {
            if (activeTab === 'workspace' || focusMode) {
                setActiveTab('dashboard');
                setFocusMode(false);
            }
            setActiveProjectId(null);
            lastPersistedWorkspaceSignatureRef.current = '';
            return;
        }

        if (activeProjectId && !projects.some(project => project.id === activeProjectId)) {
            const savedWorkspaceState = pickPreferredWorkspaceSnapshot(
                readSavedWorkspaceState(),
                cloudWorkspaceState
            );
            persistWorkspaceState(removeWorkspaceSnapshotProject(savedWorkspaceState, activeProjectId));
            setActiveProjectId(null);
            lastPersistedWorkspaceSignatureRef.current = '';
            if (activeTab === 'workspace') {
                setActiveTab('dashboard');
                setFocusMode(false);
            }
        }
    }, [activeProjectId, activeTab, cloudWorkspaceState, focusMode, persistWorkspaceState, projects, readSavedWorkspaceState, user]);

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
        await processQueue();
        const merged = await pullFromCloud();
        if (merged) {
            setProjects(filterVisibleProjects(merged));
            toast.success('Synced with cloud!');
        }
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
            setFocusMode(false);
            lastPersistedWorkspaceSignatureRef.current = '';
        }

        // 2. Background cloud delete
        const success = await syncDeleteToCloud(projectId);
        if (success) {
            toast.success('Project deleted.');
        } else {
            toast.info('Project deleted locally. Cloud sync will complete later.');
        }

        persistWorkspaceState(removeWorkspaceSnapshotProject(
            pickPreferredWorkspaceSnapshot(readSavedWorkspaceState(), cloudWorkspaceState),
            projectId
        ));
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
