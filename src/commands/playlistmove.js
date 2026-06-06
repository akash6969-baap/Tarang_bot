import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('playlistmove')
        .setDescription('Move a song to a new position in your custom playlist.')
        .addStringOption(option => 
            option.setName('playlist')
                .setDescription('Name of your playlist')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('track')
                .setDescription('The current position of the track')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The new position for the track')
                .setRequired(true)
                .setMinValue(1)
        ),
        
    async execute(interaction, client) {
        const name = interaction.options.getString('playlist');
        const trackPos = interaction.options.getInteger('track');
        const newPos = interaction.options.getInteger('position');

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
                components: [createErrorContainer('This playlist is empty.')]
            });
        }

        if (!trackPos || !newPos || trackPos < 1 || newPos < 1 || trackPos > existing.tracks.length || newPos > existing.tracks.length) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Invalid positions. Please provide numbers between 1 and ${existing.tracks.length}.`)]
            });
        }

        if (trackPos === newPos) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('The track is already in that position.')]
            });
        }

        const updatedTracks = [...existing.tracks];
        const track = updatedTracks[trackPos - 1];
        
        updatedTracks.splice(trackPos - 1, 1);
        updatedTracks.splice(newPos - 1, 0, track);
        
        await db.updatePlaylist(interaction.user.id, name, updatedTracks);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('↔️ Track Moved', `Moved **${track.title}** to position **${newPos}** in **${existing.name}**.`)]
        });
    }
};
