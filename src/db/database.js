import { db, auth } from './firebase';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { buildCompanyKey, deriveCompanyName } from '../utils/companyAccess';
import { getSeedMaterials } from './seed_materials';
import { buildMaterialBenchmarkPayload, normalizeMaterialBenchmarkRecord } from '../utils/materialBenchmarks';

/**
 * Strip heavy, reconstructable fields from a single BOQ item before cloud upload.
 * Keeps all pricing summary fields but removes large nested arrays that can be
 * regenerated locally from rateBreakdowns.js.
 */
const stripItemForCloud = (item) => {
    if (!item || typeof item !== 'object') return item;

    // Slim down customPricing: keep summary numbers, drop full material/labor/plant arrays
    let cloudCustomPricing = null;
    if (item.customPricing) {
        const cp = item.customPricing;
        cloudCustomPricing = {
            workType: cp.workType || null,
            materialsCost: cp.materialsCost ?? null,
            labourCost: cp.labourCost ?? null,
            plantCost: cp.plantCost ?? null,
            transportCost: cp.transportCost ?? null,
            wastePercent: cp.wastePercent ?? null,
            siteAdjustmentPercent: cp.siteAdjustmentPercent ?? null,
            overheadsPercent: cp.overheadsPercent ?? cp.overheads ?? null,
            profitPercent: cp.profitPercent ?? cp.profit ?? null,
            roundingStep: cp.roundingStep ?? null,
            pricingReference: cp.pricingReference || null,
            supplierQuote: cp.supplierQuote || null,
            notes: cp.notes || null,
            materialsUsed: cp.materialsUsed || null,
            labourUsed: cp.labourUsed || null,
            plantUsed: cp.plantUsed || null,
            transportUsed: cp.transportUsed || null,
            otherAllowances: cp.otherAllowances || null,
            benchmarkRate: cp.benchmarkRate ?? null,
            rawRate: cp.rawRate ?? null,
            finalRate: cp.finalRate ?? null,
            // keep these lightweight flags if present
            pricingMode: cp.pricingMode || null,
            region: cp.region || null,
            savedAt: cp.savedAt || null,
        };
    }

    return {
        // Core identity & measurement
        id: item.id,
        catalogItemId: item.catalogItemId || null,
        code: item.code || item.ref || null,
        name: item.name || null,
        ref: item.ref || null,
        description: item.description || '',
        unit: item.unit || '',
        structureType: item.structureType || null,
        billSection: item.billSection || null,
        billSectionTitle: item.billSectionTitle || null,
        defaultFormulaType: item.defaultFormulaType || 'manual',
        formulaText: item.formulaText || null,
        formulaBasis: Array.isArray(item.formulaBasis) ? item.formulaBasis : [],
        formulaExpression: item.formulaExpression || null,
        exampleInputs: Array.isArray(item.exampleInputs) ? item.exampleInputs : [],
        editableInputs: Array.isArray(item.editableInputs) ? item.editableInputs : [],
        workedExample: item.workedExample || null,
        category: item.category || null,
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        pickerHint: item.pickerHint || null,
        isRecommended: item.isRecommended === true,
        rateSourceOptions: Array.isArray(item.rateSourceOptions) ? item.rateSourceOptions : [],
        quantity: item.quantity ?? item.qty ?? 0,
        unitRate: item.unitRate ?? item.rate ?? 0,
        amount: item.amount ?? item.total ?? 0,
        qty: item.qty ?? 0,
        qtyCompleted: item.qtyCompleted ?? 0,
        progressPercent: item.progressPercent ?? 0,
        subcategory: item.subcategory || null,
        materials: Array.isArray(item.materials) ? item.materials : [],

        // Pricing outputs (always needed)
        rate: item.rate ?? 0,
        total: item.total ?? 0,
        rateSource: item.rateSource || null,
        selectedRateSource: item.selectedRateSource || null,
        formulaCalculatedRate: item.formulaCalculatedRate ?? null,
        resolvedUnitRate: item.resolvedUnitRate ?? null,
        manualRate: item.manualRate ?? null,

        // Benchmark data (computed, compact)
        useBenchmark: item.useBenchmark ?? false,
        benchmark: item.benchmark ?? 0,
        benchmarkRate: item.benchmarkRate ?? item.benchmark ?? 0,
        benchmarkMetadata: item.benchmarkMetadata || null,
        benchmarkRegionalRates: item.benchmarkRegionalRates || null,
        benchmarkEvidence: item.benchmarkEvidence || null,
        benchmarkMatchSource: item.benchmarkMatchSource || null,

        // Custom pricing summary only — no arrays
        customPricing: cloudCustomPricing,

        // VO / notes flags
        isVO: item.isVO ?? false,
        notes: item.notes || null,
        bids: Array.isArray(item.bids) ? item.bids : [],

        // breakdown is intentionally NOT included — reconstructed locally
        // customPricingHistory is NOT included — stored locally only
    };
};

