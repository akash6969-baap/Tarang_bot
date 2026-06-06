import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, buildNowPlaying } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the currently playing song.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || !player.queue.current) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is nothing playing right now.')] 
            });
        }

        const track = player.queue.current;

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [buildNowPlaying(track, player)]
        });
    }
};
