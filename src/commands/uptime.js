import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } from 'discord.js';

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
}

export default {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Shows how long the bot has been online.'),
        
    async execute(interaction, client) {
        const uptime = client.uptime;
        
        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Uptime`))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> 🟢 I have been online for **${formatUptime(uptime)}**`));

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
