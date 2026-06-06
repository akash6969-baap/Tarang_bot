import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and clears the queue.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is no music playing right now.')] 
            });
        }

        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        player.destroy();
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.stop} Stopped`, 'The music has been stopped and the queue has been cleared.')]
        });
    }
};
