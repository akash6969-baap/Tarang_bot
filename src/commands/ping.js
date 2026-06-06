import { emojis, emojiIds } from '../utils/emojis.js';
import { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    MessageFlags 
} from 'discord.js';
import { getMongoPing } from '../utils/mongoose.js';
import { getRedisPing } from '../utils/redisCache.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the bot, database, cache, and node latencies.'),
        
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        // Fetch MongoDB latency
        const mongoPing = await getMongoPing();
        const mongoText = mongoPing === -1 ? '`Offline` 🔴' : `\`${mongoPing}ms\``;

        // Fetch Redis latency
        const redisPing = await getRedisPing();
        const redisText = redisPing === -1 ? '`Offline` 🔴' : `\`${redisPing}ms\``;

        // Fetch Lavalink Nodes
        let nodesText = '';
        const nodes = client.kazagumo.shoukaku.nodes;
        if (nodes.size === 0) {
            nodesText = '> No Lavalink nodes connected.\n';
        } else {
            const nodePromises = Array.from(nodes.values()).map(async (node, index) => {
                const i = index + 1;
                const isConnected = node.state === 1 || node.state === 'CONNECTED';
                if (!isConnected) {
                    return `> **Node ${i}:** \`Offline\` 🔴`;
                }
                
                try {
                    const start = Date.now();
                    await node.rest.getLavalinkInfo();
                    const ping = Date.now() - start;
                    return `> **Node ${i}:** \`${ping}ms\``;
                } catch {
                    return `> **Node ${i}:** \`Connected\``;
                }
            });

            const nodeResults = await Promise.all(nodePromises);
            nodesText = nodeResults.join('\n') + '\n';
        }

        const wsPing = client.ws.ping < 0 ? 'Calculating...' : `${client.ws.ping}ms`;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.ping} System Status`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> **Bot Gateway:** \`${wsPing}\`\n` +
                    `> **MongoDB:** ${mongoText}\n` +
                    `> **Redis Cache:** ${redisText}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${emojis.node} Lavalink Nodes\n` +
                    `${nodesText}`
                )
            );

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
