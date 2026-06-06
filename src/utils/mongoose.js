import mongoose from 'mongoose';

const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '/' },
    djRole: { type: String, default: null },
    twentyFourSeven: { type: Boolean, default: false },
    noprefixUsers: { type: [String], default: [] },
    noprefixRoles: { type: [String], default: [] }
});

export const GuildSettings = mongoose.model('GuildSettings', guildSchema);

const playlistSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    tracks: { type: Array, default: [] }
});

export const UserPlaylist = mongoose.model('UserPlaylist', playlistSchema);

export let isMongoConnected = false;

export async function connectMongo() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/tarang';
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        isMongoConnected = true;
        console.log(`[info]: MongoDB connected successfully!`);
    } catch (error) {
        isMongoConnected = false;
        console.log(`[warn]: MongoDB connection failed. Running in Local Fallback mode.`);
    }
}

export async function getMongoPing() {
    if (!isMongoConnected || !mongoose.connection.db) return -1;
    try {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        return Date.now() - start;
    } catch {
        return -1;
    }
}
