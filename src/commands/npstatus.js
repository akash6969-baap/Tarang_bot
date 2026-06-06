import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { createErrorContainer } from '../utils/components.js';
import { formatDuration } from '../utils/musicUtils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('npstatus')
        .setDescription('Shows a detailed status of the currently playing track.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guildId);
        
        if (!player || !player.queue.current) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is nothing playing right now.')] 
            });
        }

        const track = player.queue.current;
        const position = player.position;
        const duration = track.length;
        
        const progress = Math.min(position / duration, 1);
        const barLength = 15;
        const completed = Math.floor(progress * barLength);
        const remaining = barLength - completed;
        
        const progressBar = '▬'.repeat(completed) + '🔘' + '▬'.repeat(remaining);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎶 Now Playing Status`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `### [${track.title}](${track.uri})\n` +
                `**Author:** ${track.author}\n` +
                `**Requester:** ${track.requester ? `<@${track.requester.id}>` : 'Unknown'}\n\n` +
                `\`${formatDuration(position)}\` ${progressBar} \`${track.isStream ? 'LIVE' : formatDuration(duration)}\``
            ));

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
