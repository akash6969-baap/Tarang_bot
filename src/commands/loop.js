import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggles loop mode.')
        .addStringOption(option => 
            option.setName('mode')
                .setDescription('The loop mode to set')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'none' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
        ),
        
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

        const mode = interaction.options.getString('mode');
        player.setLoop(mode);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.loop} Loop Mode`, `Loop mode has been set to: **${mode}**`)]
        });
    }
};
