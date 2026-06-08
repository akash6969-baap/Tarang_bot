import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Execute arbitrary JavaScript code. (Owner Only)')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to execute')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const code = interaction.options.getString('code');
        try {
            // Using Function constructor instead of eval for slight safety, though both are dangerous
            const result = await Function('client', 'interaction', `return (async () => { ${code} })();`)(client, interaction);
            const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
            
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createSuccessContainer(`${emojis.success} Code Executed`, `\`\`\`js\n${output ? output.slice(0, 1900) : 'Done.'}\n\`\`\``)]
            });
        } catch (error) {
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`\`\`\`js\n${error.message}\n\`\`\``)]
            });
        }
    }
};
