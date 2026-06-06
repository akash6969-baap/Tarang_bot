import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('removesong')
        .setDescription('Remove a song from your custom playlist.')
        .addStringOption(option => 
            option.setName('playlist')
                .setDescription('Name of your playlist')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The position of the track to remove')
                .setRequired(true)
                .setMinValue(1)
        ),
        
    async execute(interaction, client) {
        const name = interaction.options.getString('playlist');
        const position = interaction.options.getInteger('position');

        if (!position || position < 1) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Please provide a valid position.')]
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
                components: [createErrorContainer('This playlist is already empty.')]
            });
        }

        if (position > existing.tracks.length) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Invalid position. The playlist only has ${existing.tracks.length} tracks.`)]
            });
        }

        const trackToRemove = existing.tracks[position - 1];
        
        // Remove track
        const updatedTracks = [...existing.tracks];
        updatedTracks.splice(position - 1, 1);
        
        await db.updatePlaylist(interaction.user.id, name, updatedTracks);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('🗑️ Song Removed', `Removed **${trackToRemove.title}** from playlist **${existing.name}**.`)]
        });
    }
};