const sanitizeProjectForCloud = (project, user) => {
    const clone = JSON.parse(JSON.stringify(project || {}));
    const originalId = clone.id;

    delete clone.id;
    delete clone.userId;
    delete clone.updatedAt;
    delete clone.isOwner;

    const company_name = clone.company_name || deriveCompanyName({
        companyName: clone.company_name,
        email: user?.email
    });
    const company_key = clone.company_key || buildCompanyKey({
        companyKey: clone.company_key,
        companyName: company_name,
        email: user?.email
    });

    // Strip each item in each section down to cloud-safe fields
    const cloudSections = (clone.sections || []).map(section => ({
        id: section.id,
        billSectionId: section.billSectionId || null,
        code: section.code || null,
        title: section.title || '',
        description: section.description || null,
        isPreliminaries: section.isPreliminaries === true,
        trade: section.trade || null,
        pickerPrompt: section.pickerPrompt || null,
        emptyStateTitle: section.emptyStateTitle || null,
        emptyStateMessage: section.emptyStateMessage || null,
        keywords: Array.isArray(section.keywords) ? section.keywords : [],
        structureType: section.structureType || null,
        collapsed: section.collapsed ?? false,
        items: (section.items || []).map(stripItemForCloud),
    }));

    // Flat collaborator email array for array-contains queries
    const collaborators = clone.collaborators || [];
    const collaborator_ids = Array.from(new Set(
        collaborators
            .map(c => c.email?.toLowerCase())
            .filter(Boolean)
    ));

    return {
        name: clone.name,
        type: clone.type,
        structureType: clone.structureType || clone.type,
        subtype: clone.subtype || null,
        status: clone.status || 'Draft',
        date: clone.date,
        region: clone.region || 'Lagos',
        clientName: clone.clientName || null,
        user_id: clone.user_id || user.uid,
        company_name,
        company_key,
        local_origin_id: clone.local_origin_id || (String(originalId || '').startsWith('local_') ? originalId : null),
        projectMode: clone.projectMode || 'default',
        access_mode: clone.access_mode || (clone.projectMode === 'custom' ? 'company' : 'private'),
        notes: clone.notes || null,
        assumptions: clone.assumptions || null,
        exclusions: clone.exclusions || null,
        pricingMode: clone.pricingMode || null,
        boqCatalogVersion: clone.boqCatalogVersion || null,
        customSectionCount: clone.customSectionCount ?? 0,
        customItemCount: clone.customItemCount ?? 0,
        share_enabled: clone.share_enabled ?? false,
        collaboration_enabled: clone.collaboration_enabled ?? false,
        preparedBy: clone.preparedBy || null,
        checkedBy: clone.checkedBy || null,
        sections: cloudSections,
        collaborators,
        collaborator_ids,
        updated_at: serverTimestamp()
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// Projects Management
// ─────────────────────────────────────────────────────────────────────────────
export const saveProject = async (project) => {
    try {
        const user = auth.currentUser;
        console.log('💾 Attempting to save project:', { 
            projectId: project.id, 
            userId: user?.uid,
            is_authenticated: !!user 
        });

        if (!user) {
            console.error('saveProject: No authenticated user found');
            return null;
        }

        const projectData = sanitizeProjectForCloud(project, user);

        if (project.id && !project.id.startsWith('local_')) {
            // Update existing project
            const docRef = doc(db, 'projects', project.id);
            await updateDoc(docRef, projectData);
            console.log('✅ Project updated, ID:', project.id);
            return project.id;
        } else {
            // Create new project
            projectData.created_at = serverTimestamp();
            const docRef = await addDoc(collection(db, 'projects'), projectData);
            console.log('✅ Project saved, ID:', docRef.id);
            return docRef.id;
        }
    } catch (err) {
        console.error('❌ saveProject error:', err.message);
        return null;
    }
};

export const getProjects = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const profile = await getProfile(user.uid);
        const companyKey = buildCompanyKey({
            companyKey: profile?.company_key,
            companyName: profile?.company_name,
            email: user.email
        });

        // Fetch own projects
        const ownQuery = query(
            collection(db, 'projects'),
            where('user_id', '==', user.uid),
            orderBy('created_at', 'desc')
        );
        const ownSnapshot = await getDocs(ownQuery);
        const ownProjects = ownSnapshot.docs.map(d => ({ id: d.id, ...d.data(), isOwner: true }));

        let companyProjects = [];
        if (companyKey) {
            try {
                const companyQuery = query(
                    collection(db, 'projects'),
                    where('company_key', '==', companyKey)
                );
                const companySnapshot = await getDocs(companyQuery);
                companyProjects = companySnapshot.docs
                    .map(d => ({ id: d.id, ...d.data(), isOwner: d.data().user_id === user.uid }))
                    .filter(project => project.user_id !== user.uid)
                    .filter(project => project.projectMode === 'custom' && project.access_mode === 'company');
            } catch (companyErr) {
                console.warn('Could not fetch company projects:', companyErr.message);
            }
        }

        // Fetch shared projects: use array-contains on collaborator_ids — O(shared) not O(all)
        let sharedProjects = [];
        try {
            const sharedQuery = query(
                collection(db, 'projects'),
                where('collaborator_ids', 'array-contains', user.email.toLowerCase())
            );
            const sharedSnapshot = await getDocs(sharedQuery);
            sharedProjects = sharedSnapshot.docs
                .filter(d => d.data().user_id !== user.uid) // skip own projects
                .map(d => ({ id: d.id, ...d.data(), isOwner: false }));
        } catch (sharedErr) {
            console.warn('Could not fetch shared projects:', sharedErr.message);
        }

        const merged = [...ownProjects, ...companyProjects, ...sharedProjects];
        const uniqueProjects = [];
        const seen = new Set();

        for (const project of merged) {
            if (seen.has(project.id)) continue;
            seen.add(project.id);
            uniqueProjects.push(project);
        }

        return uniqueProjects;
    } catch (err) {
        console.error('Error fetching projects:', err);
        return [];
    }
};

