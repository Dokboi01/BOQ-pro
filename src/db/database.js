import Dexie from 'dexie';

export const db = new Dexie('BOQProDB');

db.version(2).stores({
    projects: '++id, name, type, status, date',
    settings: 'key, value',
    users: '++id, &email, fullName, password, plan, isVerified, verificationCode'
});

export const saveProject = async (project) => {
    return await db.projects.put(project);
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
    return await db.users.add(user);
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
