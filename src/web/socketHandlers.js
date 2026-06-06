import { logger } from '../utils/logger.js';
import { serializeTrack } from '../utils/musicUtils.js';
import lyricsFinder from 'lyrics-finder';

export function setupSocketHandlers(io, client) {
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        socket.on('join_guild', (guildId) => {
            socket.join(guildId);
            const player = client.kazagumo.players.get(guildId);
            if (player) {
                socket.emit('playerUpdate', {
                    playing: player.playing,
                    paused: player.paused,
                    volume: player.volume,
                    loop: player.loop,
                    position: player.position,
                    current: serializeTrack(player.queue.current),
                    queue: player.queue.map(t => serializeTrack(t))
                });
            } else {
                socket.emit('playerUpdate', null);
            }
        });

        socket.on('control', async (data) => {
            const { guildId, action, value } = data;
            const player = client.kazagumo.players.get(guildId);
            if (!player) return;

            switch (action) {
                case 'playpause':
                    player.pause(player.playing);
                    break;
                case 'skip':
                    player.skip();
                    break;
                case 'stop':
                    player.destroy();
                    break;
                case 'volume':
                    player.setVolume(value);
                    break;
                case 'loop':
                    player.setLoop(value); // 'none', 'track', 'queue'
                    break;
                case 'shuffle':
                    player.queue.shuffle();
                    // Force broadcast
                    const ioInst = io.to(guildId);
                    ioInst.emit('playerUpdate', {
                        playing: player.playing,
                        paused: player.paused,
                        volume: player.volume,
                        loop: player.loop,
                        position: player.position,
                        current: serializeTrack(player.queue.current),
                        queue: player.queue.map(t => serializeTrack(t))
                    });
                    break;
                case 'remove_queue':
                    // value is index
                    player.queue.remove(value);
                    io.to(guildId).emit('playerUpdate', {
                        playing: player.playing,
                        paused: player.paused,
                        volume: player.volume,
                        loop: player.loop,
                        position: player.position,
                        current: serializeTrack(player.queue.current),
                        queue: player.queue.map(t => serializeTrack(t))
                    });
                    break;
                case 'seek':
                    player.seek(value);
                    break;
                case 'skipto':
                    if (value > 0) {
                        player.queue.splice(0, value);
                    }
                    player.skip();
                    break;
            }
        });

        socket.on('search', async (data) => {
            const { guildId, query, userId } = data;
            try {
                // Fetch user from cache just in case we need requester
                const user = client.users.cache.get(userId) || null;
                const res = await client.kazagumo.search(query, { requester: user });
                socket.emit('search_results', res.tracks.slice(0, 10).map(t => serializeTrack(t)));
            } catch (error) {
                logger.error('Search error via socket', error);
                socket.emit('search_results', []);
            }
        });

        socket.on('play_track', async (data) => {
            const { guildId, uri, textChannelId, voiceChannelId, userId } = data;
            let player = client.kazagumo.players.get(guildId);
            
            if (!player) {
                if (!voiceChannelId || !textChannelId) {
                    return socket.emit('error', 'Bot is not in a voice channel. Please use /play in discord first.');
                }
                player = await client.kazagumo.createPlayer({
                    guildId,
                    textId: textChannelId,
                    voiceId: voiceChannelId,
                    volume: client.config.bot.defaultVolume,
                    deaf: true
                });
            }

            const res = await client.kazagumo.search(uri, { requester: { id: userId, username: 'Web User', source: 'web' } });
            if (res.tracks.length) {
                player.queue.add(res.tracks[0]);
                if (!player.playing && !player.paused) {
                    player.play();
                } else {
                    io.to(guildId).emit('playerUpdate', {
                        playing: player.playing,
                        paused: player.paused,
                        volume: player.volume,
                        loop: player.loop,
                        position: player.position,
                        current: serializeTrack(player.queue.current),
                        queue: player.queue.map(t => serializeTrack(t))
                    });
                }
            }
        });

        socket.on('get_lyrics', async (data) => {
            const { guildId } = data;
            const player = client.kazagumo.players.get(guildId);
            if (!player || !player.queue.current) {
                return socket.emit('lyrics_result', { error: 'No song is currently playing.' });
            }

            const track = player.queue.current;
            let title = track.title;
            title = title.replace(/\(official.*?\)/i, '')
                         .replace(/\[official.*?\]/i, '')
                         .replace(/music video/i, '')
                         .replace(/audio/i, '')
                         .replace(/lyric video/i, '')
                         .trim();

            let lyrics;
            try {
                lyrics = await lyricsFinder(track.author, title) || "Not Found!";
            } catch (error) {
                lyrics = "Not Found!";
            }

            if (lyrics === "Not Found!") {
                socket.emit('lyrics_result', { error: `Could not find lyrics for ${track.title}.` });
            } else {
                socket.emit('lyrics_result', { lyrics, title: track.title, author: track.author });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });
}
