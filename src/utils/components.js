import { 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SectionBuilder, 
    SeparatorBuilder, 
    ThumbnailBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    StringSelectMenuBuilder, 
    ButtonStyle, 
    SeparatorSpacingSize
} from 'discord.js';

import { formatDuration } from './musicUtils.js';
import { emojis, emojiIds } from './emojis.js';

// Removed progress bar helper function since it's no longer used

export function createErrorContainer(errorMessage) {
    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.error} Error`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${errorMessage}`));
}

export function createSuccessContainer(title, description) {
    let finalTitle = title;
    const trimmedTitle = title.trim();
    const firstChar = trimmedTitle.charAt(0);
    // Check if the title starts with a custom Discord emoji (<:name:id>) or a unicode emoji (non-ASCII character)
    const startsWithEmoji = trimmedTitle.startsWith('<') || (firstChar && firstChar.match(/[^\x00-\x7F]/));
    
    if (!startsWithEmoji) {
        finalTitle = `${emojis.success} ${title}`;
    }

    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${finalTitle}`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${description}`));
}

export function buildNowPlaying(track, player) {
    const container = new ContainerBuilder()
        // Title
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.now_playing} Now Playing`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        // Track info + album art
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> [**${track.title}**](${track.uri}) - \`${track.author}\`\n> Duration: \`${formatDuration(track.length)}\`\n> Requested by **${track.requester?.username || 'Autoplay'}**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(track.thumbnail || track.artworkUrl || 'https://i.imgur.com/placeholder.png')
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        // Control buttons (All 5 in one row)
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel(player.loop === 'none' ? 'Off' : player.loop === 'track' ? 'Trk' : 'Que')
                    .setEmoji(emojiIds.loop)
                    .setStyle(player.loop === 'none' ? ButtonStyle.Secondary : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('music_previous').setEmoji(emojiIds.previous).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_pause').setEmoji(player.paused ? emojiIds.play : emojiIds.pause).setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('music_skip').setEmoji(emojiIds.skip).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_shuffle').setEmoji(emojiIds.shuffle).setStyle(ButtonStyle.Secondary)
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        // Volume select
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('music_volume')
                    .setPlaceholder('Volume Control')
                    .addOptions([
                        { label: 'Mute (0%)',    value: '0'   },
                        { label: 'Low (25%)',    value: '25'  },
                        { label: 'Medium (50%)', value: '50'  },
                        { label: 'Normal (75%)', value: '75'  },
                        { label: 'Full (100%)',  value: '100' },
                        { label: 'High (125%)',  value: '125' },
                        { label: 'Loud (150%)',  value: '150' }
                    ])
            )
        )
        // Footer
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Volume: ${player.volume}% • Loop: ${player.loop} • Server: ${player.shoukaku?.node?.name || 'Auto'} • © Tarang`
            )
        );

    return container;
}
