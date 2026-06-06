import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('createplaylist')
        .setDescription('Create a new custom playlist.')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of the new playlist')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        const name = interaction.options.getString('name');
        
        // Prevent extremely long names
        if (name.length > 32) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Playlist name cannot exceed 32 characters.')]
            });
        }

        const existing = await db.getPlaylist(interaction.user.id, name);
        if (existing) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`You already have a playlist named **${name}**.`)]
            });
        }

        const playlists = await db.getUserPlaylists(interaction.user.id);
        if (playlists.length >= 10) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You have reached the maximum limit of 10 custom playlists.')]
            });
        }

        await db.createPlaylist(interaction.user.id, name);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('📁 Playlist Created', `Successfully created your custom playlist: **${name}**\nUse \`/addsong\` to add tracks to it!`)]
        });
    }
};
