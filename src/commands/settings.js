import { emojis, emojiIds } from '../utils/emojis.js';
import { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    MessageFlags 
} from 'discord.js';
import { db } from '../utils/db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View the current server settings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
        
    async execute(interaction) {
        const guildData = await db.getGuild(interaction.guild.id);
        
        let djRoleDisplay = 'None';
        if (guildData.djRole) {
            const role = interaction.guild.roles.cache.get(guildData.djRole);
            djRoleDisplay = role ? `<@&${role.id}>` : 'Invalid Role';
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.settings} Settings for ${interaction.guild.name}`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**DJ Role:** ${djRoleDisplay}\n**24/7 Mode:** ${guildData.twentyFourSeven ? `Enabled ${emojis.enabled}` : `Disabled ${emojis.disabled}`}`)
            );

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
