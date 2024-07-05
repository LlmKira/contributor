import {z} from "zod";
import {v4 as uuidv4} from "uuid";

// 定义来源平台枚举
export enum Platform {
    GitHub = "github",
}

// 自定义校验函数，用于检查 repoUrl 是否是一个有效的 GitHub 仓库地址
const githubRepoUrlSchema = z
    .string().max(100)
    .refine(
        (value) => {
            const githubRepoUrlPattern = /https?:\/\/github\.com\/[\w-]+\/[\w-]+/;
            return githubRepoUrlPattern.test(value);
        },
        {message: 'Must be a valid GitHub repository URL.'}
    );


export const cardSchema = z.object({
    cardId: z.string().uuid().default(uuidv4),
    openaiEndpoint: z.string().url('Must be a valid URL.'),
    apiModel: z.string().max(100),
    apiKey: z.string().max(100),
    userId: z.string().max(100),
    repoUrl: githubRepoUrlSchema,
    disabled: z.boolean().default(false),
});
export type CardT = z.infer<typeof cardSchema>;

// User Schema
export const userSchema = z.object({
    uid: z.string(),
    name: z.string().max(100),
    login: z.string(),
    accessToken: z.string(),
    avatarUrl: z.string().optional().default('https://avatars.githubusercontent.com/in/907205'),
    sourcePlatform: z.nativeEnum(Platform).optional(),
});

export type UserT = z.infer<typeof userSchema>;