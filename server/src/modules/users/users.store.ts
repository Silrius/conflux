export type User = {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    avatarUrl?: string;
    aboutText?: string;
    aboutVideoUrl?: string;
    refreshTokenHash?: string;
}

const users = new Map<string, User>();
const usersByEmail = new Map<string, string>();

export function findUserByEmail(email: string) {
    const id = usersByEmail.get(email.toLowerCase());
    return id ? users.get(id) : undefined;
}

export function findUserById(id: string) {
    return users.get(id);
}

export function createUser(user: User) {
    users.set(user.id, user);
    usersByEmail.set(user.email.toLowerCase(), user.id);
    return user;
}

export function updateUser(id: string, patch: Partial<User>) {
    const u = users.get(id);
    if (!u) return undefined;
    const next = { ...u, ...patch };
    users.set(id, next);
    return next;
}