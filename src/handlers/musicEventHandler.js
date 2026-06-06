import { MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { formatDuration, serializeTrack } from '../utils/musicUtils.js';
import { buildNowPlaying } from '../utils/components.js';
import { getIo } from '../web/socketManager.js';
import { config } from '../../config/index.js';
import { db } from '../utils/db.js';

export function loadMusicEvents(client) {
    const kazagumo = client.kazagumo;

    const broadcastPlayerState = (guildId) => {
        const io = getIo();
        if (!io) return;
        const player = kazagumo.players.get(guildId);
        if (player) {
            io.to(guildId).emit('playerUpdate', {
                playing: player.playing,
                paused: player.paused,
                volume: player.volume,
                loop: player.loop,
                position: player.position,
                current: serializeTrack(player.queue.current),
                queue: player.queue.map(t => serializeTrack(t))
            });
        } else {
            io.to(guildId).emit('playerUpdate', null);
        }
    };

    kazagumo.shoukaku.on('ready', (name) => logger.info(`Lavalink Node: ${name} is now connected`));
    kazagumo.shoukaku.on('error', (name, error) => logger.error(`Lavalink Node: ${name} emitted an error.`, error));
    kazagumo.shoukaku.on('close', (name, code, reason) => logger.warn(`Lavalink Node: ${name} closed with code ${code}. Reason: ${reason || 'No reason'}`));
    kazagumo.shoukaku.on('disconnect', (name, players, moved) => {
        if (moved) return;
        logger.warn(`Lavalink Node: ${name} disconnected.`);
    });

    kazagumo.on('playerStart', async (player, track) => {
        // If the song was played from the web dashboard, do not send the Now Playing message in Discord
        if (track.requester?.source === 'web') {
            broadcastPlayerState(player.guildId);
            return;
        }

        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        const message = await channel.send({ 
            flags: MessageFlags.IsComponentsV2,
            components: [buildNowPlaying(track, player)]
        }).catch(() => null);

        if (message) {
            player.data.set('message', message);
        }
        broadcastPlayerState(player.guildId);
    });

    kazagumo.on('playerEnd', (player) => {
        broadcastPlayerState(player.guildId);
    });

    kazagumo.on('playerEmpty', async player => {
        const guildData = await db.getGuild(player.guildId);
        if (guildData.twentyFourSeven) {
            broadcastPlayerState(player.guildId);
            return;
        }

        const channel = client.channels.cache.get(player.textId);
        broadcastPlayerState(player.guildId);
        
        setTimeout(async () => {
            if (player && !player.queue.current) {
                const updatedData = await db.getGuild(player.guildId);
                if (!updatedData.twentyFourSeven) {
                    player.destroy();
                }
            }
        }, config.bot.autoLeaveTimeout);
    });

    kazagumo.on('playerDestroy', (player) => {
        broadcastPlayerState(player.guildId);
    });

    kazagumo.on('playerUpdate', (player) => {
        broadcastPlayerState(player.guildId);
        
        // Optionally update the Now Playing message dynamically if it exists
        const msg = player.data.get('message');
        if (msg && player.queue.current) {
            // Rate limits make this tricky to update every second, so usually only emit to websocket.
            // But if we strictly wanted the progress bar in discord to update, we'd do it here.
            // Skipping discord message edits on every tick to avoid rate limits (Discord limit is 5 edits/5sec).
        }
    });
}
