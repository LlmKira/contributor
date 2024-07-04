// express.d.ts

import type {UserT} from "@shared/schema.ts";

declare global {
    namespace Express {
        interface Request {
            user?: UserT;  // 确保 user 是可选的
        }
    }
}