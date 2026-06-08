import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';
import { db } from '../utils/db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklists a user or server. (Owner Only)')
        .addSubcommand(subcmd => 
            subcmd.setName('add')
                .setDescription('Add to blacklist')
                .addStringOption(opt => opt.setName('type').setDescription('user or guild').setRequired(true).addChoices({name: 'User', value: 'user'}, {name: 'Guild', value: 'guild'}))
                .addStringOption(opt => opt.setName('id').setDescription('Target ID').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
        )
        .addSubcommand(subcmd => 
            subcmd.setName('remove')
                .setDescription('Remove from blacklist')
                .addStringOption(opt => opt.setName('id').setDescription('Target ID').setRequired(true))
        ),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const subcmd = interaction.options.getSubcommand();
        const targetId = interaction.options.getString('id');

        if (subcmd === 'add') {
            const type = interaction.options.getString('type');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            await db.addBlacklist(targetId, type, reason);
            return interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.success} Blacklisted`, `Successfully blacklisted ${type} **${targetId}** for: ${reason}`)]
            });
        }

        if (subcmd === 'remove') {
            await db.removeBlacklist(targetId);
            return interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.success} Removed`, `Successfully removed **${targetId}** from the blacklist.`)]
            });
        }
    }
};
