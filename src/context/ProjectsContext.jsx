import React, { createContext, useContext, useState, useMemo } from 'react';
import { saveProject, getProjects, deleteProject } from '../db/database';
import { STRUCTURE_DATA } from '../data/structures';
import { PLAN_LIMITS, PLAN_NAMES } from '../data/plans';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/ToastContext';

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

    // Load projects from Firebase when user is set
    React.useEffect(() => {
        if (user) {
            const loadData = async () => {
                const storedProjects = await getProjects();
                setProjects(storedProjects);
            };
            loadData();
        }
    }, [user]);

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

        console.log('Selected structure:', structureId);
        const data = STRUCTURE_DATA[structureId] || STRUCTURE_DATA['Residential Building'];

        if (!data) {
            console.error('❌ CRITICAL: No data found for structureId:', structureId);
            toast.error('Could not find components for this structure type.');
            return;
        }

        if (!data.sections) {
            console.error('❌ CRITICAL: Data found but contains no sections:', data);
            toast.error('This structure type has no predefined sections.');
            return;
        }

        console.log('✅ Structure metadata found:', {
            structureId,
            sectionCount: data.sections.length,
            sectionNames: data.sections.map(s => s.title)
        });

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

        const newProj = {
            name: `${structureName || structureId} Project`,
            type: structureId,
            status: 'Active',
            sections: processedSections,
            date: new Date().toLocaleDateString(),
            region: 'Lagos'
        };

        console.log('🚀 FINAL NEW PROJECT OBJECT:', newProj);

        setIsCreating(true);
        try {
            const savedId = await saveProject(newProj);
            const projectId = savedId || `local_${Date.now()}`;
            const finalProj = { ...newProj, id: projectId };

            if (!savedId) {
                console.warn('⚠️ Project saved locally only (DB save failed). ID:', projectId);
                toast.warning('Project saved locally only. Cloud sync unavailable.');
            } else {
                console.log('💾 Project saved to database, ID:', savedId);
                toast.success('Project created successfully!');
            }

            setProjects(prev => [finalProj, ...prev]);
            setActiveProjectId(projectId);
            setShowSelector(false);
            setActiveTab('workspace');
            setFocusMode(true);

            if (savedId) {
                getProjects().then(updated => {
                    if (updated.length > 0) setProjects(updated);
                });
            }
        } catch (dbError) {
            console.error('❌ Database operation failed during structure selection:', dbError);
            toast.error('Database error. Project saved locally as fallback.');

            const localId = `local_${Date.now()}`;
            const fallbackProj = { ...newProj, id: localId };

            setProjects(prev => [fallbackProj, ...prev]);
            setActiveProjectId(localId);
            setShowSelector(false);
            setActiveTab('workspace');
            setFocusMode(true);
        } finally {
            setIsCreating(false);
        }
    };

    const handleAnalysisComplete = async (elements) => {
        console.log('Analysis complete, elements:', elements);

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

        const newProj = {
            name: `AI Draft: ${new Date().toLocaleDateString()}`,
            type: 'AI Drawing Analysis',
            status: 'Draft',
            sections: analyzedSections,
            date: new Date().toLocaleDateString()
        };

        try {
            const savedId = await saveProject(newProj);
            const projectId = savedId || `local_${Date.now()}`;
            const finalProj = { ...newProj, id: projectId };

            setProjects(prev => [finalProj, ...prev]);
            setActiveProjectId(projectId);
            setShowAnalyzer(false);
            setActiveTab('workspace');
            setFocusMode(true);

            if (savedId) {
                getProjects().then(updated => setProjects(updated));
            }
        } catch (err) {
            console.error('Error creating project from analysis:', err);
        }
    };

    const handleUpdateProject = async (projectId, updatedSections, region = null) => {
        // 1. OPTIMISTIC UPDATE
        setProjects(prev => prev.map(p =>
            p.id === projectId ? {
                ...p,
                sections: updatedSections,
                region: region || p.region || 'Lagos'
            } : p
        ));

        // 2. BACKGROUND SAVE
        const currentProject = projects.find(p => p.id === projectId);
        saveProject({
            id: projectId,
            sections: updatedSections,
            region: region || currentProject?.region || 'Lagos'
        }).catch(err => {
            console.error('❌ Background save failed:', err);
        });
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
        const success = await deleteProject(projectId);
        if (success) {
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (activeProjectId === projectId) {
                setActiveProjectId(null);
                setActiveTab('dashboard');
            }
            toast.success('Project deleted successfully.');
        } else {
            toast.error('Failed to delete project. Please try again.');
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
