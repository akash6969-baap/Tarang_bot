import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skipto')
        .setDescription('Skips to a specific position in the queue.')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The position to skip to')
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

        player.queue.splice(0, position - 1);
        player.skip();

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.skip} Skipped To`, `Skipped to position **${position}**.`)]
        });
    }
};
