// express.d.ts
import {User} from './types.ts';  // 假设你有一个 User 类型对象

declare global {
    namespace Express {
        interface Request {
            user?: User;  // 确保 user 是可选的
        }
    }
}