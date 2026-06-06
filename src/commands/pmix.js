import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pmix')
        .setDescription('Play your custom playlist in the voice channel.')
        .addStringOption(option => 
            option.setName('playlist')
                .setDescription('Name of your playlist')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        const name = interaction.options.getString('playlist');
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in a voice channel to play music.')] 
            });
        }

        const existing = await db.getPlaylist(interaction.user.id, name);
        if (!existing) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`You don't have a playlist named **${name}**.`)]
            });
        }

        if (existing.tracks.length === 0) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('This playlist is empty. Use `/addsong` to add some tracks first!')]
            });
        }

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        let player = client.kazagumo.players.get(interaction.guild.id);
        if (!player) {
            player = await client.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: member.voice.channel.id,
                volume: client.config.bot.defaultVolume,
                deaf: true
            });
        } else {
            if (player.voiceId !== member.voice.channel.id) {
                return interaction.editReply({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [createErrorContainer('You must be in the same voice channel as me.')] 
                });
            }
            player.textId = interaction.channel.id;
        }

        // We stored minimal track data in the database.
        // Kazagumo expects track objects. Kazagumo requires Track objects.
        // But since we just saved track.uri, we can resolve them.
        // To avoid massive delays, we will resolve them and add them.
        
        let addedCount = 0;
        
        for (const trackData of existing.tracks) {
            try {
                // To safely add tracks, we will do a search per track URI
                const res = await client.kazagumo.search(trackData.uri, { requester: interaction.user });
                if (res.tracks.length > 0) {
                    player.queue.add(res.tracks[0]);
                    addedCount++;
                }
            } catch (e) {
                // Ignore failed tracks to keep the playlist loading
            }
        }

        if (!player.playing && !player.paused) player.play();

        return interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('▶️ Playlist Loaded', `Successfully loaded **${addedCount}** tracks from your playlist **${existing.name}**!`)]
        });
    }
};
