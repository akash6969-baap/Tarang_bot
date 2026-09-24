import { emojis, emojiIds } from '../utils/emojis.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('24x7')
        .setDescription('Toggles 24/7 mode (prevents bot from leaving when empty).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addBooleanOption(option => 
            option.setName('enable')
                .setDescription('Enable or disable 24/7 mode')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        if (!(await db.isPremiumServer(interaction.guildId))) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('24/7 Mode is a **Premium Server** exclusive feature. Upgrade this server to unlock it!')] 
            });
        }

        const enable = interaction.options.getBoolean('enable');
        await db.set24x7(interaction.guild.id, enable);
        
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('24/7 Mode Updated', `24/7 mode has been **${enable ? `enabled ${emojis.enabled}` : `disabled ${emojis.disabled}`}**.`)]
        });
    }
};