export const getProjectById = async (id) => {
    try {
        const docRef = doc(db, 'projects', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }
        return null;
    } catch (err) {
        console.error('Error fetching project:', err);
        return null;
    }
};

export const deleteProject = async (id) => {
    try {
        const user = auth.currentUser;
        if (!user) return false;

        const docRef = doc(db, 'projects', id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            return true;
        }

        const project = snapshot.data();
        if (project?.user_id && project.user_id !== user.uid) {
            console.warn('Delete blocked for non-owner project:', id);
            return false;
        }

        await deleteDoc(docRef);
        return true;
    } catch (err) {
        console.error('Error deleting project:', err);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings Management
// ─────────────────────────────────────────────────────────────────────────────
export const saveSetting = async (key, value) => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const settingId = `${user.uid}_${key}`;
        await setDoc(doc(db, 'settings', settingId), {
            user_id: user.uid,
            key,
            value,
            updated_at: serverTimestamp()
        });
        return { key, value };
    } catch (err) {
        console.error('Error saving setting:', err);
        return null;
    }
};

export const getSetting = async (key) => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const settingId = `${user.uid}_${key}`;
        const snapshot = await getDoc(doc(db, 'settings', settingId));
        if (snapshot.exists()) {
            return snapshot.data().value;
        }
        return null;
    } catch {
        return null;
    }
};

