import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the current song.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || !player.playing) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is nothing playing right now.')] 
            });
        }

        const memberChannel = interaction.member.voice.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        if (player.paused) {
            player.pause(false);
            return interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.play} Resumed`, 'The player has been resumed.')]
            });
        }

        player.pause(true);
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.pause} Paused`, 'The player has been paused.')]
        });
    }
};
