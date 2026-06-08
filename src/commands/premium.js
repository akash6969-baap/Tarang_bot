import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';
import { db } from '../utils/db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Manage the Dual Premium System (Global Users & Premium Servers). (Owner Only)')
        .addSubcommandGroup(group => 
            group.setName('add')
                .setDescription('Grant Premium')
                .addSubcommand(sub => 
                    sub.setName('user')
                        .setDescription('Grant Global NoPrefix to a User')
                        .addStringOption(opt => opt.setName('id').setDescription('User ID').setRequired(true))
                )
                .addSubcommand(sub => 
                    sub.setName('server')
                        .setDescription('Unlock 24/7 and Filters for a Server')
                        .addStringOption(opt => opt.setName('id').setDescription('Server (Guild) ID').setRequired(true))
                )
        )
        .addSubcommandGroup(group => 
            group.setName('remove')
                .setDescription('Revoke Premium')
                .addSubcommand(sub => 
                    sub.setName('user')
                        .setDescription('Revoke Global NoPrefix from a User')
                        .addStringOption(opt => opt.setName('id').setDescription('User ID').setRequired(true))
                )
                .addSubcommand(sub => 
                    sub.setName('server')
                        .setDescription('Revoke Server Premium from a Server')
                        .addStringOption(opt => opt.setName('id').setDescription('Server (Guild) ID').setRequired(true))
                )
        ),
        
    async execute(interaction, client) {
        if (!client.config.bot.owners.includes(interaction.user.id)) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You are not authorized to use this command.')] 
            });
        }

        const group = interaction.options.getSubcommandGroup();
        const type = interaction.options.getSubcommand();
        const targetId = interaction.options.getString('id');

        if (group === 'add') {
            if (type === 'user') {
                await db.addGlobalPremium(targetId);
                return interaction.reply({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [createSuccessContainer(`${emojis.success} Global Premium Granted`, `Successfully granted **Global NoPrefix** to User **${targetId}**.`)]
                });
            } else if (type === 'server') {
                await db.setPremiumServer(targetId, true);
                return interaction.reply({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [createSuccessContainer(`${emojis.success} Server Premium Granted`, `Successfully unlocked 24/7 and Audio Filters for Server **${targetId}**.`)]
                });
            }
        }

        if (group === 'remove') {
            if (type === 'user') {
                await db.removeGlobalPremium(targetId);
                return interaction.reply({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [createSuccessContainer(`${emojis.success} Global Premium Revoked`, `Successfully revoked Global NoPrefix from User **${targetId}**.`)]
                });
            } else if (type === 'server') {
                await db.setPremiumServer(targetId, false);
                return interaction.reply({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [createSuccessContainer(`${emojis.success} Server Premium Revoked`, `Successfully locked Premium features for Server **${targetId}**.`)]
                });
            }
        }
    }
};
