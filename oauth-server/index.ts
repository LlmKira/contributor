import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {Card, User} from "./schema.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const CALLBACK_URL = process.env.CALLBACK_URL!;
const SESSION_SECRET = process.env.SESSION_SECRET!;
const MONGODB_URI = process.env.MONGODB_URI!;
const CORS_ORIGIN = process.env.CORS_ORIGIN!;
const TOKEN_SECRET: string = process.env.TOKEN_SECRET!;

mongoose.connect(MONGODB_URI, {
    dbName: 'github-cards',
}).then(
    () => {
        console.log('MongoDB connection established successfully');
    },
    (err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
);

app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
}));

app.use(bodyParser.json());

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false},
}));

app.get('/auth/github', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.csrfString = state;
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&state=${state}`;
    res.redirect(redirectUri);
});

app.get('/auth/github/callback', async (req, res) => {
    const {code, state} = req.query;
    if (state === req.session.csrfString) {
        try {
            const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                state,
            }, {
                headers: {accept: 'application/json'}
            });

            const accessToken = tokenResponse.data.access_token;
            const userResponse = await axios.get('https://api.github.com/user', {headers: {Authorization: `Bearer ${accessToken}`}});
            const {id, name, login} = userResponse.data;

            let user = await User.findOne({githubId: id});
            if (!user) {
                user = new User({githubId: id, name, login, accessToken});
                await user.save();
            } else {
                user.accessToken = accessToken;
                await user.save();
            }
            req.session.accessToken = accessToken;
            req.session.userId = user.githubId;
            res.redirect(CORS_ORIGIN);
        } catch (err) {
            console.error('Error during GitHub OAuth callback:', err);
            res.status(500).send('Authentication failed');
        }
    } else {
        console.error('CSRF token mismatch during GitHub OAuth callback.');
        res.status(401).send('CSRF token mismatch');
    }
});

app.get('/user', async (req, res) => {
    if (req.session.accessToken) {
        try {
            const user = await User.findOne({githubId: req.session.userId}).exec();
            res.json({
                githubId: user?.githubId,
                name: user?.name,
                login: user?.login,
                accessToken: user?.accessToken,
            });
        } catch (err) {
            console.error('Failed to fetch user:', err);
            res.status(500).send('Failed to fetch user');
        }
    } else {
        res.status(401).send('Unauthorized');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).send('Failed to logout');
        } else {
            res.clearCookie('connect.sid');
            res.send('Logged out');
        }
    });
});

app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const user = await User.findOne({accessToken: token}).exec();
            if (user) {
                // @ts-ignore
                req.user = user;
                next();
            } else {
                res.status(401).send('Invalid token');
            }
        } catch (err) {
            console.error('Failed to authenticate:', err);
            res.status(500).send('Failed to authenticate');
        }
    } else {
        next();
    }
});

app.get('/cards', async (req, res) => {
    try {
        const {userId} = req.query;
        const cards = await Card.find({userId}).exec();
        res.json(cards);
    } catch (err) {
        console.error('Failed to fetch cards:', err);
        res.status(500).send('Failed to fetch cards');
    }
});

app.post('/cards', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).send('Unauthorized');
            return;
        }
        if (!req.body.cardId || !req.body.openaiEndpoint || !req.body.apiKey || !req.body.apiModel || !req.body.repoUrl) {
            res.status(400).send('Missing required fields');
            return;
        }
        if (req.body.cardId.length > 100 || req.body.openaiEndpoint.length > 100 || req.body.apiKey.length > 100 || req.body.apiModel.length > 100 || req.body.repoUrl.length > 100) {
            res.status(400).send('Input too long');
            return;
        }
        const card = new Card({
            cardId: req.body.cardId,
            userId: req.user?.githubId,
            openaiEndpoint: req.body.openaiEndpoint,
            apiKey: req.body.apiKey,
            apiModel: req.body.apiModel,
            repoUrl: req.body.repoUrl,
        })
        await card.save();
        res.json({
            cardId: card.cardId,
            openaiEndpoint: card.openaiEndpoint,
            apiKey: card.apiKey,
            apiModel: card.apiModel,
            repoUrl: card.repoUrl,
            disabled: card.disabled,
        });
    } catch (err) {
        console.error('Failed to add card:', err);
        res.status(500).send('Failed to add card');
    }
});

app.put('/cards/:id', async (req, res) => {
    try {
        const {id} = req.params;
        if (req.body.cardId && req.body.cardId.length > 100 || req.body.openaiEndpoint && req.body.openaiEndpoint.length > 100 || req.body.apiKey && req.body.apiKey.length > 100 || req.body.apiModel && req.body.apiModel.length > 100 || req.body.repoUrl && req.body.repoUrl.length > 100) {
            res.status(400).send('Input too long');
            return;
        }
        const card = await Card.findOneAndUpdate({cardId: id, userId: req.user?.githubId}, req.body, {new: true});
        if (!card) {
            res.status(404).send('Card not found');
        } else {
            res.json({
                cardId: card.cardId,
                openaiEndpoint: card.openaiEndpoint,
                apiKey: card.apiKey,
                apiModel: card.apiModel,
                repoUrl: card.repoUrl,
                disabled: card.disabled,
            })
        }
    } catch (err) {
        console.error('Failed to update card:', err);
        res.status(500).send('Failed to update card');
    }
});

app.delete('/cards/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const result = await Card.deleteOne({cardId: id, userId: req.user?.githubId});
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
        // 时间戳
        const currentSecond = Math.floor(Date.now() / 1000).toString();
        const expectedTimeToken = crypto.createHmac('sha256', TOKEN_SECRET)
            .update(currentSecond)
            .digest('hex');
        if (timeToken !== expectedTimeToken) {
            res.status(401).send('Invalid timeToken');
            return;
        }
        const card = await Card.findOne({cardId}).exec();
        if (!card) {
            res.status(404).send('Card not found');
        } else {
            const user = await User.findOne({githubId: card.userId}).exec();
            if (!user) {
                res.status(404).send('User not found');
            } else {
                res.json({
                    githubId: user.githubId,
                    name: user.name,
                    login: user.login,
                });
            }
        }
    } catch (err) {
        console.error('Failed to fetch user info:', err);
        res.status(500).send('Request failed');
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));