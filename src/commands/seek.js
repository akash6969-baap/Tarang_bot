import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { formatDuration } from '../utils/musicUtils.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a specific position in the current track.')
        .addIntegerOption(option => 
            option.setName('seconds')
                .setDescription('The position to seek to in seconds')
                .setRequired(true)
                .setMinValue(0)
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

        const currentTrack = player.queue.current;
        if (!currentTrack || currentTrack.isStream) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Cannot seek on a live stream.')] 
            });
        }

        const seconds = interaction.options.getInteger('seconds');
        if (seconds === null || seconds < 0) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Please provide a valid number of seconds to seek to.')] 
            });
        }
        const ms = seconds * 1000;

        if (ms >= currentTrack.length) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Cannot seek beyond the track's length (${formatDuration(currentTrack.length)}).`)] 
            });
        }

        player.seek(ms);
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('⏩ Seeked', `Seeked to **${formatDuration(ms)}**.`)]
        });
    }
};
