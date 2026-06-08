import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverlist')
        .setDescription('Shows a list of all servers the bot is in. (Owner Only)'),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const guilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).map(g => g);
        
        let description = '';
        for (let i = 0; i < Math.min(20, guilds.length); i++) {
            description += `> **${i + 1}.** ${guilds[i].name} (\`${guilds[i].id}\`) - 👥 ${guilds[i].memberCount} members\n`;
        }

        if (guilds.length > 20) {
            description += `\n> *...and ${guilds.length - 20} more servers.*`;
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📊 Server List (${guilds.length} total)`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

        await interaction.reply({ 
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [container] 
        });
    }
};
