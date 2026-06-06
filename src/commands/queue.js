import { emojis, emojiIds } from '../utils/emojis.js';
import { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    SeparatorSpacingSize, 
    MessageFlags 
} from 'discord.js';
import { formatDuration } from '../utils/musicUtils.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export async function handleQueueInteraction(interaction, client) {
    const customId = interaction.customId;
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!player) {
        return interaction.reply({ 
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [createErrorContainer('There is no music playing right now.')] 
        });
    }

    if (customId === 'queue_clear') {
        player.queue.clear();
        return interaction.update({ 
            components: [createSuccessContainer('Queue Cleared', 'All upcoming tracks have been removed from the queue.')]
        });
    }

    let page = 1;
    if (customId.startsWith('queue_prev_')) {
        page = parseInt(customId.split('_')[2]) - 1;
    } else if (customId.startsWith('queue_next_')) {
        page = parseInt(customId.split('_')[2]) + 1;
    } else if (customId.startsWith('queue_refresh_')) {
        page = parseInt(customId.split('_')[2]);
    }

    const totalPages = Math.ceil(player.queue.length / 10) || 1;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const queueContainer = buildQueueContainer(player, page, totalPages);
    
    await interaction.update({ 
        flags: MessageFlags.IsComponentsV2,
        components: [queueContainer]
    });
}

function buildQueueContainer(player, page, totalPages) {
    const queue = player.queue;
    const start = (page - 1) * 10;
    const end = start + 10;
    const queueTracks = queue.slice(start, end);

    let totalDuration = player.queue.current ? player.queue.current.length : 0;
    for (const track of queue) {
        totalDuration += track.length;
    }

    const queueContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.queue} Music Queue`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    let trackList = '';
    if (player.queue.current) {
        trackList += `**Now Playing:**\n\`${player.queue.current.title}\` — \`${formatDuration(player.queue.current.length)}\`\n\n**Up Next:**\n`;
    }
    
    if (queueTracks.length === 0) {
        trackList += 'No tracks in the queue.';
    } else {
        trackList += queueTracks.map((t, i) => `\`${start + i + 1}.\` **${t.title}** — \`${formatDuration(t.length)}\``).join('\n');
    }

    queueContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(trackList))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`queue_prev_${page}`).setEmoji(emojiIds.arrow_left).setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
                new ButtonBuilder().setCustomId(`queue_refresh_${page}`).setEmoji(emojiIds.refresh).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`queue_next_${page}`).setEmoji(emojiIds.arrow_right).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
                new ButtonBuilder().setCustomId('queue_clear').setLabel('Clear').setEmoji(emojiIds.trash).setStyle(ButtonStyle.Danger)
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Page ${page}/${totalPages} • ${queue.length} tracks • ${formatDuration(totalDuration)} total duration`)
        );
        
    return queueContainer;
}

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the current music queue.')
        .addIntegerOption(option => 
            option.setName('page')
                .setDescription('Page number of the queue')
                .setRequired(false)
                .setMinValue(1)
        ),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || !player.queue.current) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is no music playing right now.')] 
            });
        }

        const queue = player.queue;
        const totalPages = Math.ceil(queue.length / 10) || 1;
        const page = (interaction.options?.getInteger('page') || 1);

        if (page > totalPages) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(`Invalid page. There are only ${totalPages} pages.`)] 
            });
        }

        const queueContainer = buildQueueContainer(player, page, totalPages);

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [queueContainer]
        });
    }
};
