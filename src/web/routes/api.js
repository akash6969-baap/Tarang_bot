import { Router } from 'express';
import { serializeTrack } from '../../utils/musicUtils.js';
import lyricsFinder from 'lyrics-finder';
import { isMongoConnected, getMongoPing, GuildSettings } from '../../utils/mongoose.js';
import { db } from '../../utils/db.js';
import { isRedisConnected, getRedisPing } from '../../utils/redisCache.js';

const router = Router();

// Middleware to check if authenticated
const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Not authenticated' });
};

// Middleware: Strict Voice Channel Security
const checkVoiceChannel = (req, res, next) => {
    const guildId = req.params.guildId;
    const client = req.client;
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const member = guild.members.cache.get(req.user.id);
    if (!member) return res.status(403).json({ error: 'You are not in this guild' });

    const botVoiceChannel = guild.members.me.voice.channelId;
    const memberVoiceChannel = member.voice.channelId;

    if (!memberVoiceChannel) {
        return res.status(403).json({ error: 'You must be in a voice channel to use the dashboard controls.' });
    }

    if (botVoiceChannel && botVoiceChannel !== memberVoiceChannel) {
        return res.status(403).json({ error: 'You must be in the same voice channel as the bot to control it.' });
    }

    // Attach player to request for easy access in endpoints
    req.player = client.kazagumo.players.get(guildId);
    next();
};

router.get('/user', checkAuth, (req, res) => {
    res.json(req.user);
});

router.get('/guilds', checkAuth, async (req, res) => {
    const client = req.client;
    const userGuilds = req.user.guilds;
    const botGuilds = client.guilds.cache;

    const mutualGuilds = userGuilds.filter(ug => {
        return botGuilds.has(ug.id);
    }).map(ug => {
        const guild = client.guilds.cache.get(ug.id);
        const member = guild.members.cache.get(req.user.id);
        const isInVoice = !!(member && member.voice && member.voice.channelId);
        return { ...ug, isInVoice };
    });

    res.json(mutualGuilds);
});

router.get('/nodes', checkAuth, (req, res) => {
    const kazagumo = req.client.kazagumo;
    const nodes = [];
    kazagumo.shoukaku.nodes.forEach((node, name) => {
        nodes.push({
            name,
            state: node.state,
            stats: node.stats
        });
    });
    res.json(nodes);
});

router.get('/stats', async (req, res) => {
    const client = req.client;
    
    // We can fetch pings concurrently
    const mongoPing = await getMongoPing();
    const redisPing = await getRedisPing();

    res.json({
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        uptime: client.uptime,
        ping: client.ws.ping,
        database: {
            mongo: { connected: isMongoConnected, ping: mongoPing },
            redis: { connected: isRedisConnected, ping: redisPing }
        }
    });
});

