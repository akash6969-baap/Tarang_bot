import { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder,
    SectionBuilder, 
    SeparatorBuilder, 
    ActionRowBuilder,
    ButtonBuilder, 
    ButtonStyle,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('partner')
        .setDescription("View Tarang's official partners."),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## Tarang Partners\nHey **${interaction.user.username}**, we proudly partner with:`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**VexaNode Hosting**\n> Premium & affordable hosting\n> Perfect for bots & websites\n> High uptime & performance`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 1024, extension: 'png' }))
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Explore our official partner below.`)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('https://cdn.discordapp.com/attachments/1512823629765804193/1513532563355074680/ChatGPT_Image_Jun_8_2026_06_46_40_PM.png?ex=6a28128b&is=6a26c10b&hm=39b6f0877a449644bf7f24c2c5d238d587fb4a70c8b278feec35d0f44b5b3ab0')
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Website')
                        .setURL('https://vexanode.cloud/')
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel('Purchase')
                        .setURL('https://billing.vexanode.gg/')
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel('Discord')
                        .setURL('https://discord.gg/HFNxwXnHaV')
                        .setStyle(ButtonStyle.Link)
                )
            );

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
