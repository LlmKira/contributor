import 'express-session';

declare module 'express-session' {
    interface SessionData {
        csrfString: string;
        accessToken: string;
    }
}