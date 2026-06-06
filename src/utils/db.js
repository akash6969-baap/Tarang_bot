import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GuildSettings, UserPlaylist, isMongoConnected } from './mongoose.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../data');
const dbFile = join(dbPath, 'settings.json');
const playlistsFile = join(dbPath, 'playlists.json');

// Ensure local JSON DB exists
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({}, null, 2));
if (!fs.existsSync(playlistsFile)) fs.writeFileSync(playlistsFile, JSON.stringify({}, null, 2));

let settingsCache = {};
let playlistsCache = {};
try {
    settingsCache = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    playlistsCache = JSON.parse(fs.readFileSync(playlistsFile, 'utf8'));
} catch (e) {
    settingsCache = {};
    playlistsCache = {};
}

function saveLocalDB() {
    fs.writeFileSync(dbFile, JSON.stringify(settingsCache, null, 2));
}

function saveLocalPlaylists() {
    fs.writeFileSync(playlistsFile, JSON.stringify(playlistsCache, null, 2));
}

// Wrapper to handle both Mongo (if connected) and Local JSON
export const db = {
    getGuild: async (guildId) => {
        if (isMongoConnected) {
            let data = await GuildSettings.findOne({ guildId });
            if (!data) data = await GuildSettings.create({ guildId });
            return data;
        } else {
            // Local fallback
            if (!settingsCache[guildId]) {
                settingsCache[guildId] = { prefix: '/', djRole: null, twentyFourSeven: false, noprefixUsers: [], noprefixRoles: [] };
                saveLocalDB();
            }
            return settingsCache[guildId];
        }
    },
    addNoPrefix: async (guildId, type, id) => {
        if (isMongoConnected) {
            const update = type === 'user' ? { $addToSet: { noprefixUsers: id } } : { $addToSet: { noprefixRoles: id } };
            await GuildSettings.findOneAndUpdate({ guildId }, update, { upsert: true });
        } else {
            const guild = await db.getGuild(guildId);
            const arr = type === 'user' ? guild.noprefixUsers : guild.noprefixRoles;
            if (!arr.includes(id)) arr.push(id);
            saveLocalDB();
        }
    },
    removeNoPrefix: async (guildId, type, id) => {
        if (isMongoConnected) {
            const update = type === 'user' ? { $pull: { noprefixUsers: id } } : { $pull: { noprefixRoles: id } };
            await GuildSettings.findOneAndUpdate({ guildId }, update, { upsert: true });
        } else {
            const guild = await db.getGuild(guildId);
            if (type === 'user') guild.noprefixUsers = guild.noprefixUsers.filter(u => u !== id);
            else guild.noprefixRoles = guild.noprefixRoles.filter(r => r !== id);
            saveLocalDB();
        }
    },
    setPrefix: async (guildId, prefix) => {
        if (isMongoConnected) {
            await GuildSettings.findOneAndUpdate({ guildId }, { prefix }, { upsert: true });
        } else {
            const guild = await db.getGuild(guildId);
            guild.prefix = prefix;
            saveLocalDB();
        }
    },
    setDjRole: async (guildId, roleId) => {
        if (isMongoConnected) {
            await GuildSettings.findOneAndUpdate({ guildId }, { djRole: roleId }, { upsert: true });
        } else {
            const guild = await db.getGuild(guildId);
            guild.djRole = roleId;
            saveLocalDB();
        }
    },
    set24x7: async (guildId, state) => {
        if (isMongoConnected) {
            await GuildSettings.findOneAndUpdate({ guildId }, { twentyFourSeven: state }, { upsert: true });
        } else {
            const guild = await db.getGuild(guildId);
            guild.twentyFourSeven = state;
            saveLocalDB();
        }
    },

    // Playlist Methods
    getUserPlaylists: async (userId) => {
        if (isMongoConnected) {
            return await UserPlaylist.find({ userId });
        } else {
            return (playlistsCache[userId] || []).map(p => ({ ...p, _id: p.name }));
        }
    },
    getPlaylist: async (userId, name) => {
        if (isMongoConnected) {
            return await UserPlaylist.findOne({ userId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
        } else {
            const userLists = playlistsCache[userId] || [];
            return userLists.find(p => p.name.toLowerCase() === name.toLowerCase());
        }
    },
    createPlaylist: async (userId, name) => {
        if (isMongoConnected) {
            return await UserPlaylist.create({ userId, name, tracks: [] });
        } else {
            if (!playlistsCache[userId]) playlistsCache[userId] = [];
            const newPlaylist = { name, tracks: [] };
            playlistsCache[userId].push(newPlaylist);
            saveLocalPlaylists();
            return newPlaylist;
        }
    },
    deletePlaylist: async (userId, name) => {
        if (isMongoConnected) {
            await UserPlaylist.deleteOne({ userId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
        } else {
            if (playlistsCache[userId]) {
                playlistsCache[userId] = playlistsCache[userId].filter(p => p.name.toLowerCase() !== name.toLowerCase());
                saveLocalPlaylists();
            }
        }
    },
    updatePlaylist: async (userId, name, tracks) => {
        if (isMongoConnected) {
            await UserPlaylist.updateOne({ userId, name: { $regex: new RegExp(`^${name}$`, 'i') } }, { tracks });
        } else {
            const list = await db.getPlaylist(userId, name);
            if (list) {
                list.tracks = tracks;
                saveLocalPlaylists();
            }
        }
    }
};
