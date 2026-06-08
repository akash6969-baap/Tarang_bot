import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Sends an announcement to all servers. (Owner Only)')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The announcement message')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const msg = interaction.options.getString('message');
        await interaction.deferReply({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });

        let successCount = 0;
        let failCount = 0;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📢 ${client.user.username} Updates`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${msg}`));

        for (const guild of client.guilds.cache.values()) {
            try {
                let channel = guild.systemChannel;
                if (!channel) {
                    channel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(client.user).has('SendMessages'));
                }
                if (channel) {
                    await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.success} Broadcast Sent`, `Sent to **${successCount}** servers. Failed in **${failCount}** servers.`)]
        });
    }
};
