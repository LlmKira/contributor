import {JwtPayload} from "jsonwebtoken";

interface CustomJwtPayload extends JwtPayload {
    userId: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: CustomJwtPayload;
        }
    }
}