import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { STRUCTURE_DATA } from '../data/structures';
import { PLAN_LIMITS, PLAN_NAMES } from '../data/plans';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/ToastContext';
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

const ProjectsContext = createContext(null);

export function useProjects() {
    const ctx = useContext(ProjectsContext);
    if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider');
    return ctx;
}

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
    const [syncStatus, setSyncStatus] = useState({ state: 'synced' });
    const lastRemoteUpdate = useRef(0);

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
            if (!cancelled && localProjects.length > 0) {
                setProjects(localProjects);
            }

            // 2. Background pull from cloud and merge
            const merged = await pullFromCloud();
            if (!cancelled && merged) {
                setProjects(merged);
            } else if (!cancelled && localProjects.length === 0) {
                // If no local data and pull failed, we still load from local (empty)
                // but also try loading from cloud directly for first-time users
                const { getProjects } = await import('../db/database');
                try {
                    const cloudData = await getProjects();
                    if (!cancelled && cloudData.length > 0) {
                        // Save to local DB for next time
                        for (const p of cloudData) {
                            await saveLocal(p);
                        }
                        setProjects(cloudData);
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
    }, [user]);

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
            setProjects(merged);
            toast.success('Synced with cloud!');
        }
        await processQueue();
    }, [toast]);

    const handleCreateProject = () => {
        const limits = PLAN_LIMITS[user?.plan] || PLAN_LIMITS[PLAN_NAMES.FREE];
        if (projects.length >= limits.maxProjects) {
            setView('pricing');
            return;
        }
        setShowSelector(true);
    };

    const handleStructureSelect = async (structureId, structureName) => {
        if (structureId === 'ai-analysis') {
            setShowSelector(false);
            setShowAnalyzer(true);
            return;
        }

        const data = STRUCTURE_DATA[structureId] || STRUCTURE_DATA['Residential Building'];

        if (!data || !data.sections) {
            toast.error('Could not find components for this structure type.');
            return;
        }

        const processedSections = data.sections.map(section => ({
            id: Math.random().toString(36).substr(2, 9),
            title: section.title,
            expanded: true,
            items: section.items.map(item => ({
                id: Math.random().toString(36).substr(2, 9),
                description: item.description,
                unit: item.unit,
                qty: item.qty,
                rate: 0,
                benchmark: item.benchmark || 0,
                useBenchmark: false,
                total: 0,
                isVO: false,
                breakdown: item.breakdown || null
            }))
        }));

        const projectId = `local_${Date.now()}`;
        const newProj = {
            id: projectId,
            name: `${structureName || structureId} Project`,
            type: structureId,
            status: 'Active',
            sections: processedSections,
            date: new Date().toLocaleDateString(),
            region: 'Lagos'
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

    const handleAnalysisComplete = async (elements) => {
        const analyzedSections = elements.map(el => ({
            id: Math.random().toString(36).substr(2, 9),
            title: el.title,
            expanded: true,
            items: Array.from({ length: 3 }).map((_, idx) => ({
                id: Math.random().toString(36).substr(2, 9),
                description: `Identified Component ${idx + 1} from ${el.title}`,
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

    const handleUpdateProject = async (projectId, updatedSections, region = null) => {
        // 1. Optimistic UI update
        let updatedProject = null;
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            updatedProject = {
                ...p,
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
        calculateTotalValue,
        syncStatus,
        forceSync,
        handleCreateProject,
        handleStructureSelect,
        handleAnalysisComplete,
        handleUpdateProject,
        handleAddSection,
        handleDeleteSectionOrItem,
        handleDeleteProject,
    };

    return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
