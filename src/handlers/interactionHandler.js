import { emojis, emojiIds } from '../utils/emojis.js';
import { MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer, buildNowPlaying } from '../utils/components.js';
import { db } from '../utils/db.js';

export async function handleInteraction(interaction, client) {
    const customId = interaction.customId;
    const player = client.kazagumo.players.get(interaction.guildId);

    if (customId.startsWith('music_') && !player) {
        return interaction.reply({ 
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [createErrorContainer('There is no music playing in this server.')] 
        });
    }

    const guildData = await db.getGuild(interaction.guildId);
    const djRole = guildData?.djRole;
    if (djRole && customId.startsWith('music_')) {
        if (!interaction.member.roles.cache.has(djRole) && !interaction.member.permissions.has('ManageGuild')) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`${emojis.music} You need the <@&${djRole}> role to use this button!`)] 
            });
        }
    }

    try {
        let title = '';
        let desc = '';

        if (customId === 'music_pause') {
            const isPaused = player.paused;
            player.pause(!isPaused);
            title = isPaused ? `${emojis.play} Resumed` : `${emojis.pause} Paused`;
        } else if (customId === 'music_skip') {
            player.skip();
            title = `${emojis.skip} Skipped`;
        } else if (customId === 'music_previous') {
            if (player.queue.previous) {
                const prevTrack = player.queue.previous;
                player.queue.unshift(player.queue.current);
                player.queue.unshift(prevTrack);
                player.skip();
                title = `${emojis.previous} Playing previous track`;
            } else {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                    components: [createErrorContainer('There is no previous track.')]
                });
            }
        } else if (customId === 'music_stop') {
            player.destroy();
            title = `${emojis.stop} Stopped`;
            desc = 'Left the channel and cleared the queue.';
        } else if (customId === 'music_loop') {
            let nextMode = 'none';
            if (player.loop === 'none') nextMode = 'track';
            else if (player.loop === 'track') nextMode = 'queue';
            player.setLoop(nextMode);
            title = `${emojis.loop} Loop Updated`;
            desc = `Loop mode set to: **${nextMode}**`;
        } else if (customId === 'music_shuffle') {
            player.queue.shuffle();
            title = `${emojis.shuffle} Shuffled`;
            desc = 'The queue has been shuffled.';
        } else if (customId === 'music_volume') {
            const vol = parseInt(interaction.values[0]);
            player.setVolume(vol);
            player.volume = vol; // Force synchronous update for the UI rebuild
            title = `${emojis.music} Volume Updated`;
            desc = `Volume set to **${vol}%**`;
        } else if (customId === 'music_queue') {
            // Trigger queue command execution logic
            const queueCommand = client.commands.get('queue');
            if (queueCommand) return queueCommand.execute(interaction, client);
        } else if (customId === 'music_lyrics') {
            const lyricsCommand = client.commands.get('lyrics');
            if (lyricsCommand) return lyricsCommand.execute(interaction, client);
        } else if (customId.startsWith('queue_')) {
            const { handleQueueInteraction } = await import('../commands/queue.js');
            return handleQueueInteraction(interaction, client);
        } else if (customId === 'help_category') {
            const { handleHelpInteraction } = await import('../commands/help.js');
            return handleHelpInteraction(interaction, client);
        } else if (customId === 'stats_category_select') {
            const { handleStatsInteraction } = await import('../commands/stats.js');
            return handleStatsInteraction(interaction, client);
        }

        // We only edit the main message to reflect new state if it's a music control
        if (customId.startsWith('music_') && player && player.queue.current) {
            if (interaction.message) {
                await interaction.update({
                    flags: MessageFlags.IsComponentsV2,
                    components: [buildNowPlaying(player.queue.current, player)]
                }).catch(err => console.error('[Interaction Update Error]:', err));
            }
        } else if (!interaction.replied) {
            await interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(title, desc || 'Action completed successfully.')]
            }).catch(() => {});
        }
    } catch (e) {
        console.error(e);
        if (!interaction.replied) {
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('An error occurred.')] 
            }).catch(() => {});
        }
    }
}
