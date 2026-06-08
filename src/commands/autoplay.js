import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggles automatic playing of related songs when the queue ends.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is no active player right now.')] 
            });
        }

        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        const autoplayEnabled = player.data.get('autoplay') || false;
        
        player.data.set('autoplay', !autoplayEnabled);

        if (!autoplayEnabled) {
            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.success} Autoplay Enabled`, 'I will automatically play related songs when the queue ends.')]
            });
        } else {
            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.error || '❌'} Autoplay Disabled`, 'I will no longer automatically play related songs.')]
            });
        }
    }
};
