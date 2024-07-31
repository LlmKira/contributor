import {z} from "zod";
import {v4 as uuidv4} from "uuid";

// 定义来源平台枚举
export enum Platform {
    GitHub = "github",
    OhMyGPT = "ohmygpt",
}

// 自定义校验函数，用于检查 repoUrl 是否是一个有效的 GitHub 仓库地址
const githubRepoUrlSchema = z
    .string().max(100)
    .refine(
        (value) => {
            const githubRepoUrlPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+\/?$/;
            return githubRepoUrlPattern.test(value);
        },
        {message: 'Must be a valid GitHub repository URL.'}
    );

export const cardSchema = z.object({
    cardId: z.string().max(100).uuid().default(uuidv4),
    openaiEndpoint: z.string().max(100).url('Must be a valid URL.'),
    apiModel: z.string().max(100),
    apiKey: z.string().max(100),
    userId: z.string().max(100),
    repoUrl: githubRepoUrlSchema,
    disabled: z.boolean().default(false),
});
export type CardT = z.infer<typeof cardSchema>;
// User Schema
export const userSchema = z.object({
    uid: z.string().max(100),
    name: z.string().max(100),
    accessToken: z.string().max(200),
    email: z.string().optional().nullable(),
    avatarUrl: z.string().optional().default('https://avatars.githubusercontent.com/in/907205'),
    sourcePlatform: z.nativeEnum(Platform).optional(),
});
// 定义去掉 accessToken 的 schema
export const publicUserSchema = userSchema.omit(
    {accessToken: true}
);

export type UserT = z.infer<typeof userSchema>;
export type PublicUserT = z.infer<typeof publicUserSchema>;
