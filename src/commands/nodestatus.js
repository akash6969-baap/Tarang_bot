import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { emojis } from '../utils/emojis.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nodestatus')
        .setDescription('Shows detailed information about all connected music nodes.'),
        
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const nodes = [...client.kazagumo.shoukaku.nodes.values()];
        
        if (nodes.length === 0) {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('No nodes are currently connected.'))]
            });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📡 Lavalink Node Status`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        for (const node of nodes) {
            const stats = node.stats;
            const isConnected = node.state === 1 || node.state === 'CONNECTED';
            
            let pingText = '`Connected`';
            if (isConnected) {
                try {
                    const start = Date.now();
                    await node.rest.getLavalinkInfo();
                    pingText = `\`${Date.now() - start}ms\``;
                } catch {
                    // Ignore, fallback to 'Connected'
                }
            } else {
                pingText = '`Offline` 🔴';
            }

            if (!stats) {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${node.name}\n> State: ${pingText} (No stats available yet)`));
                continue;
            }

            const uptimeMatch = (stats.uptime / 1000 / 60 / 60).toFixed(1);
            const cpuLoad = (stats.cpu.systemLoad * 100).toFixed(1);
            const lavalinkLoad = (stats.cpu.lavalinkLoad * 100).toFixed(1);
            const memoryAllocated = (stats.memory.allocated / 1024 / 1024).toFixed(0);
            
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `### ${node.name}\n` +
                `> **Latency:** ${pingText}\n` +
                `> **Players:** \`${stats.playingPlayers} / ${stats.players}\`\n` +
                `> **Uptime:** \`${uptimeMatch}h\`\n` +
                `> **CPU Load:** System: \`${cpuLoad}%\` | Lavalink: \`${lavalinkLoad}%\`\n` +
                `> **Memory:** \`${memoryAllocated} MB\` allocated`
            ));
        }

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
