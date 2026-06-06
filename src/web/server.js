import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { config } from '../../config/index.js';
import { setIo } from './socketManager.js';
import { setupSocketHandlers } from './socketHandlers.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function startWebServer(client) {
    const app = express();
    const server = createServer(app);
    const io = new Server(server);

    setIo(io);
    setupSocketHandlers(io, client);

    // Passport setup
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    passport.use(new DiscordStrategy({
        clientID: config.discord.clientId,
        clientSecret: config.discord.clientSecret,
        callbackURL: config.web.callbackUrl,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));

    app.set('trust proxy', 1);
    app.use(session({
        secret: config.web.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        }
    }));

    app.use(cors({
        origin: true, // Allow any origin for now, can be tightened later
        credentials: true
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(express.static(join(__dirname, 'public')));
    app.use(express.json());

    // Make client available to routes
    app.use((req, res, next) => {
        req.client = client;
        next();
    });

    app.use('/api', apiRoutes);

    app.get('/auth/discord', passport.authenticate('discord'));
    app.get('/auth/discord/callback', passport.authenticate('discord', {
        failureRedirect: config.web.dashboardUrl
    }), (req, res) => {
        res.redirect(`${config.web.dashboardUrl}/dashboard`);
    });

    app.get('/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    server.listen(config.web.port, () => {
        logger.info(`Web server is running on port ${config.web.port}`);
    });
}
