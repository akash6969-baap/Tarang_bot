import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { db } from '../utils/db.js';
import { createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('djrole')
        .setDescription('Set or remove the DJ role for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to set as DJ (leave empty to remove)')
                .setRequired(false)
        ),
        
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        
        if (!role) {
            await db.setDjRole(interaction.guild.id, null);
            return interaction.reply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer('DJ Role Removed', 'Anyone can use music commands now.')]
            });
        }

        await db.setDjRole(interaction.guild.id, role.id);
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer('DJ Role Set', `DJ Role has been set to <@&${role.id}>. Only users with this role can use core music commands.`)]
        });
    }
};
