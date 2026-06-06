import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { formatDuration } from '../utils/musicUtils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Shows how long the bot has been online.'),
        
    async execute(interaction, client) {
        const uptime = client.uptime;
        
        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⏱️ Bot Uptime`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `The bot has been online for: **${formatDuration(uptime)}**`
            ));

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
