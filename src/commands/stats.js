import os from 'os';
import { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
    version
} from 'discord.js';

const getDuration = (ms) => {
    const sec = Math.floor((ms / 1000) % 60).toString();
    const min = Math.floor((ms / (1000 * 60)) % 60).toString();
    const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24).toString();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24)).toString();
    return `${days}d ${hrs}h ${min}m ${sec}s`;
};

const getBannerGallery = () => new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL('https://cdn.discordapp.com/attachments/1512823629765804193/1513532563355074680/ChatGPT_Image_Jun_8_2026_06_46_40_PM.png?ex=6a28128b&is=6a26c10b&hm=39b6f0877a449644bf7f24c2c5d238d587fb4a70c8b278feec35d0f44b5b3ab0')
);

const getStatsSelectMenu = () => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
        .setCustomId('stats_category_select')
        .setPlaceholder('Select Stats Category')
        .addOptions([
            { label: 'General Stats', description: 'View general bot statistics', value: 'general' },
            { label: 'Lavalink Nodes', description: 'View music node statistics', value: 'nodes' }
        ])
);

function buildGeneralStats(client, interaction) {
    const mem = process.memoryUsage();
    const memFormat = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    const cpuLoad = (os.loadavg()[0] * 100 / os.cpus().length).toFixed(2);
    const shardInfo = `${interaction.guild?.shardId || 0}/${client.ws.shards.size || 1}`;

    return new ContainerBuilder()
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Tarang Statistics\n_This is Per Cluster Data Only._\n\n> **Servers:** ${client.guilds.cache.size}\n> **Users:** ${client.users.cache.size}\n> **Uptime:** ${getDuration(client.uptime)}\n \n> **Memory:** ${memFormat(mem.rss)}\n> **CPU Load:** ${cpuLoad}%\n> **Shard:** ${shardInfo}\n \n> **Discord.js:** ${version}\n> **Node.js:** ${process.version}\n> **Platform:** ${process.platform}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 1024, extension: 'png' }))
                )
        )
        .addMediaGalleryComponents(getBannerGallery())
        .addActionRowComponents(getStatsSelectMenu());
}

function buildNodeStats(client) {
    let nodesText = '';
    for (const [name, node] of client.kazagumo.shoukaku.nodes) {
        const state = node.state === 1 || node.state === 'CONNECTED' ? 'Connected' : 'Disconnected';
        const stats = node.stats || {};
        const players = stats.players || 0;
        const playing = stats.playingPlayers || 0;
        const up = stats.uptime ? getDuration(stats.uptime) : '0d 0h 0m 0s';
        const mem = stats.memory && stats.memory.used ? (stats.memory.used / 1024 / 1024).toFixed(2) + ' MB' : '0.00 MB';

        nodesText += `**${name}**\n> **State:** ${state}\n> **Players:** ${players}\n> **Playing:** ${playing}\n> **Uptime:** ${up}\n> **Memory:** ${mem}\n\n`;
    }

    if (!nodesText) nodesText = '> No nodes connected.';

    return new ContainerBuilder()
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Lavalink Node Stats\n${nodesText.trim()}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 1024, extension: 'png' }))
                )
        )
        .addMediaGalleryComponents(getBannerGallery())
        .addActionRowComponents(getStatsSelectMenu());
}

export async function handleStatsInteraction(interaction, client) {
    const value = interaction.values[0];
    const container = value === 'nodes' ? buildNodeStats(client) : buildGeneralStats(client, interaction);
    await interaction.update({ components: [container] }).catch(() => {});
}

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Shows bot statistics.'),
        
    async execute(interaction, client) {
        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [buildGeneralStats(client, interaction)] 
        });
    }
};
