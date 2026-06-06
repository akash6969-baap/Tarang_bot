import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { db } from '../utils/db.js';
import { createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('listsongs')
        .setDescription('List all songs in your custom playlist.')
        .addStringOption(option => 
            option.setName('playlist')
                .setDescription('Name of your playlist')
                .setRequired(false) // Make it optional so we can list ALL playlists if no name is provided
        ),
        
    async execute(interaction, client) {
        const name = interaction.options.getString('playlist');

        if (!name) {
            // List all playlists for this user
            const playlists = await db.getUserPlaylists(interaction.user.id);
            
            if (playlists.length === 0) {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                    components: [createErrorContainer('You do not have any custom playlists.')]
                });
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📁 Your Custom Playlists`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            let listText = '';
            playlists.forEach((p, i) => {
                listText += `**${i + 1}.** \`${p.name}\` (${p.tracks.length} tracks)\n`;
            });

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(listText));

            return interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
            });
        }

        // List tracks in specific playlist
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
                components: [createErrorContainer(`Playlist **${existing.name}** is empty.`)]
            });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎶 ${existing.name} (${existing.tracks.length} tracks)`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // Pagination not natively supported easily in text display unless we use action rows, so limit to 20 or slice it.
        const maxDisplay = 20;
        const displayTracks = existing.tracks.slice(0, maxDisplay);
        
        let trackList = '';
        displayTracks.forEach((t, i) => {
            trackList += `**${i + 1}.** [${t.title.substring(0, 50)}](${t.uri}) - *${t.author}*\n`;
        });

        if (existing.tracks.length > maxDisplay) {
            trackList += `\n*...and ${existing.tracks.length - maxDisplay} more tracks.*`;
        }

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(trackList));

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    }
};
