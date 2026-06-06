import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('deleteplaylist')
        .setDescription('Delete an existing custom playlist.')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of the playlist to delete')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        const name = interaction.options.getString('name');

        const existing = await db.getPlaylist(interaction.user.id, name);
        if (!existing) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`You don't have a playlist named **${name}**.`)]
            });
        }

        await db.deletePlaylist(interaction.user.id, name);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('🗑️ Playlist Deleted', `Successfully deleted your custom playlist: **${name}**`)]
        });
    }
};
