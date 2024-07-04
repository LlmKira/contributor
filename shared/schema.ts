import {z} from "zod";
import {v4 as uuidv4} from "uuid";
// 定义 Zod Schema
const cardZodSchema = z.object({
    cardId: z.string().uuid().default(uuidv4),
    openaiEndpoint: z.string(),
    apiModel: z.string(),
    apiKey: z.string(),
    userId: z.string(),
    repoUrl: z.string(),
    disabled: z.boolean().default(false),
});