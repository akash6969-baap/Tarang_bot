import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

const filters = {
    '3d': { rotation: { rotationHz: 0.2 } },
    'alienvibes': { tremolo: { frequency: 10.0, depth: 0.8 }, vibrato: { frequency: 10.0, depth: 0.8 } },
    'ambient': { timescale: { speed: 0.9, pitch: 0.9, rate: 1.1 } },
    'bass': { equalizer: [{band:0,gain:0.2},{band:1,gain:0.15},{band:2,gain:0.1}] },
    'bassboost': { equalizer: [{band:0,gain:0.3},{band:1,gain:0.2},{band:2,gain:0.1},{band:3,gain:0.05},{band:4,gain:0.0},{band:5,gain:-0.05},{band:6,gain:-0.1},{band:7,gain:-0.1},{band:8,gain:-0.1},{band:9,gain:-0.1},{band:10,gain:-0.1},{band:11,gain:-0.1},{band:12,gain:-0.1},{band:13,gain:-0.1},{band:14,gain:-0.1}] },
    'chillwave': { timescale: { speed: 0.9, pitch: 0.95, rate: 0.9 }, lowPass: { smoothing: 15 } },
    'china': { timescale: { speed: 0.75, pitch: 1.25, rate: 1.0 } },
    'chipmunk': { timescale: { speed: 1.05, pitch: 1.35, rate: 1.25 } },
    'dance': { timescale: { speed: 1.2, pitch: 1.0, rate: 1.0 } },
    'darthvader': { timescale: { speed: 0.975, pitch: 0.5, rate: 0.8 } },
    'daycore': { timescale: { pitch: 0.8, rate: 0.8 } },
    'doubletime': { timescale: { speed: 2.0 } },
    'haunted': { tremolo: { frequency: 5.0, depth: 0.5 }, vibrato: { frequency: 5.0, depth: 0.5 } },
    'lofi': { timescale: { speed: 0.9, pitch: 0.8, rate: 0.9 }, lowPass: { smoothing: 20 } },
    'muffled': { lowPass: { smoothing: 20 } },
    'nightcore': { timescale: { pitch: 1.2, rate: 1.1 } },
    'slowed': { timescale: { speed: 0.8, pitch: 0.9, rate: 0.8 } },
    'soft': { lowPass: { smoothing: 10 } },
    'softfocus': { lowPass: { smoothing: 12 }, equalizer: [{band:0,gain:-0.1},{band:1,gain:-0.1},{band:2,gain:-0.1}] },
    'softguitar': { equalizer: [{band:0,gain:-0.2},{band:1,gain:-0.2},{band:2,gain:-0.2},{band:3,gain:0.1},{band:4,gain:0.1},{band:5,gain:0.1}] },
    'space': { rotation: { rotationHz: 0.05 }, tremolo: { frequency: 2.0, depth: 0.3 } },
    'underwater': { lowPass: { smoothing: 20 }, equalizer: [{band:0,gain:0.3},{band:1,gain:0.2},{band:2,gain:0.1},{band:3,gain:0.0},{band:4,gain:0.0},{band:5,gain:-0.1},{band:6,gain:-0.2},{band:7,gain:-0.3},{band:8,gain:-0.3},{band:9,gain:-0.3},{band:10,gain:-0.3},{band:11,gain:-0.3},{band:12,gain:-0.3},{band:13,gain:-0.3},{band:14,gain:-0.3}] },
    'warmpad': { lowPass: { smoothing: 15 }, equalizer: [{band:0,gain:0.1},{band:1,gain:0.1},{band:2,gain:0.05},{band:10,gain:-0.1},{band:11,gain:-0.1},{band:12,gain:-0.1}] },
    'reset': 'reset'
};

const filterChoices = Object.keys(filters).map(f => ({ name: f.charAt(0).toUpperCase() + f.slice(1), value: f }));

export default {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply an audio filter to the current track.')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('The filter to apply')
                .setRequired(true)
                .addChoices(...filterChoices)
        ),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guildId || interaction.guild?.id);
        if (!player || !player.playing) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is nothing playing right now.')] 
            });
        }

        const memberChannel = interaction.member?.voice?.channel;
        if (!memberChannel || memberChannel.id !== player.voiceId) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in the same voice channel as me.')] 
            });
        }

        // For text commands, the option might not be properly mapped if we pass it manually, 
        // but CommandContext handles it. However, if they typed `!lofi`, the eventHandler
        // will pass 'lofi' as args[0] which maps to getString('type').
        const type = interaction.options.getString('type')?.toLowerCase();

        if (!filters[type]) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Invalid filter selected.')] 
            });
        }

        if (type === 'reset') {
            player.shoukaku.clearFilters();
            return interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer('🎛️ Filters Reset', 'All audio filters have been cleared.')]
            });
        }

        player.shoukaku.setFilters(filters[type]);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('🎛️ Filter Applied', `Successfully applied the **${type}** filter.`)]
        });
    }
};
