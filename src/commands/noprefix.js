import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer, createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('noprefix')
        .setDescription('Manage No-Prefix users or roles for this server (Admin only).')
        .setDefaultMemberPermissions(8) // Administrator only
        .addSubcommand(subcommand => 
            subcommand.setName('add')
                .setDescription('Add a user or role to No-Prefix')
                .addUserOption(option => option.setName('user').setDescription('The user to give No-Prefix access'))
                .addRoleOption(option => option.setName('role').setDescription('The role to give No-Prefix access'))
        )
        .addSubcommand(subcommand => 
            subcommand.setName('remove')
                .setDescription('Remove a user or role from No-Prefix')
                .addUserOption(option => option.setName('user').setDescription('The user to remove'))
                .addRoleOption(option => option.setName('role').setDescription('The role to remove'))
        ),

    async execute(interaction, client) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('Only Administrators can manage No-Prefix settings.')]
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        if (!user && !role) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must specify either a user or a role.')]
            });
        }

        if (subcommand === 'add') {
            if (user) await db.addNoPrefix(interaction.guildId, 'user', user.id);
            if (role) await db.addNoPrefix(interaction.guildId, 'role', role.id);

            await interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [createSuccessContainer('✨ No-Prefix Added', `Successfully added No-Prefix access for ${user ? `<@${user.id}>` : ''} ${role ? `<@&${role.id}>` : ''}`)]
            });
        } else if (subcommand === 'remove') {
            if (user) await db.removeNoPrefix(interaction.guildId, 'user', user.id);
            if (role) await db.removeNoPrefix(interaction.guildId, 'role', role.id);

            await interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [createSuccessContainer('🗑️ No-Prefix Removed', `Successfully removed No-Prefix access for ${user ? `<@${user.id}>` : ''} ${role ? `<@&${role.id}>` : ''}`)]
            });
        }
    }
};
