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

        const projectData = {
            name: project.name,
            type: project.type,
            status: project.status || 'Draft',
            date: project.date,
            region: project.region || 'Lagos',
            user_id: user.uid,
            sections: JSON.parse(JSON.stringify(project.sections || [])),
            collaborators: project.collaborators || [],
            updated_at: serverTimestamp()
        };

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

        // Fetch own projects
        const ownQuery = query(
            collection(db, 'projects'),
            where('user_id', '==', user.uid),
            orderBy('created_at', 'desc')
        );
        const ownSnapshot = await getDocs(ownQuery);
        const ownProjects = ownSnapshot.docs.map(d => ({ id: d.id, ...d.data(), isOwner: true }));

        // Fetch shared projects (where user's email is in collaborators)
        let sharedProjects = [];
        try {
            const allProjectsQuery = query(collection(db, 'projects'));
            const allSnapshot = await getDocs(allProjectsQuery);
            sharedProjects = allSnapshot.docs
                .filter(d => {
                    const data = d.data();
                    if (data.user_id === user.uid) return false; // Skip own
                    const collabs = data.collaborators || [];
                    return collabs.some(c => c.email === user.email?.toLowerCase());
                })
                .map(d => ({ id: d.id, ...d.data(), isOwner: false }));
        } catch (sharedErr) {
            console.warn('Could not fetch shared projects:', sharedErr.message);
        }

        return [...ownProjects, ...sharedProjects];
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
        await deleteDoc(doc(db, 'projects', id));
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

// ─────────────────────────────────────────────────────────────────────────────
// Global Market Data
// ─────────────────────────────────────────────────────────────────────────────
export const getMaterials = async () => {
    try {
        const snapshot = await getDocs(query(collection(db, 'materials'), orderBy('name')));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('Error fetching materials:', err);
        return [];
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
