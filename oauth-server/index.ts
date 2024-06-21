import express from 'express';
import session from 'express-session';
import axios from 'axios';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const CALLBACK_URL = process.env.CALLBACK_URL!;
const SESSION_SECRET = process.env.SESSION_SECRET!;

// CORS setup
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.get('/auth/github', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.csrfString = state;
    const redirect_uri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${CALLBACK_URL}&state=${state}`;
    res.redirect(redirect_uri);
});

app.get('/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;
    if (state === req.session.csrfString) {
        try {
            const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                state,
            }, {
                headers: { accept: 'application/json' }
            });

            const accessToken = tokenResponse.data.access_token;
            req.session.accessToken = accessToken;
            res.redirect('http://localhost:3000/');
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
            const userResponse = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` }
            });
            res.json(userResponse.data);
        } catch (err) {
            console.error('Failed to fetch user:', err);
            res.status(500).send('Failed to fetch user');
        }
    } else {
        console.error('Unauthorized access to /user endpoint.');
        res.status(401).send('Unauthorized');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            res.status(500).send('Failed to logout');
        } else {
            res.clearCookie('connect.sid');
            res.send('Logged out');
        }
    });
});

app.listen(5000, () => console.log('Server is running on http://localhost:5000'));