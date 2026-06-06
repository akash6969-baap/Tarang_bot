import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('addsong')
        .setDescription('Add a song to your custom playlist.')
        .addStringOption(option => 
            option.setName('playlist')
                .setDescription('Name of your playlist')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song name or URL to add')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const name = interaction.options.getString('playlist');
        const query = interaction.options.getString('query');

        const existing = await db.getPlaylist(interaction.user.id, name);
        if (!existing) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer(`You don't have a playlist named **${name}**.`)]
            });
        }

        if (existing.tracks.length >= 100) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('Your playlist is full! Maximum 100 tracks per playlist.')]
            });
        }

        let res;
        try {
            res = await client.kazagumo.search(query, { requester: interaction.user });
        } catch (e) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('There was an error searching for the song.')]
            });
        }

        if (!res.tracks.length) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('No results found for your query!')]
            });
        }

        const track = res.tracks[0];
        
        // Save minimal track data to avoid hitting MongoDB document limits
        const trackData = {
            title: track.title,
            author: track.author,
            uri: track.uri,
            length: track.length,
            isStream: track.isStream
        };

        const updatedTracks = [...existing.tracks, trackData];
        await db.updatePlaylist(interaction.user.id, name, updatedTracks);

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('🎵 Song Added', `Added **${track.title}** to playlist **${existing.name}**.`)]
        });
    }
};
