// types.ts
interface User {
    uid: string;
    name: string;
    login: string;
    accessToken: string;
}

enum Provider {
    GITHUB = 'github',
    GOOGLE = 'google',
}

export {Provider};
export type {User};