// Guild Settings
router.get('/guilds/:guildId/settings', checkAuth, async (req, res) => {
    // Basic verification that user is in guild
    const guild = req.client.guilds.cache.get(req.params.guildId);
    if (!guild || !guild.members.cache.has(req.user.id)) return res.status(403).json({ error: 'Access denied' });
    
    try {
        const settings = await db.getGuild(req.params.guildId);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/guilds/:guildId/settings', checkAuth, async (req, res) => {
    const guild = req.client.guilds.cache.get(req.params.guildId);
    if (!guild || !guild.members.cache.has(req.user.id)) return res.status(403).json({ error: 'Access denied' });
    
    // In a real bot, we'd check if user has Manage Server perms, but for demo we just check membership
    
    const { prefix, djRole, twentyFourSeven } = req.body;
    
    try {
        if (prefix !== undefined) await db.setPrefix(req.params.guildId, prefix);
        if (djRole !== undefined) await db.setDjRole(req.params.guildId, djRole);
        if (twentyFourSeven !== undefined) await db.set24x7(req.params.guildId, twentyFourSeven);
        
        const settings = await db.getGuild(req.params.guildId);
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// GET Player State
router.get('/player/:guildId', checkAuth, (req, res) => {
    const player = req.client.kazagumo.players.get(req.params.guildId);
    if (!player) return res.json({ active: false });

    res.json({
        active: true,
        playing: player.playing,
        paused: player.paused,
        volume: player.volume,
        position: player.position,
        loop: player.loop,
        current: serializeTrack(player.queue.current),
        queue: player.queue.map(t => serializeTrack(t))
    });
});

// GET Player Commands
router.post('/player/:guildId/search', checkAuth, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const result = await req.client.kazagumo.search(query, { requester: { ...req.user, source: 'web' } });
        if (!result || !result.tracks || !result.tracks.length) return res.status(404).json({ error: 'No tracks found' });

        return res.json(result);
    } catch (error) {
        console.error('Search API Error:', error);
        res.status(500).json({ error: 'Failed to search for tracks' });
    }
});

// POST Player Commands (Protected by checkVoiceChannel)
router.post('/player/:guildId/play', checkAuth, checkVoiceChannel, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        let player = req.player;
        if (!player) {
            const guild = req.client.guilds.cache.get(req.params.guildId);
            const member = guild.members.cache.get(req.user.id);
            
            player = await req.client.kazagumo.createPlayer({
                guildId: req.params.guildId,
                textId: guild.channels.cache.find(c => c.isTextBased())?.id, // fallback text channel
                voiceId: member.voice.channelId,
                deaf: true
            });
        }

        const result = await req.client.kazagumo.search(query, { requester: { ...req.user, source: 'web' } });
        if (!result || !result.tracks || !result.tracks.length) return res.status(404).json({ error: 'No tracks found' });

        if (result.type === 'PLAYLIST') {
            for (const track of result.tracks) player.queue.add(track);
            if (!player.playing && !player.paused) player.play();
            return res.json({ success: true, message: `Added playlist ${result.playlistName}` });
        } else {
            const track = result.tracks[0];
            player.queue.add(track);
            if (!player.playing && !player.paused) player.play();
            return res.json({ success: true, message: `Added track ${track.title}` });
        }
    } catch (error) {
        console.error('Play API Error:', error);
        res.status(500).json({ error: 'Failed to play track' });
    }
});

router.post('/player/:guildId/pause', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    req.player.pause(true);
    res.json({ success: true, paused: true });
});

router.post('/player/:guildId/resume', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    req.player.pause(false);
    res.json({ success: true, paused: false });
});

router.post('/player/:guildId/skip', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    req.player.skip();
    res.json({ success: true });
});

router.post('/player/:guildId/stop', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    req.player.destroy();
    res.json({ success: true });
});

router.post('/player/:guildId/skipto', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    const { index } = req.body;
    if (typeof index !== 'number' || index < 0 || index >= req.player.queue.length) {
        return res.status(400).json({ error: 'Invalid index' });
    }
    if (index > 0) {
        req.player.queue.splice(0, index);
    }
    req.player.skip();
    res.json({ success: true });
});

router.post('/player/:guildId/remove_queue', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    const { index } = req.body;
    if (typeof index !== 'number' || index < 0 || index >= req.player.queue.length) {
        return res.status(400).json({ error: 'Invalid index' });
    }
    req.player.queue.remove(index);
    res.json({ success: true });
});

router.post('/player/:guildId/lyrics', checkAuth, async (req, res) => {
    // Only strictly require auth, voice channel check not strictly needed just to read lyrics
    const player = req.client.kazagumo.players.get(req.params.guildId);
    if (!player || !player.queue.current) return res.status(404).json({ error: 'No active player' });
    
    const track = player.queue.current;
    // Aggressively clean the title for YouTube
    let title = track.title;
    
    // Often the actual song name is just the first part before any brackets, dashes, or pipes
    // e.g. "Chal Chaiya Chaiya (( Jhankar )) Shahrukh Kh" -> "Chal Chaiya Chaiya"
    const match = title.match(/^([^([|-]+)/);
    if (match) {
        title = match[1];
    }
    
    title = title.replace(/music video/i, '')
                 .replace(/audio/i, '')
                 .replace(/lyric video/i, '')
                 .replace(/lyric/i, '')
                 .replace(/lyrics/i, '')
                 .trim();

    let lyrics = null;
    try {
        // Try with author (works well for Spotify/Apple Music)
        lyrics = await lyricsFinder(track.author, title);
        
        // Fallback: If author is a random YouTube channel, try without author.
        if (!lyrics) {
            lyrics = await lyricsFinder("", title);
        }
        
        // Fallback 2: Try original full title without author
        if (!lyrics) {
            lyrics = await lyricsFinder("", track.title);
        }
    } catch (e) {
        lyrics = null;
    }
    if (!lyrics) return res.json({ error: 'Not Found' });
    res.json({ success: true, lyrics, title: track.title, author: track.author });
});

router.post('/player/:guildId/volume', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    const { volume } = req.body;
    if (typeof volume !== 'number' || volume < 0 || volume > 200) return res.status(400).json({ error: 'Invalid volume' });
    req.player.setVolume(volume);
    res.json({ success: true, volume });
});

router.post('/player/:guildId/previous', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    if (!req.player.queue.previous) return res.status(400).json({ error: 'No previous track' });
    const prevTrack = req.player.queue.previous;
    req.player.queue.unshift(req.player.queue.current);
    req.player.queue.unshift(prevTrack);
    req.player.skip();
    res.json({ success: true });
});

