import { emojis } from '../utils/emojis.js';
import { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags 
} from 'discord.js';
import { getMongoPing } from '../utils/mongoose.js';
import { getRedisPing } from '../utils/redisCache.js';
import { formatDuration } from '../utils/musicUtils.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with detailed system diagnostics and latencies.'),
        
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
        const roundtripLatency = Date.now() - interaction.payload.createdTimestamp;

        const mongoPing = await getMongoPing();
        const mongoText = mongoPing === -1 ? '`Offline`' : `\`${mongoPing}ms\``;

        const redisPing = await getRedisPing();
        const redisText = redisPing === -1 ? '`Offline`' : `\`${redisPing}ms\``;

        const wsPing = client.ws.ping < 0 ? 'Calculating...' : `${client.ws.ping}ms`;
        const uptime = formatDuration(client.uptime);

        let nodesText = '> No Lavalink nodes connected.';
        const nodes = client.kazagumo.shoukaku.nodes;
        
        if (nodes.size > 0) {
            const nodePromises = Array.from(nodes.values()).map(async (node) => {
                const isConnected = node.state === 1 || node.state === 'CONNECTED';
                
                if (!isConnected) {
                    return `> **${node.name}:** \`Offline\``;
                }
                
                try {
                    const start = Date.now();
                    await node.rest.getLavalinkInfo();
                    const ping = Date.now() - start;
                    return `> **${node.name}:** \`${ping}ms\``;
                } catch {
                    return `> **${node.name}:** \`Connected\``;
                }
            });

            const nodeResults = await Promise.all(nodePromises);
            nodesText = nodeResults.join('\n');
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.ping} ${client.user.username} Diagnostics\nPerformance diagnostics and metrics`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### System Status\n` +
                            `> **Gateway Latency:** \`${wsPing}\`\n` +
                            `> **API Roundtrip:** \`${roundtripLatency}ms\`\n` +
                            `> **Database:** Mongo: ${mongoText} | Redis: ${redisText}\n` +
                            `> **Uptime:** \`${uptime}\`\n` +
                            `> **Shard ID:** \`${client.shard ? client.shard.ids[0] : 0}\` | **Servers:** \`${client.guilds.cache.size}\``
                        )
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 })))
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### Lavalink Infrastructure\n` +
                    `${nodesText}`
                )
            );

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
