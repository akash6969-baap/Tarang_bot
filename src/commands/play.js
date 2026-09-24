import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';
import { validateVoiceState } from '../utils/voiceValidator.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube, Spotify, etc.')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song name or URL')
                .setRequired(true)
                .setAutocomplete(true)
        ),
        
    async autocomplete(interaction, client) {
        const query = interaction.options.getString('query');
        if (!query) return interaction.respond([]);

        try {
            const res = await client.kazagumo.search(query);
            if (!res.tracks.length) return interaction.respond([]);

            const choices = res.tracks.slice(0, 5).map(track => ({
                name: `${track.title} - ${track.author}`.substring(0, 100),
                value: track.uri
            }));

            await interaction.respond(choices);
        } catch (error) {
            await interaction.respond([]);
        }
    },

    async execute(interaction, client) {
        const query = interaction.options.getString('query');
        if (!query) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Please provide a search query (e.g. `!play <song name>`).')] 
            });
        }
        
        let player = client.kazagumo.players.get(interaction.guild.id);
        const voiceError = validateVoiceState(interaction, player);
        if (voiceError) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(voiceError)] 
            });
        }
        
        const member = interaction.member;

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        let res;
        try {
            console.log(`[DEBUG] Starting Kazagumo search for query: ${query}`);
            res = await client.kazagumo.search(query, { requester: member.user });
            console.log(`[DEBUG] Search completed, found ${res.tracks.length} tracks.`);
        } catch (e) {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('There was an error searching for the song.')]
            });
        }

        if (!res.tracks.length) {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('No results found!')]
            });
        }

        player = client.kazagumo.players.get(interaction.guild.id);
        if (!player) {
            console.log(`[DEBUG] Creating Kazagumo player...`);
            player = await client.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: member.voice.channel.id,
                volume: client.config.bot.defaultVolume,
                deaf: true
            });
            console.log(`[DEBUG] Player created successfully.`);
        } else {
            // Always update the text channel to the latest channel where a command was used
            player.textId = interaction.channel.id;
        }

        if (res.type === 'PLAYLIST') {
            for (const track of res.tracks) {
                player.queue.add(track);
            }
            if (!player.playing && !player.paused) player.play();
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer('Playlist Added', `Added **${res.tracks.length}** tracks from **${res.playlistName}**`)]
            });
        } else {
            const track = res.tracks[0];
            player.queue.add(track);
            if (!player.playing && !player.paused) player.play();
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer('Track Added', `Added **${track.title}** to the queue.`)]
            });
        }
    }
};
