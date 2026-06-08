import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leaveserver')
        .setDescription('Force the bot to leave a specific server. (Owner Only)')
        .addStringOption(option => 
            option.setName('id')
                .setDescription('The ID of the server to leave')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const guildId = interaction.options.getString('id');
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`I am not in a server with ID **${guildId}**.`)] 
            });
        }

        try {
            await guild.leave();
            await interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.success} Left Server`, `Successfully left **${guild.name}** (\`${guild.id}\`).`)]
            });
        } catch (error) {
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Failed to leave the server: ${error.message}`)]
            });
        }
    }
};
