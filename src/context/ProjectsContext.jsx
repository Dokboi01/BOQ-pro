import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    createProjectSectionsFromStructure,
    getStructureDefinition,
} from '../data/boqCatalog';
import { DEFAULT_NIGERIA_LOCATION } from '../data/nigeriaLocations';
import { DEFAULT_CURRENCY_CODE } from '../data/currencies';
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
    onProjectSaveStateChange,
    onIdChange,
    processQueue,
} from '../db/syncEngine';
import { subscribeToProject } from '../db/realtimeSync';
import { logActivity } from '../db/collaborationService';
import { getWorkspaceState as getCloudWorkspaceState, saveWorkspaceState as saveCloudWorkspaceState } from '../db/database';
import ProjectsContext from './projects-context';
import { buildCompanyKey, canAccessCompanyProject, deriveCompanyName } from '../utils/companyAccess';
import {
    buildAutoRateResult,
    getEffectiveBenchmarkRate,
    getItemTotal,
    resolveItemRateSource,
} from '../utils/pricing';
import { evaluateBoqFormulaRate, normalizeEditableInputs } from '../utils/boqFormulas';

const PROJECT_SCOPED_TABS = new Set(['workspace', 'reports', 'library']);
const RESTORABLE_APP_TABS = new Set(['dashboard', 'workspace', 'reports', 'library', 'settings', 'methodology']);

const isProjectScopedTab = (tab) => PROJECT_SCOPED_TABS.has(tab);

const normalizeProjectTab = (tab) => (
    PROJECT_SCOPED_TABS.has(tab) ? tab : 'workspace'
);

const normalizeAppTab = (tab, fallback = 'dashboard') => (
    RESTORABLE_APP_TABS.has(tab) ? tab : fallback
);

const shouldPersistFocusMode = (tab) => (
    tab === 'workspace' || tab === 'reports' || tab === 'library'
);

const inferLegacyAppTab = (rawState, projects = {}, fallbackProjectId = null) => {
    const explicitTab = normalizeProjectTab(rawState?.activeTab || rawState?.lastActiveTab);
    if (explicitTab === 'reports' || explicitTab === 'library') {
        return explicitTab;
    }

    const fallbackTab = normalizeProjectTab(projects?.[fallbackProjectId]?.activeTab);
    if (fallbackTab === 'reports' || fallbackTab === 'library') {
        return fallbackTab;
    }

    return 'dashboard';
};

const getWorkspaceTimestamp = (value) => (
    Date.parse(
        value?.savedAt
        || value?.projects?.[value?.lastProjectId]?.savedAt
        || ''
    ) || 0
);

const getProjectIdentity = (project) => (
    project?.local_origin_id || project?.id || null
);

const getProjectSortTimestamp = (project) => (
    Number(project?.updatedAt)
    || Date.parse(project?.date || '')
    || Number(project?.saveMeta?.lastLocalSaveAt)
    || Number(project?.saveMeta?.lastCloudSyncAt)
    || 0
);

const dedupeProjectsByIdentity = (projects = []) => {
    const byIdentity = new Map();

    for (const project of Array.isArray(projects) ? projects : []) {
        if (!project?.id) continue;

        const identity = getProjectIdentity(project) || project.id;
        const existing = byIdentity.get(identity);
        if (!existing) {
            byIdentity.set(identity, project);
            continue;
        }

        const existingIsLocal = String(existing.id || '').startsWith('local_');
        const nextIsLocal = String(project.id || '').startsWith('local_');
        const existingTs = getProjectSortTimestamp(existing);
        const nextTs = getProjectSortTimestamp(project);

        if ((!nextIsLocal && existingIsLocal) || nextTs > existingTs) {
            byIdentity.set(identity, { ...existing, ...project });
            continue;
        }

        byIdentity.set(identity, { ...project, ...existing });
    }

    return [...byIdentity.values()];
};

