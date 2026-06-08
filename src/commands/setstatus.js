import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Change the bot\'s status text and activity type. (Owner Only)')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('The text to show in the status')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('type')
                .setDescription('The type of activity')
                .setRequired(false)
                .addChoices(
                    { name: 'Playing', value: 0 },
                    { name: 'Streaming', value: 1 },
                    { name: 'Listening', value: 2 },
                    { name: 'Watching', value: 3 },
                    { name: 'Custom', value: 4 },
                    { name: 'Competing', value: 5 }
                )
        )
        .addStringOption(option =>
            option.setName('status')
                .setDescription('The online status (online, idle, dnd, invisible)')
                .setRequired(false)
                .addChoices(
                    { name: 'Online', value: 'online' },
                    { name: 'Idle', value: 'idle' },
                    { name: 'Do Not Disturb', value: 'dnd' },
                    { name: 'Invisible', value: 'invisible' }
                )
        ),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const text = interaction.options.getString('text');
        const type = interaction.options.getInteger('type') ?? 2; // Default to Listening
        const status = interaction.options.getString('status') ?? 'online';

        try {
            client.user.setPresence({
                activities: [{ name: text, type: type }],
                status: status,
            });
            
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createSuccessContainer(`${emojis.success} Status Updated`, `Bot status changed successfully.\n> **Text:** ${text}\n> **State:** ${status}`)]
            });
        } catch (error) {
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Failed to update status: \`\`\`js\n${error.message}\n\`\`\``)]
            });
        }
    }
};
