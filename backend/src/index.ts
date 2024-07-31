import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {Card, User} from "./schema.ts";
import cookieParser from "cookie-parser";

// import {rateLimit} from 'express-rate-limit';
import path from 'path';
import {cardSchema, Platform, publicUserSchema} from "@shared/schema.ts";
import {z} from "zod";
import type {CustomJwtPayload} from "./express";
import session from "express-session";

const checkEnvVariables = (envVariables: string[]) => {
    const missingEnvVariables = envVariables.filter((envVariable) => !process.env[envVariable]);
    if (missingEnvVariables.length > 0) {
        console.error('Missing environment variables:', missingEnvVariables);
        process.exit(1);
    }
};

dotenv.config({path: path.resolve(__dirname, '../.env')});  // 确保正确读取.env文件

// Check required environment variables
checkEnvVariables([
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'OHMYGPT_CLIENT_ID',
    'OHMYGPT_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
    'OHMYGPT_CALLBACK_URL',
    'MONGODB_URI',
    'CORS_ORIGIN',
    'TOKEN_SECRET',
    'JWT_SECRET'
]);

const app = express();
const PORT = process.env.PORT || 5000;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

const OHMYGPT_CLIENT_ID = process.env.OHMYGPT_CLIENT_ID!;
const OHMYGPT_CLIENT_SECRET = process.env.OHMYGPT_CLIENT_SECRET!;

const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL!;
const OHMYGPT_CALLBACK_URL = process.env.OHMYGPT_CALLBACK_URL!;
const MONGODB_URI = process.env.MONGODB_URI!;
const CORS_ORIGIN = process.env.CORS_ORIGIN!;
const TOKEN_SECRET: string = process.env.TOKEN_SECRET!;
const JWT_SECRET = process.env.JWT_SECRET || 'a_exp_jwt_secret';
const SESSION_SECRET = process.env.SESSION || 'a_exp_session_secret';
const TOKEN_EXPIRATION = '7d'; // 1 week

mongoose.connect(MONGODB_URI, {
    dbName: 'contributor-cards-v1',
}).then(
    () => {
        console.log('MongoDB connection established successfully');
    },
    (err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
);

const createUserId = (provider: string, providerUserId: string): string => {
    return `${provider}:${providerUserId}`;
}

const getAvatarUrl = (provider: string, providerUserId: string): string => {
    if (provider === Platform.GitHub) {
        return `https://avatars.githubusercontent.com/u/${providerUserId}`;
    } else {
        return '';
    }

}

app.use(cookieParser());
// Session middleware setup
app.use(session({
    secret: SESSION_SECRET, // Change this to a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: {secure: process.env.NODE_ENV === 'production'}
}));

app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
}));


app.use(bodyParser.json());

const authenticateJWT = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.header('Authorization')?.split(' ')[1] || req.cookies.jwt as string;
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).send('Invalid token');
            }
            // 检查是否有 userId 属性
            if (typeof user !== 'object' || !('userId' in user)) {
                return res.status(403).send('Invalid token instance');
            }
            req.user = user as CustomJwtPayload;
            next();
        });
    } else {
        res.status(401).send('Unauthorized');
    }
};

app.get('/auth/github', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.csrfString = state;
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_CALLBACK_URL}&state=${state}`;
    res.redirect(redirectUri);
});

app.get('/auth/ohmygpt', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.csrfString = state;
    const redirectUri = `https://next.ohmygpt.com/next/v1/oauth?response_type=code&client_id=${OHMYGPT_CLIENT_ID}&redirect_uri=${OHMYGPT_CALLBACK_URL}&scope=general_api_access&state=${state}`;
    res.redirect(redirectUri);
});

const handleOAuthCallback = async (
    req: express.Request,
    res: express.Response,
    service: {
        name: string,
        clientId: string,
        clientSecret: string,
        platform: Platform,
        getTokenResponseData: (data: any) => { accessToken: string },
        parseUser: (data: any) => {
            id: string,
            name: string,
            email: string
        }
    },
    getTokenUrl: string,
    getUserUrl: { url: string, method: string },
    createUserId: (provider: string, providerUserId: string) => string) => {
    const {code, state, error, error_description} = req.query;
    if (error) {
        console.error(`Error during ${service.name} OAuth callback:`, error);
        res.status(500).send(`Error during ${service.name} OAuth callback: ${error_description}`);
        return;
    }
    if (state === req.session.csrfString) {
        try {
            const tokenResponse = await axios.post(getTokenUrl, {
                client_id: service.clientId,
                client_secret: service.clientSecret,
                code,
                state,
            }, {
                headers: {accept: 'application/json'}
            });
            const {accessToken} = service.getTokenResponseData(tokenResponse.data);
            if (!accessToken) {
                console.error(`Failed to get access token from ${service.name} OAuth callback:`, tokenResponse.data);
                res.status(500).send('Failed to get access token');
                return;
            }
            // 根据 userMethod 的值进行决定是 post 还是 get 请求
            let userResponse;
            if (getUserUrl.method === 'POST') {
                userResponse = await axios.post(getUserUrl.url, {}, {headers: {Authorization: `Bearer ${accessToken}`}});
            } else {
                userResponse = await axios.get(getUserUrl.url, {headers: {Authorization: `Bearer ${accessToken}`}});
            }
            const userData = service.parseUser(userResponse.data);
            // id 不能是 undefined
            if (!userData.id) {
                console.error(`Failed to get user id from ${service.name} OAuth callback:`, userData);
                res.status(500).send('Failed to get user id');
                return;
            } else {
                console.log('User logged in:', userData.id);
            }
            const userId = createUserId(service.platform, userData.id);
            let user = await User.findOne({uid: userId}).exec();
            if (!user) {
                user = new User({
                    uid: userId,
                    name: userData.name,
                    accessToken: accessToken,
                    email: userData.email,
                    sourcePlatform: service.platform,
                    avatarUrl: getAvatarUrl(service.platform, userData.id)
                });
                await user.save();
            } else {
                Object.assign(user, userData);
                user.avatarUrl = getAvatarUrl(service.platform, userData.id);
                user.accessToken = accessToken;
                user.name = userData.name;
                user.email = userData.email;
                await user.save();
            }

            const jwtToken = jwt.sign({userId: user.uid}, JWT_SECRET, {expiresIn: TOKEN_EXPIRATION});
            res.cookie('jwt', jwtToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
            });
            res.redirect(CORS_ORIGIN);
        } catch (err) {
            console.error(`Error during ${service.name} OAuth callback:`, err);
            res.status(500).send('Oauth Authentication failed');
        }
    } else {
        console.error(`CSRF token mismatch during ${service.name} OAuth callback.`);
        res.status(401).send('CSRF token mismatch');
    }
};

