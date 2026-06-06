import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Moves a track to a new position in the queue.')
        .addIntegerOption(option => 
            option.setName('track')
                .setDescription('The current position of the track')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('The new position for the track')
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

        const trackPos = interaction.options.getInteger('track');
        const newPos = interaction.options.getInteger('position');

        if (!trackPos || !newPos || trackPos < 1 || newPos < 1 || trackPos > player.queue.length || newPos > player.queue.length) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Invalid position. Please provide valid numbers between 1 and ${player.queue.length}.`)] 
            });
        }

        if (trackPos === newPos) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('The track is already in that position.')] 
            });
        }

        const track = player.queue[trackPos - 1];
        player.queue.remove(trackPos - 1);
        player.queue.splice(newPos - 1, 0, track);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.music} Track Moved`, `Moved **${track.title}** to position **${newPos}**.`)]
        });
    }
};
