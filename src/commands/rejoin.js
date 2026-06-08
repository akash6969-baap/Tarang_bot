import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rejoin')
        .setDescription('Forces the bot to leave and immediately rejoin the voice channel.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('I am not connected to a voice channel.')] 
            });
        }

        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        const currentTrack = player.queue.current;
        const queueTracks = [...player.queue];
        const voiceId = player.voiceId;
        const textId = player.textId;
        const volume = player.volume;

        player.destroy();

        setTimeout(async () => {
            const newPlayer = await client.kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: textId,
                voiceId: voiceId,
                volume: volume,
                deaf: true
            });

            if (currentTrack) {
                newPlayer.queue.add(currentTrack);
            }
            if (queueTracks.length > 0) {
                newPlayer.queue.add(queueTracks);
            }

            if (!newPlayer.playing && !newPlayer.paused && newPlayer.queue.length > 0) {
                newPlayer.play();
            }

        }, 1000);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.success} Rejoined`, 'I have reconnected to the voice channel.')]
        });
    }
};
