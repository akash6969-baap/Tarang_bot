import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';
import { formatDuration } from '../utils/musicUtils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('Saves the current song to your Direct Messages.'),
        
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || !player.queue.current) {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('There is nothing playing right now.')] 
            });
        }

        const track = player.queue.current;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎵 Saved Track`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **[${track.title}](${track.uri})**\n> **Artist:** ${track.author}\n> **Duration:** ${track.isStream ? 'LIVE' : formatDuration(track.length)}\n> **Saved from:** ${interaction.guild.name}`));

        try {
            await interaction.user.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
            await interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.success} Grabbed!`, 'Check your Direct Messages for the song details.')]
            });
        } catch (e) {
            await interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('I could not send you a Direct Message. Please check your privacy settings.')]
            });
        }
    }
};
