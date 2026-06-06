import { emojis, emojiIds } from '../utils/emojis.js';
import { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    MessageFlags 
} from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for a song and choose from results.')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song to search for')
                .setRequired(true)
        ),
        
    async execute(interaction, client) {
        const query = interaction.options.getString('query');
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('You must be in a voice channel to use this command.')] 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        let res;
        try {
            res = await client.kazagumo.search(query, { requester: member.user });
        } catch (e) {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('There was an error searching for the song.')]
            });
        }

        if (!res.tracks.length) {
            return interaction.editReply({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createErrorContainer('No results found!')]
            });
        }

        const tracks = res.tracks.slice(0, 10);
        
        const options = tracks.map((track, i) => ({
            label: track.title.substring(0, 100),
            description: track.author.substring(0, 100),
            value: i.toString()
        }));

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emojis.search} Search Results`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Found **${tracks.length}** results for \`${query}\`. Please select one from the menu below.`))
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('search_select')
                            .setPlaceholder('Select a song to play')
                            .addOptions(options)
                    )
            );

        const message = await interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });

        const filter = i => i.customId === 'search_select' && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async i => {
            const selectedIndex = parseInt(i.values[0]);
            const track = tracks[selectedIndex];

            let player = client.kazagumo.players.get(interaction.guild.id);
            if (!player) {
                player = await client.kazagumo.createPlayer({
                    guildId: interaction.guild.id,
                    textId: interaction.channel.id,
                    voiceId: member.voice.channel.id,
                    volume: client.config.bot.defaultVolume,
                    deaf: true
                });
            } else {
                player.textId = interaction.channel.id;
            }

            player.queue.add(track);
            if (!player.playing && !player.paused) player.play();

            await i.update({ 
                flags: MessageFlags.IsComponentsV2,
                components: [createSuccessContainer(`${emojis.music} Track Added`, `Added **${track.title}** to the queue!`)]
});
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ 
                    flags: MessageFlags.IsComponentsV2,
                    components: [createErrorContainer('Search timed out.')]
                }).catch(() => {});
            }
        });
    }
};