const normalizeWorkspaceSnapshot = (rawState) => {
    if (!rawState || typeof rawState !== 'object') return null;

    if (rawState.projectId) {
        const projectTab = normalizeProjectTab(rawState.activeTab);
        const appTab = rawState.lastAppTab
            ? normalizeAppTab(rawState.lastAppTab)
            : inferLegacyAppTab(rawState, {
                [rawState.projectId]: { activeTab: projectTab }
            }, rawState.projectId);
        const focusMode = shouldPersistFocusMode(projectTab) ? rawState.focusMode === true : false;
        const savedAt = rawState.savedAt || '';

        return {
            version: 2,
            lastAppTab: appTab,
            lastProjectId: rawState.projectId,
            lastFocusMode: shouldPersistFocusMode(appTab) ? focusMode : false,
            savedAt,
            projects: {
                [rawState.projectId]: {
                    activeTab: projectTab,
                    focusMode,
                    savedAt,
                }
            }
        };
    }

    const projects = Object.entries(rawState.projects || {}).reduce((acc, [projectId, value]) => {
        if (!projectId) return acc;

        const activeTab = normalizeProjectTab(value?.activeTab);
        acc[projectId] = {
            activeTab,
            focusMode: shouldPersistFocusMode(activeTab) ? value?.focusMode === true : false,
            savedAt: value?.savedAt || '',
        };

        return acc;
    }, {});

    const fallbackProjectId = rawState.lastProjectId || Object.keys(projects)[0] || null;
    const savedAt = rawState.savedAt || projects[fallbackProjectId]?.savedAt || '';
    const inferredAppTab = rawState.lastAppTab
        ? normalizeAppTab(rawState.lastAppTab)
        : inferLegacyAppTab(rawState, projects, fallbackProjectId);
    const lastAppTab = isProjectScopedTab(inferredAppTab) && !fallbackProjectId
        ? 'dashboard'
        : inferredAppTab;

    if (fallbackProjectId && !projects[fallbackProjectId]) {
        const activeTab = normalizeProjectTab(rawState.activeTab || rawState.lastActiveTab);
        projects[fallbackProjectId] = {
            activeTab,
            focusMode: shouldPersistFocusMode(activeTab)
                ? (rawState.lastFocusMode === true || rawState.focusMode === true)
                : false,
            savedAt,
        };
    }

    return {
        version: 2,
        lastAppTab,
        lastProjectId: fallbackProjectId,
        lastFocusMode: shouldPersistFocusMode(lastAppTab)
            ? (rawState.lastFocusMode === true || projects[fallbackProjectId]?.focusMode === true)
            : false,
        savedAt,
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

const buildWorkspaceSnapshot = (baseState, { projectId = null, activeTab = 'dashboard', focusMode = false } = {}) => {
    const normalizedBase = normalizeWorkspaceSnapshot(baseState) || {
        version: 2,
        lastAppTab: 'dashboard',
        lastProjectId: null,
        lastFocusMode: false,
        savedAt: '',
        projects: {},
    };

    const nextAppTab = normalizeAppTab(activeTab);
    const nextFocusMode = shouldPersistFocusMode(nextAppTab) ? focusMode === true : false;
    const savedAt = new Date().toISOString();
    const nextProjects = { ...normalizedBase.projects };

    if (projectId && isProjectScopedTab(nextAppTab)) {
        nextProjects[projectId] = {
            activeTab: normalizeProjectTab(nextAppTab),
            focusMode: nextFocusMode,
            savedAt,
        };
    }

    return {
        version: 2,
        lastAppTab: nextAppTab,
        lastProjectId: projectId || normalizedBase.lastProjectId || null,
        lastFocusMode: nextFocusMode,
        savedAt,
        projects: nextProjects,
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
        lastAppTab: normalizeAppTab(normalizedBase.lastAppTab),
        lastFocusMode: shouldPersistFocusMode(normalizedBase.lastAppTab) ? normalizedBase.lastFocusMode === true : false,
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
    const nextLastProjectId = normalizedBase.lastProjectId === projectId
        ? (remainingProjectIds[0] || null)
        : normalizedBase.lastProjectId;
    const nextAppTab = isProjectScopedTab(normalizedBase.lastAppTab) && !nextLastProjectId
        ? 'dashboard'
        : normalizeAppTab(normalizedBase.lastAppTab);

    return {
        version: 2,
        lastAppTab: nextAppTab,
        lastProjectId: nextLastProjectId,
        lastFocusMode: shouldPersistFocusMode(nextAppTab) ? normalizedBase.lastFocusMode === true : false,
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
    const [syncStatus, setSyncStatus] = useState({ state: 'synced', pendingCount: 0 });
    const [cloudWorkspaceState, setCloudWorkspaceState] = useState(null);
    const [cloudWorkspaceReady, setCloudWorkspaceReady] = useState(false);
    const lastRemoteUpdate = useRef(0);
    const lastUserIdRef = useRef(user?.id || null);
    const hasRestoredWorkspaceRef = useRef(false);
    const cloudWorkspaceSaveTimerRef = useRef(null);
    const lastPersistedWorkspaceSignatureRef = useRef('');

    const getWorkspaceStateStorageKey = useCallback(() => (
        user?.id ? `quantra_last_workspace:${user.id}` : null
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

        return dedupeProjectsByIdentity(incomingProjects.filter((project) => {
            if (!project) return false;

            if (project.userId === user.id || String(project.id || '').startsWith('local_')) {
                return true;
            }

            const hasCloudAccessMeta = !!project.user_id
                || Array.isArray(project.collaborators)
                || !!project.access_mode
                || !!project.company_key;

            if (hasCloudAccessMeta) {
                return canAccessCompanyProject(user, project);
            }

            return false;
        }));
    }, [user?.id]);

    const ensureSharedProjectVisible = useCallback(async (incomingProjects = []) => {
        const sharedProjectId = new URLSearchParams(window.location.search).get('project');
        if (!user || !sharedProjectId) return incomingProjects;
        if (incomingProjects.some((project) => project.id === sharedProjectId)) {
            return incomingProjects;
        }

        try {
            const { getProjectById } = await import('../db/database');
            const sharedProject = await getProjectById(sharedProjectId);
            if (!sharedProject || !canAccessCompanyProject(user, sharedProject)) {
                return incomingProjects;
            }

            const savedSharedProject = await saveLocal(sharedProject, { source: 'cloud' });
            return [savedSharedProject || sharedProject, ...incomingProjects];
        } catch (err) {
            console.warn('Shared project link recovery failed:', err?.message || err);
            return incomingProjects;
        }
    }, [user?.id]);

    useEffect(() => {
        const currentUserId = user?.id || null;
        if (currentUserId === lastUserIdRef.current) return;

        const previousUserId = lastUserIdRef.current;
        lastUserIdRef.current = currentUserId;

        // Only wipe workspace/modal state on a genuine user change -- logging
        // out (real id -> null) or switching to a different logged-in user
        // (real id -> a different real id). The transition from "auth still
        // resolving" (previousUserId === null, e.g. on first mount before
        // Firebase's onAuthStateChanged/localStorage-cache hydration
        // resolves) to "logged in" is completely normal on every fresh page
        // load, and if it landed a moment after the user had already started
        // interacting with the app -- e.g. opening the New Project wizard and
        // then the AI Drawing Assistant modal -- this fired mid-interaction
        // and silently closed everything back to the dashboard, which looked
        // like the drawing analyzer flashing open and immediately closing.
        if (previousUserId === null) return;

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
            const visibleLocalProjects = await ensureSharedProjectVisible(
                filterVisibleProjects(localProjects)
            );
            if (!cancelled && visibleLocalProjects.length > 0) {
                setProjects(visibleLocalProjects);
            }

            // 2. Background pull from cloud and merge
            const merged = await pullFromCloud();
            if (!cancelled && merged) {
                setProjects(await ensureSharedProjectVisible(filterVisibleProjects(merged)));
            } else if (!cancelled && visibleLocalProjects.length === 0) {
                // If no local data and pull failed, we still load from local (empty)
                // but also try loading from cloud directly for first-time users
                const { getProjects } = await import('../db/database');
                try {
                    const cloudData = await getProjects();
                    const visibleCloudData = await ensureSharedProjectVisible(
                        filterVisibleProjects(cloudData)
                    );
                    if (!cancelled && visibleCloudData.length > 0) {
                        // Save to local DB for next time
                        const cachedCloudProjects = [];
                        for (const p of visibleCloudData) {
                            cachedCloudProjects.push(await saveLocal(p, { source: 'cloud' }) || p);
                        }
                        setProjects(cachedCloudProjects);
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
    }, [ensureSharedProjectVisible, filterVisibleProjects, user?.id]);

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

    useEffect(() => {
        const unsubscribe = onProjectSaveStateChange((projectId, saveMeta) => {
            setProjects((prev) => prev.map((project) => (
                project.id === projectId
                    ? { ...project, saveMeta }
                    : project
            )));
        });
        return unsubscribe;
    }, []);

    // ── Listen for ID changes (when local_ gets a real cloud ID) ──
    useEffect(() => {
        const unsubscribe = onIdChange((oldId, newId) => {
            setProjects(prev => dedupeProjectsByIdentity(prev.map(p =>
                p.id === oldId
                    ? { ...p, id: newId, local_origin_id: p.local_origin_id || oldId }
                    : p
            )));
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
            saveLocal(remoteProject, { source: 'cloud' });
        });

        return () => unsubscribe();
    }, [activeProjectId]);

    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId) || null;
    }, [projects, activeProjectId]);

    useEffect(() => {
        if (!user?.id || hasRestoredWorkspaceRef.current || !projects.length || showSelector || showAnalyzer) return;

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

        const nextAppTab = normalizeAppTab(savedWorkspaceState?.lastAppTab);
        const matchingProject = savedWorkspaceState?.lastProjectId
            ? projects.find((project) => project.id === savedWorkspaceState.lastProjectId)
            : null;

        if (isProjectScopedTab(nextAppTab)) {
            if (!matchingProject) {
                persistWorkspaceState(removeWorkspaceSnapshotProject(savedWorkspaceState, savedWorkspaceState.lastProjectId));
                setActiveProjectId(null);
                setActiveTab('dashboard');
                setFocusMode(false);
                return;
            }

            const projectWorkspaceState = savedWorkspaceState.projects?.[matchingProject.id];
            const nextTab = normalizeProjectTab(projectWorkspaceState?.activeTab || nextAppTab);

            setActiveProjectId(matchingProject.id);
            setActiveTab(nextTab);
            setFocusMode(projectWorkspaceState?.focusMode === true);
            setWorkspaceIntent(null);
            return;
        }

        setActiveProjectId(null);
        setActiveTab(nextAppTab);
        setFocusMode(false);
        setWorkspaceIntent(null);
    }, [cloudWorkspaceReady, cloudWorkspaceState, persistWorkspaceState, projects, readSavedWorkspaceState, showAnalyzer, showSelector, user?.id]);

    const hasActiveProject = useMemo(() => (
        !!activeProjectId && projects.some((project) => project.id === activeProjectId)
    ), [activeProjectId, projects]);

    useEffect(() => {
        if (!user?.id) {
            return;
        }

        const nextAppTab = normalizeAppTab(activeTab);
        const nextProjectId = hasActiveProject ? activeProjectId : null;

        if (isProjectScopedTab(nextAppTab) && !nextProjectId) {
            return;
        }

        const nextFocusMode = shouldPersistFocusMode(nextAppTab) ? focusMode === true : false;
        const nextSignature = `${nextProjectId || 'none'}:${nextAppTab}:${nextFocusMode ? '1' : '0'}`;

        if (lastPersistedWorkspaceSignatureRef.current === nextSignature) {
            return;
        }

        lastPersistedWorkspaceSignatureRef.current = nextSignature;

        persistWorkspaceState(
            buildWorkspaceSnapshot(
                pickPreferredWorkspaceSnapshot(readSavedWorkspaceState(), cloudWorkspaceState),
                {
                    projectId: nextProjectId,
                    activeTab: nextAppTab,
                    focusMode: nextFocusMode
                }
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
    }, [activeProjectId, activeTab, cloudWorkspaceState, focusMode, persistWorkspaceState, projects, readSavedWorkspaceState, user?.id]);

    const calculateTotalValue = useMemo(() => {
        const sumProjectTotal = (project) => {
            if (!project || !project.sections) return 0;
            return project.sections.reduce((acc, section) => {
                if (!section || !section.items) return acc;
                return acc + section.items.reduce((itemAcc, item) => (
                    itemAcc + getItemTotal(item, project.region || 'Lagos')
                ), 0);
            }, 0);
        };

        try {
            if (activeProject) {
                return sumProjectTotal(activeProject);
            }

            if (activeTab === 'dashboard') {
                return projects.reduce((acc, project) => acc + sumProjectTotal(project), 0);
            }

            return 0;
        } catch (err) {
            console.error('calculateTotalValue error:', err);
            return 0;
        }
    }, [activeProject, activeTab, projects]);

    const forceSync = useCallback(async () => {
        await processQueue();
        const merged = await pullFromCloud();
        if (merged) {
            setProjects(filterVisibleProjects(merged));
            toast.success('Synced with cloud!');
        } else {
            toast.info('Already up to date.');
        }
    }, [filterVisibleProjects, toast]);

    const handleCreateProject = () => {
        const limits = PLAN_LIMITS[user?.plan] || PLAN_LIMITS[PLAN_NAMES.STUDENT];
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
        hasRestoredWorkspaceRef.current = true;
        setActiveProjectId(projectId);
        setActiveTab('workspace');
        setFocusMode(true);
        setWorkspaceIntent(intent ? {
            ...intent,
            projectId,
            nonce: Date.now()
        } : null);
    }, []);

    const openDrawingAnalyzer = useCallback(() => {
        hasRestoredWorkspaceRef.current = true;
        setShowSelector(false);
        setShowAnalyzer(true);
    }, []);

    const buildProjectSections = useCallback((sections = [], { unpriced = true, structureType = null, region = 'Lagos' } = {}) => {
        return (sections || []).map((section) => ({
            id: section.id || Math.random().toString(36).substr(2, 9),
            billSectionId: section.billSectionId || section.id || '',
            code: section.code || '',
            title: section.title,
            description: section.description || '',
            isPreliminaries: section.isPreliminaries === true,
            trade: section.trade || section.title || '',
            pickerPrompt: section.pickerPrompt || '',
            emptyStateTitle: section.emptyStateTitle || '',
            emptyStateMessage: section.emptyStateMessage || '',
            keywords: Array.isArray(section.keywords) ? section.keywords : [],
            structureType: section.structureType || structureType || '',
            expanded: section.expanded !== false,
            items: (section.items || []).map((item) => {
                const editableInputs = normalizeEditableInputs(item.editableInputs).map((input) => ({
                    ...input,
                    value: input.value ?? input.defaultValue
                }));
                const exampleInputs = normalizeEditableInputs(item.exampleInputs);
                const formulaRate = evaluateBoqFormulaRate({
                    ...item,
                    editableInputs
                });
                const qty = Number(item.qty ?? item.quantity) || 0;
                const templateRate = Number(item.rate ?? item.unitRate) || 0;
                const templateBenchmark = Number(item.benchmark ?? item.benchmarkRate) || templateRate || 0;
                const shouldAutoRate = !templateBenchmark && (item.defaultFormulaType || 'manual') === 'manual';
                const fallbackAutoRate = shouldAutoRate
                    ? buildAutoRateResult({
                        description: item.description || item.name,
                        unit: item.unit,
                        materials: Array.isArray(item.materials) ? item.materials : [],
                        breakdown: item.breakdown || null
                    }, {
                        structureType,
                        region
                    })
                    : null;
                const seededBenchmark = templateBenchmark || Number(fallbackAutoRate?.benchmark) || 0;
                const seededRate = templateRate || Number(fallbackAutoRate?.rate) || 0;
                const isFormulaDriven = (item.defaultFormulaType || 'manual') !== 'manual' && editableInputs.length > 0;
                const selectedRateSource = resolveItemRateSource(item);
                const formulaCalculatedRate = Number(item.formulaCalculatedRate ?? formulaRate) || 0;
                const manualRate = Number(
                    item.manualRate
                    ?? (
                        selectedRateSource === 'manual'
                            ? (unpriced ? 0 : seededRate)
                            : 0
                    )
                ) || 0;
                const effectiveBenchmarkRate = getEffectiveBenchmarkRate({
                    ...item,
                    benchmark: seededBenchmark,
                    benchmarkRate: seededBenchmark,
                    benchmarkRegionalRates: item.benchmarkRegionalRates || fallbackAutoRate?.benchmarkRegionalRates || null,
                }, region);
                const resolvedUnitRate = selectedRateSource === 'benchmark'
                    ? (Number(effectiveBenchmarkRate) || seededBenchmark)
                    : selectedRateSource === 'formula'
                        ? (formulaCalculatedRate || seededBenchmark)
                        : manualRate;
                const amount = qty * resolvedUnitRate;
                const progressPercent = qty > 0
                    ? ((Number(item.qtyCompleted) || 0) / qty) * 100
                    : 0;
                const benchmarkMetadata = {
                    rate: Number(item.benchmarkMetadata?.rate ?? seededBenchmark) || 0,
                    currency: item.benchmarkMetadata?.currency || 'NGN',
                    region: item.benchmarkMetadata?.region || region || 'Lagos',
                    sourceType: item.benchmarkMetadata?.sourceType || (seededBenchmark > 0 ? 'catalog' : 'manual'),
                    sourceNote: item.benchmarkMetadata?.sourceNote || '',
                    dateCaptured: item.benchmarkMetadata?.dateCaptured || null,
                    confidenceLevel: item.benchmarkMetadata?.confidenceLevel || (seededBenchmark > 0 ? 'medium' : 'low'),
                };
                const legacyRateSource = selectedRateSource === 'manual'
                    && item.rateSource
                    && !['manual', 'benchmark', 'formula'].includes(item.rateSource)
                    ? item.rateSource
                    : selectedRateSource;

                return {
                    id: item.id || Math.random().toString(36).substr(2, 9),
                    catalogItemId: item.catalogItemId || null,
                    code: item.code || item.ref || '',
                    name: item.name || item.description || 'Untitled BOQ Item',
                    description: item.description || item.name || '',
                    unit: item.unit || 'Nr',
                    structureType: item.structureType || structureType || '',
                    billSection: item.billSection || section.billSectionId || section.id || '',
                    billSectionTitle: item.billSectionTitle || section.title || '',
                    defaultFormulaType: item.defaultFormulaType || 'manual',
                    formulaText: item.formulaText || '',
                    formulaBasis: Array.isArray(item.formulaBasis) ? item.formulaBasis : [],
                    formulaExpression: item.formulaExpression || '',
                    exampleInputs,
                    editableInputs,
                    workedExample: item.workedExample || '',
                    category: item.category || section.title || 'General',
                    keywords: Array.isArray(item.keywords) ? item.keywords : [],
                    pickerHint: item.pickerHint || '',
                    isRecommended: item.isRecommended === true,
                    rateSourceOptions: Array.isArray(item.rateSourceOptions) && item.rateSourceOptions.length > 0
                        ? item.rateSourceOptions
                        : ['benchmark', 'formula', 'manual'],
                    quantity: qty,
                    unitRate: resolvedUnitRate,
                    amount,
                    notes: item.notes || '',
                    benchmarkRate: seededBenchmark,
                    qty,
                    rate: resolvedUnitRate,
                    total: amount,
                    benchmark: seededBenchmark,
                    selectedRateSource,
                    formulaCalculatedRate,
                    resolvedUnitRate,
                    manualRate,
                    benchmarkMetadata,
                    benchmarkRegionalRates: item.benchmarkRegionalRates || fallbackAutoRate?.benchmarkRegionalRates || null,
                    benchmarkEvidence: item.benchmarkEvidence || fallbackAutoRate?.benchmarkEvidence || null,
                      benchmarkMatchSource: item.benchmarkMatchSource || fallbackAutoRate?.matchSource || null,
                      useBenchmark: selectedRateSource === 'benchmark',
                      rateSource: legacyRateSource || (isFormulaDriven ? 'formula' : 'manual'),
                      qtySource: item.qtySource || 'manual',
                      takeoffMeta: item.takeoffMeta || null,
                      subcategory: item.subcategory || section.title || '',
                      materials: Array.isArray(item.materials) ? item.materials : [],
                    isVO: item.isVO === true,
                    breakdown: item.breakdown || fallbackAutoRate?.breakdown || null,
                    customPricing: item.customPricing || null,
                    qtyCompleted: Number(item.qtyCompleted) || 0,
                    progressPercent,
                    bids: Array.isArray(item.bids) ? item.bids : [],
                    isAnalyzed: item.isAnalyzed === true
                };
            })
        }));
    }, []);

    const handleStructureSelect = async (structureId, structureName, manualSections = null) => {
        if (structureId === 'ai-analysis') {
            openDrawingAnalyzer();
            return;
        }

        let sectionsToProcess = manualSections;

        if (!sectionsToProcess) {
            const definition = getStructureDefinition(structureId);
            sectionsToProcess = definition
                ? createProjectSectionsFromStructure(structureId)
                : null;
        }

        if (!sectionsToProcess) {
            toast.error('Could not find components for this structure type.');
            return;
        }

        const processedSections = buildProjectSections(sectionsToProcess, {
            structureType: structureName || structureId,
            region: DEFAULT_NIGERIA_LOCATION
        });

        const projectId = `local_${Date.now()}`;
        const newProj = {
            id: projectId,
            name: `${structureName || structureId} Project`,
            type: structureId,
            structureType: structureId,
            status: 'Active',
            sections: processedSections,
            date: new Date().toISOString().split('T')[0],
            region: DEFAULT_NIGERIA_LOCATION,
            currency: DEFAULT_CURRENCY_CODE,
            pricingMode: 'user-entered'
        };

        setIsCreating(true);
        try {
            // 1. Save locally (instant)
            const savedProject = await saveLocal(newProj, { source: 'user' });

            // 2. Update UI immediately
            setProjects(prev => [savedProject, ...prev]);
            setShowSelector(false);
            openWorkspace(savedProject.id);

            toast.success('Project created!');

            // 3. Background cloud sync + activity log
            syncToCloud(savedProject);
            logActivity(savedProject.id, 'project_created', { name: savedProject.name, type: savedProject.type });
        } catch (err) {
            console.error('❌ Create project failed:', err);
            toast.error('Error creating project.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCompleteWizard = async (projectConfig) => {
        const structureTypeLabel = projectConfig.structureType || projectConfig.type;
        const baseSections = projectConfig.projectMode === 'structure-based'
            ? createProjectSectionsFromStructure(structureTypeLabel, projectConfig.selectedSectionIds)
            : (projectConfig.sections || []);
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
        const processedSections = buildProjectSections(baseSections, {
            unpriced: isUnpricedTemplate,
            structureType: structureTypeLabel,
            region: projectConfig.region || DEFAULT_NIGERIA_LOCATION
        });

        const projectId = `local_${Date.now()}`;
        const selectedCatalogItemIdsBySection = Object.fromEntries(
            processedSections.map((section) => ([
                section.id,
                Array.from(new Set((section.items || []).map((item) => item.catalogItemId).filter(Boolean)))
            ]))
        );
        const newProj = {
            id: projectId,
            name: projectConfig.name || `${structureTypeLabel} Project`,
            clientName: projectConfig.clientName || '',
            type: structureTypeLabel,
            structureType: structureTypeLabel,
            subtype: projectConfig.subtype,
            projectMode: projectConfig.projectMode || 'default',
            access_mode: isCustomMode ? 'company' : 'private',
            company_name,
            company_key,
            share_enabled: isCustomMode,
            collaboration_enabled: isCustomMode,
            status: 'Active',
            sections: processedSections,
            date: new Date().toISOString().split('T')[0],
            region: projectConfig.region || DEFAULT_NIGERIA_LOCATION,
            currency: projectConfig.currency || DEFAULT_CURRENCY_CODE,
            fxRateToNgn: Number(projectConfig.fxRateToNgn) || null,
            notes: projectConfig.notes || '',
            assumptions: projectConfig.assumptions || '',
            exclusions: projectConfig.exclusions || '',
            customSectionCount: Number(projectConfig.customSectionCount) || 0,
            customItemCount: Number(projectConfig.customItemCount) || 0,
            pricingMode: isUnpricedTemplate ? 'user-entered' : 'template-rates',
            boqCatalogVersion: 'structure-based-boq-v1',
            boqBuilder: {
                stage: projectConfig.projectMode === 'structure-based' ? 'selection' : 'workspace',
                activeBillSectionId: processedSections[0]?.id || null,
                selectedCatalogItemIdsBySection,
                generatedAt: null,
            },
            preparedBy: user?.displayName || user?.email || 'Engineer',
            checkedBy: ''
        };

        setIsCreating(true);
        try {
            const savedProject = await saveLocal(newProj, { source: 'user' });
            setProjects(prev => [savedProject, ...prev]);
            setShowSelector(false);
            openWorkspace(savedProject.id);
            toast.success('Project created successfully!');
            syncToCloud(savedProject);
            logActivity(savedProject.id, 'project_created', { name: savedProject.name, type: savedProject.type });
        } catch (err) {
            console.error('❌ Create wizard project failed:', err);
            toast.error('Error creating project.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleAnalysisComplete = useCallback(async (elements) => {
        // Elements from processEngineeringDrawing are shaped
        // {category, item, description, quantity, structuralDetails} per the
        // AI prompt (see api/_lib/ai-provider.js). This previously assumed a
        // different, hardcoded-fallback-only shape ({title}) and discarded
        // the real identified data entirely, substituting 3 randomly
        // generated placeholder items per element -- meaning even a
        // perfectly correct AI read of the drawing never actually reached
        // the project. Group by category into sections and use the real
        // item/quantity data instead.
        const sectionsByCategory = new Map();

        (elements || []).forEach((el) => {
            const category = el.category || 'Identified Elements';
            if (!sectionsByCategory.has(category)) {
                sectionsByCategory.set(category, {
                    id: Math.random().toString(36).substr(2, 9),
                    title: category,
                    expanded: true,
                    items: [],
                });
            }

            // Quantity from the AI isn't guaranteed to be a bare number (e.g.
            // could be "12.5 m³") -- extract the leading numeric value and
            // treat anything left over as the unit, defensively.
            const quantityText = String(el.quantity ?? '').trim();
            const quantityMatch = quantityText.match(/-?[\d,]*\.?\d+/);
            const qty = quantityMatch ? Number(quantityMatch[0].replace(/,/g, '')) : 0;
            const unitFromQuantity = quantityMatch
                ? quantityText.slice(quantityMatch.index + quantityMatch[0].length).trim()
                : '';

            sectionsByCategory.get(category).items.push({
                id: Math.random().toString(36).substr(2, 9),
                description: el.item || el.description || 'Identified element',
                subcategory: (el.item && el.description) ? el.description : '',
                materials: [],
                unit: unitFromQuantity || 'unit',
                qty: Number.isFinite(qty) ? qty : 0,
                rate: 0,
                total: 0,
                isAnalyzed: true,
                takeoffMeta: {
                    source: 'ai-drawing-analysis',
                    structuralDetails: el.structuralDetails || null,
                },
            });
        });

        const analyzedSections = Array.from(sectionsByCategory.values());

        const projectId = `local_${Date.now()}`;
        const newProj = {
            id: projectId,
            name: `AI Draft: ${new Date().toISOString().split('T')[0]}`,
            type: 'AI Drawing Analysis',
            status: 'Draft',
            sections: analyzedSections,
            date: new Date().toISOString().split('T')[0],
            region: DEFAULT_NIGERIA_LOCATION,
            currency: DEFAULT_CURRENCY_CODE,
            pricingMode: 'user-entered'
        };

        try {
            const savedProject = await saveLocal(newProj, { source: 'user' });
            setProjects(prev => [savedProject, ...prev]);
            setShowAnalyzer(false);
            openWorkspace(savedProject.id);
            syncToCloud(savedProject);
        } catch (err) {
            console.error('Error creating project from analysis:', err);
        }
    }, [openWorkspace]);

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
            const savedProject = await saveLocal(updatedProject, { source: 'user' });
            setProjects(prev => prev.map((project) => (
                project.id === savedProject.id ? savedProject : project
            )));
            // 3. Background cloud sync (debounced) + activity log
            syncToCloud(savedProject);
            logActivity(projectId, 'project_updated', { region: savedProject.region });
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
            date: new Date().toISOString().split('T')[0],
            region: 'Lagos',
            pricingMode: 'user-entered'
        };

        try {
            const savedProject = await saveLocal(quickTestProject, { source: 'user' });
            setProjects((prev) => [savedProject, ...prev]);
            openWorkspace(savedProject.id, {
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
        openWorkspace,
        openDrawingAnalyzer,
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
