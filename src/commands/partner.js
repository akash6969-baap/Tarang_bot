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
                    new MediaGalleryItemBuilder().setURL('https://cdn.discordapp.com/attachments/1506851584871632958/1512756398532984893/ChatGPT_Image_Jun_6_2026_03_21_59_PM.png?ex=6a253faf&is=6a23ee2f&hm=adbbdd09b60b9aa334c4637051ebd1467ca10376da4dfa6df0e24e52fdf2a77e')
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
