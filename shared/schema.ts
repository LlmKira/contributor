import {z} from "zod";
import {v4 as uuidv4} from "uuid";
// 定义 Zod Schema
export const cardSchema = z.object({
    cardId: z.string().uuid().default(uuidv4),
    openaiEndpoint: z.string(),
    apiModel: z.string(),
    apiKey: z.string(),
    userId: z.string(),
    repoUrl: z.string(),
    disabled: z.boolean().default(false),
});

export type CardT = z.infer<typeof cardSchema>;

// User Schema
export const userSchema = z.object({
    uid: z.string(),
    name: z.string(),
    login: z.string(),
    accessToken: z.string(),
});

export type UserT = z.infer<typeof userSchema>;