import { emojis, emojiIds } from '../utils/emojis.js';
import { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    MessageFlags 
} from 'discord.js';
import lyricsFinder from 'lyrics-finder';
import { createErrorContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Fetches lyrics for the currently playing song.'),
        
    async execute(interaction, client) {
        const player = client.kazagumo.players.get(interaction.guild.id);
        if (!player || !player.queue.current) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('There is nothing playing right now.')] 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const track = player.queue.current;
        let title = track.title;
        title = title.replace(/\(official.*?\)/i, '')
                     .replace(/\[official.*?\]/i, '')
                     .replace(/music video/i, '')
                     .replace(/audio/i, '')
                     .replace(/lyric video/i, '')
                     .trim();

        let lyrics;
        try {
            lyrics = await lyricsFinder(track.author, title) || "Not Found!";
        } catch (error) {
            lyrics = "Not Found!";
        }

        if (lyrics === "Not Found!") {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer(`Could not find lyrics for **${track.title}**.`)]
            });
        }

        if (lyrics.length > 4096) {
            lyrics = lyrics.substring(0, 4093) + '...';
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.lyrics} Lyrics for ${track.title}`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(lyrics))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Powered by lyrics-finder'));

        await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container] 
        });
    }
};
