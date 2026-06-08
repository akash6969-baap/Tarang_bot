import { logger } from '../utils/logger.js';
import { serializeTrack } from '../utils/musicUtils.js';
import { checkVoicePermissions } from '../utils/voiceValidator.js';
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
            const { guildId, uri } = data;
            const userId = socket.request.user?.id;
            
            let player = client.kazagumo.players.get(guildId);
            
            if (!player) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    return socket.emit('error', 'Server not found.');
                }
                
                const member = await guild.members.fetch(userId).catch(() => null);
                const voiceChannelId = member?.voice?.channelId;
                
                if (!voiceChannelId) {
                    return socket.emit('error', 'You must join a Voice Channel in Discord first!');
                }
                
                const channel = client.channels.cache.get(voiceChannelId);
                const permError = checkVoicePermissions(channel, guild.members.me);
                if (permError) {
                    return socket.emit('error', permError);
                }
                
                const textChannel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')) || guild.systemChannel;
                if (!textChannel) {
                    return socket.emit('error', 'I need permission to send messages in at least one text channel!');
                }
                
                player = await client.kazagumo.createPlayer({
                    guildId,
                    textId: textChannel.id,
                    voiceId: voiceChannelId,
                    volume: client.config.bot.defaultVolume,
                    deaf: true
                });
            }

            const res = await client.kazagumo.search(uri, { requester: { id: userId, username: socket.request.user?.username || 'Web User', source: 'web' } });
            if (res.tracks && res.tracks.length) {
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
