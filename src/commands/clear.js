import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears all upcoming tracks in the queue.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || player.queue.length === 0) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There are no tracks in the queue to clear.')] 
            });
        }

        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        player.queue.clear();
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.trash} Queue Cleared`, 'All upcoming tracks have been removed.')]
        });
    }
};