app.get('/auth/github/callback', (req, res) => handleOAuthCallback(req, res,
    {
        name: 'GitHub',
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        platform: Platform.GitHub,
        getTokenResponseData: data => ({accessToken: data.access_token}),
        parseUser: data => ({
            id: data.id,
            name: data.name,
            email: data.email,
        })
    },
    'https://github.com/login/oauth/access_token',
    {method: "GET", url: "https://api.github.com/user"},
    createUserId
));

app.get('/auth/ohmygpt/callback', (req, res) => handleOAuthCallback(req, res, {
        name: 'OhMyGPT',
        clientId: OHMYGPT_CLIENT_ID,
        clientSecret: OHMYGPT_CLIENT_SECRET,
        platform: Platform.OhMyGPT,
        getTokenResponseData: data => ({accessToken: data.data.token}),
        parseUser: data => ({
            id: data.data.userId,
            name: data.data.userEmail.split('@')[0],
            email: data.data.userEmail,
        })
    },
    'https://cn2us02.opapi.win/api/v1/user/oauth/issue-token',
    {url: 'https://cn2us02.opapi.win/api/v1/user/oauth/app/query-user-basic-info', method: 'POST'},
    createUserId
));

app.get('/user', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findOne({uid: req.user?.userId}).exec();
        res.json(publicUserSchema.parse(user));
    } catch (err) {
        console.error('Failed to fetch user:', err);
        res.status(500).send('Failed to fetch user');
    }
});

app.post('/logout', (_req, res) => {
    res.clearCookie('jwt');
    res.send('Logged out');
});

app.get('/auth/check', authenticateJWT, (_req, res) => {
    res.status(200).send('User is logged in');
});

app.get('/cards', authenticateJWT, async (req, res) => {
    try {
        const {userId} = req.query;
        const cards = await Card.find({userId}).exec();
        res.json(z.array(cardSchema).parse(cards));
    } catch (err) {
        console.error('Failed to fetch cards:', err);
        res.status(500).send('Failed to fetch cards');
    }
});

app.post('/cards', authenticateJWT, async (req, res) => {
    try {
        const requestCard = cardSchema.safeParse(req.body);
        if (!requestCard.success) {
            res.status(400).send('Invalid card data');
            return;
        }
        const card = new Card({
            ...requestCard.data,
            userId: req.user?.userId,
        });
        await card.save();
        res.json(cardSchema.parse(card));
    } catch (err) {
        console.error('Failed to add card:', err);
        res.status(500).send('Failed to add card');
    }
});

app.put('/cards/:id', authenticateJWT, async (req, res) => {
    try {
        const {id} = req.params;
        const requestCard = cardSchema.safeParse(req.body);
        if (!requestCard.success) {
            res.status(400).send('Invalid card data');
            return;
        }
        const card = await Card.findOneAndUpdate({
            cardId: id,
            userId: req.user?.userId,
        }, requestCard.data, {new: true}).exec();
        if (!card) {
            res.status(404).send('Card not found');
        } else {
            res.json(cardSchema.parse(card));
        }
    } catch (err) {
        console.error('Failed to update card:', err);
        res.status(500).send('Failed to update card');
    }
});

app.delete('/cards/:id', authenticateJWT, async (req, res) => {
    try {
        const {id} = req.params;
        const result = await Card.deleteOne({cardId: id, userId: req.user?.userId});
        if (result.deletedCount === 0) {
            res.status(404).send('Card not found');
        } else {
            res.send('Card deleted');
        }
    } catch (err) {
        console.error('Failed to delete card:', err);
        res.status(500).send('Failed to delete card');
    }
});

app.get('/internal/cards/:cardId', async (req, res) => {
    try {
        const {cardId} = req.params;
        const timeToken = req.query.timeToken as string;
        if (!timeToken) {
            res.status(400).send('Missing timeToken');
            return;
        }
        const currentSecond = Math.floor(Date.now() / 1000).toString();
        const expectedTimeToken = crypto.createHmac('sha256', TOKEN_SECRET)
            .update(currentSecond)
            .digest('hex');
        if (timeToken !== expectedTimeToken) {
            console.error('Invalid timeToken:', timeToken, 'expected:', expectedTimeToken);
            res.status(401).send('Invalid timeToken');
            return;
        }
        const card = await Card.findOne({cardId}).exec();
        if (!card) {
            res.status(404).send('Card not found');
        } else {
            res.json(cardSchema.parse(card));
        }
    } catch (err) {
        console.error('Failed to fetch card info:', err);
        res.status(500).send('Request failed');
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));