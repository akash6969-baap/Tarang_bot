import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('playlistimport')
        .setDescription('Import an external playlist (e.g. YouTube) to your custom playlist.')
        .addStringOption(option => 
            option.setName('playlist')
                .setDescription('Name of your custom playlist')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('url')
                .setDescription('The URL of the external playlist')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const name = interaction.options.getString('playlist');
        const url = interaction.options.getString('url');

        const existing = await db.getPlaylist(interaction.user.id, name);
        if (!existing) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer(`You don't have a playlist named **${name}**.`)]
            });
        }

        let res;
        try {
            res = await client.kazagumo.search(url, { requester: interaction.user });
        } catch (e) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('There was an error loading the playlist URL.')]
            });
        }

        if (res.type !== 'PLAYLIST' || !res.tracks.length) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('The URL provided is not a valid playlist or contains no tracks.')]
            });
        }

        const currentLength = existing.tracks.length;
        const remainingSpace = 100 - currentLength;

        if (remainingSpace <= 0) {
            return interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('Your playlist is already full! (Max 100 tracks)')]
            });
        }

        const tracksToAdd = res.tracks.slice(0, remainingSpace).map(track => ({
            title: track.title,
            author: track.author,
            uri: track.uri,
            length: track.length,
            isStream: track.isStream
        }));

        const updatedTracks = [...existing.tracks, ...tracksToAdd];
        await db.updatePlaylist(interaction.user.id, name, updatedTracks);

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('📥 Playlist Imported', `Successfully imported **${tracksToAdd.length}** tracks from **${res.playlistName}** into **${existing.name}**.\n*(Note: Custom playlists are capped at 100 tracks.)*`)]
        });
    }
};
