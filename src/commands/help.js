import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';

const buildHelpContainer = (category, client, user) => {
    const container = new ContainerBuilder();

    let sectionContent = '';

    if (category === 'home') {
        sectionContent = `## Welcome to ${client.user.username}\nHey **${user.username}**, I'm ${client.user.username}, your Music Companion.`;
    } else if (category === 'core') {
        sectionContent = `## <:music:1512415487571660902> Core Music\n> \`/play\` \`/search\` \`/pause\` \`/stop\` \`/skip\` \`/previous\` \`/seek\` \`/nowplaying\` \`/lyrics\` \`/loop\` \`/shuffle\` \`/volume\``;
    } else if (category === 'queue') {
        sectionContent = `## <:queue:1512415610372493332> Queue Management\n> \`/queue\` \`/remove\` \`/move\` \`/clear\` \`/skipto\``;
    } else if (category === 'playlists') {
        sectionContent = `## <:playlists:1512416108727242822> Custom Playlists\n> \`/createplaylist\` \`/deleteplaylist\` \`/addsong\` \`/removesong\` \`/listsongs\` \`/playlistimport\` \`/playlistmove\` \`/pmix\``;
    } else if (category === 'filters') {
        sectionContent = `## <:filters:1512415733970370610> Audio Filters\n> Use \`/filter <type>\` or simply type \`!<filter>\`\n> **Available:** \`3d\`, \`alienvibes\`, \`ambient\`, \`bass\`, \`bassboost\`, \`chillwave\`, \`china\`, \`chipmunk\`, \`dance\`, \`darthvader\`, \`daycore\`, \`doubletime\`, \`haunted\`, \`lofi\`, \`muffled\`, \`nightcore\`, \`reset\`, \`slowed\`, \`soft\`, \`softfocus\`, \`softguitar\`, \`space\`, \`underwater\`, \`warmpad\``;
    } else if (category === 'settings') {
        sectionContent = `## <:settings:1512415694891782156> Settings & Info\n> \`/settings\` \`/prefix\` \`/noprefix\` \`/djrole\` \`/24x7\` \`/ping\` \`/nodestatus\` \`/npstatus\` \`/uptime\` \`/stats\` \`/help\` \`/partner\``;
    }

    const section = new SectionBuilder()
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ dynamic: true, size: 512 })))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(sectionContent));

    container.addSectionComponents(section);

    if (category === 'home') {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `> • Default Prefix: \`/\`\n` +
                `> • Total Commands: \`60+\`\n` +
                `> • Use \`/help\` to see all commands.\n\n` +
                `__Use the dropdown menu below to explore categories.__\n\n` +
                `### Categories\n` +
                `> <:music:1512415487571660902> \`:\` **Core Music**\n` +
                `> <:queue:1512415610372493332> \`:\` **Queue Management**\n` +
                `> <:playlists:1512416108727242822> \`:\` **Custom Playlists**\n` +
                `> <:filters:1512415733970370610> \`:\` **Audio Filters**\n` +
                `> <:settings:1512415694891782156> \`:\` **Settings & Info**\n`
            ));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select Main Category')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Home').setValue('home').setEmoji('1512415433947480065').setDescription('Return to the main help menu'),
                new StringSelectMenuOptionBuilder().setLabel('Core Music').setValue('core').setEmoji('1512415487571660902').setDescription('Basic music playback commands'),
                new StringSelectMenuOptionBuilder().setLabel('Queue Management').setValue('queue').setEmoji('1512415610372493332').setDescription('Manage the current queue'),
                new StringSelectMenuOptionBuilder().setLabel('Custom Playlists').setValue('playlists').setEmoji('1512416108727242822').setDescription('Manage your saved playlists'),
                new StringSelectMenuOptionBuilder().setLabel('Audio Filters').setValue('filters').setEmoji('1512415733970370610').setDescription('Apply premium audio effects'),
                new StringSelectMenuOptionBuilder().setLabel('Settings & Info').setValue('settings').setEmoji('1512415694891782156').setDescription('Bot configuration and statistics')
            );

        const actionRow1 = new ActionRowBuilder().addComponents(selectMenu);
        
        const actionRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}`),
            new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL('https://discord.gg/tarang')
        );

        container.addActionRowComponents(actionRow1, actionRow2);
    }
    
    return container;
};

export async function handleHelpInteraction(interaction, client) {
    const category = interaction.values[0];
    const container = buildHelpContainer(category, client, interaction.user);

    if (category === 'home') {
        await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    } else {
        await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container]
        });
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays the help menu for Tarang.'),
        
    async execute(interaction, client) {
        const user = interaction.user || interaction.author;
        const container = buildHelpContainer('home', client, user);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    }
};
