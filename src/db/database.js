import Dexie from 'dexie';
import bcrypt from 'bcryptjs';

export const db = new Dexie('BOQProDB');

db.version(2).stores({
    projects: '++id, name, type, status, date',
    settings: 'key, value',
    users: '++id, &email, fullName, password, plan, isVerified, verificationCode'
});

export const saveProject = async (project) => {
    return await db.projects.put(project);
};

// Settings Management
export const saveSetting = async (key, value) => {
    return await db.settings.put({ key, value });
};

export const getSetting = async (key) => {
    const setting = await db.settings.get(key);
    return setting ? setting.value : null;
};

export const getProjects = async () => {
    return await db.projects.toArray();
};

export const deleteProject = async (id) => {
    return await db.projects.delete(id);
};

export const getProjectById = async (id) => {
    return await db.projects.get(id);
};

// User Management
export const addUser = async (user) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    return await db.users.add({ ...user, password: hashedPassword });
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

export const verifyUser = async (email, code) => {
    const user = await db.users.get({ email });
    if (user && user.verificationCode === code) {
        await db.users.update(user.id, { isVerified: true });
        return true;
    }
    return false;
};

export const getUserByEmail = async (email) => {
    return await db.users.get({ email });
};

export const updateUser = async (email, updates) => {
    const user = await db.users.get({ email });
    if (user) {
        const finalUpdates = { ...updates };
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            finalUpdates.password = await bcrypt.hash(updates.password, salt);
        }
        return await db.users.update(user.id, finalUpdates);
    }
    return null;
};