router.post('/player/:guildId/shuffle', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    req.player.queue.shuffle();
    res.json({ success: true });
});

router.post('/player/:guildId/loop', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    const { mode } = req.body;
    if (!['none', 'track', 'queue'].includes(mode)) return res.status(400).json({ error: 'Invalid loop mode' });
    req.player.setLoop(mode);
    res.json({ success: true, mode });
});

router.post('/player/:guildId/seek', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    const { position } = req.body;
    if (typeof position !== 'number') return res.status(400).json({ error: 'Invalid position' });
    req.player.seek(position);
    res.json({ success: true, position });
});

router.post('/player/:guildId/search', checkAuth, async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    
    try {
        const result = await req.client.kazagumo.search(query, { requester: req.user });
        return res.json({
            type: result.type,
            tracks: result.tracks.map(serializeTrack).slice(0, 20)
        });
    } catch (err) {
        return res.status(500).json({ error: 'Search failed' });
    }
});

const filters = {
    '3d': { rotation: { rotationHz: 0.2 } },
    'alienvibes': { tremolo: { frequency: 10.0, depth: 0.8 }, vibrato: { frequency: 10.0, depth: 0.8 } },
    'ambient': { timescale: { speed: 0.9, pitch: 0.9, rate: 1.1 } },
    'bassboost': { equalizer: [{band:0,gain:0.3},{band:1,gain:0.2},{band:2,gain:0.1},{band:3,gain:0.05},{band:4,gain:0.0},{band:5,gain:-0.05},{band:6,gain:-0.1},{band:7,gain:-0.1},{band:8,gain:-0.1},{band:9,gain:-0.1},{band:10,gain:-0.1},{band:11,gain:-0.1},{band:12,gain:-0.1},{band:13,gain:-0.1},{band:14,gain:-0.1}] },
    'chillwave': { timescale: { speed: 0.9, pitch: 0.95, rate: 0.9 }, lowPass: { smoothing: 15 } },
    'nightcore': { timescale: { pitch: 1.2, rate: 1.1 } },
    'slowed': { timescale: { speed: 0.8, pitch: 0.9, rate: 0.8 } },
    'underwater': { lowPass: { smoothing: 20 }, equalizer: [{band:0,gain:0.3},{band:1,gain:0.2},{band:2,gain:0.1},{band:3,gain:0.0},{band:4,gain:0.0},{band:5,gain:-0.1},{band:6,gain:-0.2},{band:7,gain:-0.3},{band:8,gain:-0.3},{band:9,gain:-0.3},{band:10,gain:-0.3},{band:11,gain:-0.3},{band:12,gain:-0.3},{band:13,gain:-0.3},{band:14,gain:-0.3}] },
    'reset': 'reset'
};

router.post('/player/:guildId/filter', checkAuth, checkVoiceChannel, (req, res) => {
    if (!req.player) return res.status(404).json({ error: 'No active player' });
    const { type } = req.body;
    
    if (!filters[type]) return res.status(400).json({ error: 'Invalid filter type' });
    
    if (type === 'reset') {
        req.player.shoukaku.clearFilters();
    } else {
        req.player.shoukaku.setFilters(filters[type]);
    }
    
    res.json({ success: true, filter: type });
});

export default router;
