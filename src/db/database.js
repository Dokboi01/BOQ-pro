import { supabase } from './supabase';

// Projects Management
export const saveProject = async (project) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('saveProject: No authenticated user found');
            return null;
        }

        // Prepare project data - ensure sections is serializable
        const projectData = {
            name: project.name,
            type: project.type,
            status: project.status || 'Draft',
            date: project.date,
            user_id: user.id,
            // Sections must be stored as JSONB - ensure it's a plain object
            sections: JSON.parse(JSON.stringify(project.sections || []))
        };

        // If project has an ID, include it for upsert
        if (project.id) {
            projectData.id = project.id;
        }

        console.log('💾 Saving project:', projectData.name, 'with', projectData.sections?.length, 'sections');

        const { data, error } = await supabase
            .from('projects')
            .upsert(projectData)
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase save error:', error.message, error.details, error.hint);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            return null;
        }

        console.log('✅ Project saved successfully, ID:', data.id);
        return data.id;
    } catch (err) {
        console.error('❌ saveProject exception:', err.message);
        return null;
    }
};

export const getProjects = async () => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
    return data;
};

export const getProjectById = async (id) => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching project:', error);
        return null;
    }
    return data;
};

export const deleteProject = async (id) => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting project:', error);
        return false;
    }
    return true;
};

// Settings Management
export const saveSetting = async (key, value) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('settings')
        .upsert({ user_id: user.id, key, value }, { onConflict: 'user_id, key' })
        .select()
        .single();

    if (error) {
        console.error('Error saving setting:', error);
        return null;
    }
    return data;
};

export const getSetting = async (key) => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        // Not always an error if it doesn't exist
        return null;
    }
    return data.value;
};

// Global Market Data
export const getMaterials = async () => {
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching materials:', error);
        return [];
    }
    return data;
};

export const getMarketIndices = async () => {
    const { data, error } = await supabase
        .from('market_indices')
        .select('*');

    if (error) {
        console.error('Error fetching market indices:', error);
        return [];
    }
    return data;
};

// User Profile Management (Supabase Auth handles the core, we use 'profiles' table for metadata)
export const getProfile = async (userId = null) => {
    let targetId = userId;

    if (!targetId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        targetId = user.id;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
};

export const updateProfile = async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        return null;
    }
    return data;
};

// Legacy compatibility (to avoid breaking App.jsx immediately)
export const getUserByEmail = async (email) => {
    // In Supabase, we usually get the current user, not search by email for others
    // This is just a placeholder for now
    const { data } = await supabase.from('profiles').select('*').eq('email', email).single();
    return data;
};

export const verifyPassword = async () => true; // Supabase Auth handles this
