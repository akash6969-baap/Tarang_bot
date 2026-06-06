import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a track from the queue.')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The position of the track to remove')
                .setRequired(true)
                .setMinValue(1)
        ),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || player.queue.length === 0) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There are no tracks in the queue.')] 
            });
        }

        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        const position = interaction.options.getInteger('position');
        if (!position || position > player.queue.length || position < 1) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Invalid position. The queue only has ${player.queue.length} tracks.`)] 
            });
        }

        const removed = player.queue[position - 1];
        player.queue.remove(position - 1);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.trash} Track Removed`, `Removed **${removed.title}** from the queue.`)]
        });
    }
};
