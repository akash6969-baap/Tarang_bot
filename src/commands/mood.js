import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

const MOOD_PLAYLISTS = {
    happy: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC', // Spotify Happy Hits
    sad: 'https://open.spotify.com/playlist/37i9dQZF1DX7qK8ma5wgG1', // Spotify Sad Songs
    chill: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdVIP59V', // Spotify Chill Hits
    party: 'https://open.spotify.com/playlist/37i9dQZF1DXaXB8fQg7xif', // Spotify Dance Party
    workout: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7bg' // Spotify Beast Mode
};

export default {
    data: new SlashCommandBuilder()
        .setName('mood')
        .setDescription('Plays a curated playlist based on your mood.')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('Select your mood')
                .setRequired(true)
                .addChoices(
                    { name: 'Happy 😊', value: 'happy' },
                    { name: 'Sad 😢', value: 'sad' },
                    { name: 'Chill 😌', value: 'chill' },
                    { name: 'Party 🎉', value: 'party' },
                    { name: 'Workout 💪', value: 'workout' }
                )
        ),
        
    async execute(interaction, client) {
        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in a voice channel to play music.')] 
            });
        }

        let player = client.kazagumo.players.get(interaction.guild.id);
        if (!player) {
            player = await client.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: memberChannel.id,
                volume: client.config.bot.defaultVolume,
                deaf: true
            });
        } else if (player.voiceId !== memberChannel.id) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('I am currently playing music in another channel.')] 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const mood = interaction.options.getString('type');
        const url = MOOD_PLAYLISTS[mood];

        const res = await client.kazagumo.search(url, { requester: interaction.user });

        if (!res || !res.tracks.length) {
            return interaction.editReply({ 
                components: [createErrorContainer('Failed to load the mood playlist. Please try again.')] 
            });
        }

        if (res.type === 'PLAYLIST') {
            for (const track of res.tracks) {
                player.queue.add(track);
            }
            await interaction.editReply({ 
                components: [createSuccessContainer(`${emojis.success} Mood Selected`, `Added the **${mood.charAt(0).toUpperCase() + mood.slice(1)}** playlist to the queue! (${res.tracks.length} tracks)`)]
            });
        } else {
            player.queue.add(res.tracks[0]);
            await interaction.editReply({ 
                components: [createSuccessContainer(`${emojis.success} Mood Selected`, `Added a **${mood}** track to the queue!`)]
            });
        }

        if (!player.playing && !player.paused) {
            player.play();
        }
    }
};