const WORKSPACE_STATE_SETTING_KEY = 'workspace_state_v1';

export const saveWorkspaceState = async (workspaceState) => {
    return saveSetting(WORKSPACE_STATE_SETTING_KEY, workspaceState);
};

export const getWorkspaceState = async () => {
    return getSetting(WORKSPACE_STATE_SETTING_KEY);
};

// ─────────────────────────────────────────────────────────────────────────────
// Global Market Data
// ─────────────────────────────────────────────────────────────────────────────
export const getMaterials = async () => {
    try {
        const snapshot = await getDocs(query(collection(db, 'materials'), orderBy('name')));
        const materials = snapshot.docs.map(d => normalizeMaterialBenchmarkRecord({ id: d.id, ...d.data() }));
        return materials.length > 0 ? materials : getSeedMaterials();
    } catch (err) {
        console.error('Error fetching materials:', err);
        return getSeedMaterials();
    }
};

export const addMaterial = async (materialData) => {
    try {
        const payload = buildMaterialBenchmarkPayload(materialData);
        const docRef = await addDoc(collection(db, 'materials'), {
            ...payload,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });
        return normalizeMaterialBenchmarkRecord({ id: docRef.id, ...payload });
    } catch (err) {
        console.error('Error adding material:', err);
        throw err;
    }
};

export const updateMaterial = async (id, updates) => {
    try {
        const docRef = doc(db, 'materials', id);
        const payload = buildMaterialBenchmarkPayload(updates);
        await updateDoc(docRef, { ...payload, updated_at: serverTimestamp() });
        return normalizeMaterialBenchmarkRecord({ id, ...payload });
    } catch (err) {
        console.error('Error updating material:', err);
        throw err;
    }
};

export const deleteMaterial = async (id) => {
    try {
        await deleteDoc(doc(db, 'materials', id));
        return true;
    } catch (err) {
        console.error('Error deleting material:', err);
        throw err;
    }
};

export const getMarketIndices = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'market_indices'));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('Error fetching market indices:', err);
        return [];
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// User Profile Management
// ─────────────────────────────────────────────────────────────────────────────
export const getProfile = async (userId = null) => {
    try {
        const targetId = userId || auth.currentUser?.uid;
        if (!targetId) return null;

        const snapshot = await getDoc(doc(db, 'profiles', targetId));
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }
        return null;
    } catch (err) {
        console.error('Error fetching profile:', err);
        return null;
    }
};

export const updateProfile = async (updates) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.warn('⚠️ No user in updateProfile');
            return null;
        }

        const profileRef = doc(db, 'profiles', user.uid);
        const snapshot = await getDoc(profileRef);

        if (snapshot.exists()) {
            await updateDoc(profileRef, { ...updates, updated_at: serverTimestamp() });
        } else {
            await setDoc(profileRef, {
                ...updates,
                email: user.email,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });
        }

        const updated = await getDoc(profileRef);
        return { id: updated.id, ...updated.data() };
    } catch (err) {
        console.error('❌ updateProfile error:', err.message);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Market Data Seeding (for Settings page)
// ─────────────────────────────────────────────────────────────────────────────
export const seedMarketData = async () => {
    try {
        const { seedMarketData: seedFn } = await import('./seed_materials');
        return await seedFn();
    } catch (err) {
        console.error('Seeding failed:', err);
        return { error: err.message };
    }
};

// Legacy compatibility
export const getUserByEmail = async () => null;
export const verifyPassword = async () => true;
