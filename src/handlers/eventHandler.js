import { logger, initDiscordLogger } from '../utils/logger.js';
import { handleInteraction } from './interactionHandler.js';
import { db } from '../utils/db.js';
import { createErrorContainer } from '../utils/components.js';
import { 
    MessageFlags, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SectionBuilder, 
    SeparatorBuilder, 
    ThumbnailBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { CommandContext } from '../utils/CommandContext.js';

export function loadEvents(client) {
    client.on('clientReady', async () => {
        initDiscordLogger(client);
        logger.info(`Logged in as ${client.user.tag}!`);
        client.user.setActivity('Music 🎵 | /play', { type: 2 });
        
        try {
            const cmds = Array.from(client.commands.values()).map(c => c.data.toJSON());
            await client.application.commands.set(cmds);
            logger.info(`Successfully registered ${cmds.length} slash commands globally.`);
        } catch(e) {
            logger.error('Failed to register commands:', e);
        }
    });

    client.on('guildCreate', async guild => {
        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;
            
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Thank you for choosing ${client.user.username}!`))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`✅ <@${client.user.id}> has been successfully added to \`${guild.name}\`\n\nYou are a valued member! Thank you for your support. You can report any issues at my **Support Server** following the needed steps. You can also reach out to my **Developers** if you want to know more about me.`)
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 128 })))
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Support Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL(client.config.bot.supportServer || 'https://discord.gg/eEhpBtp2ss')
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.user.username} is Unbeatable`));

            await owner.send({ 
                flags: MessageFlags.IsComponentsV2,
                components: [container] 
            });
        } catch (error) {
            logger.error(`Failed to send welcome message to owner of ${guild.name}:`, error);
        }

        // --- Logging System ---
        try {
            const logChannelId = client.config.bot.logChannelId;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    let inviteUrl = 'Could not generate';
                    try {
                        const defaultChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
                        if (defaultChannel) {
                            const invite = await defaultChannel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
                            if (invite) inviteUrl = invite.url;
                        }
                    } catch (err) {}

                    const owner = await guild.fetchOwner().catch(() => null);

                    const logContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🟢 Bot Joined a New Server!`))
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`**Server Name:** \`${guild.name}\`\n**Server ID:** \`${guild.id}\`\n**Owner:** ${owner ? `<@${owner.id}> (${owner.user.tag})` : 'Unknown'}\n**Member Count:** \`${guild.memberCount}\`\n**Invite Link:** ${inviteUrl !== 'Could not generate' ? `[Click Here](${inviteUrl})` : '\`Missing Permissions\`'}`)
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(guild.iconURL({ size: 128 }) || client.user.displayAvatarURL()))
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Tarang Logging System • Joined`));
                    
                    await logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
                }
            }
        } catch (error) {
            logger.error('Failed to log guildCreate event:', error);
        }
    });

    client.on('guildDelete', async guild => {
        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;
            
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Sorry to see you go!`))
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`❌ <@${client.user.id}> has been removed from \`${guild.name}\`\n\nIf you experienced any issues or have feedback, please let us know in the **Support Server**. We are always looking to improve!`)
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 128 })))
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Support Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL(client.config.bot.supportServer || 'https://discord.gg/eEhpBtp2ss')
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`We hope to see you again!`));

            await owner.send({ 
                flags: MessageFlags.IsComponentsV2,
                components: [container] 
            });
        } catch (error) {
            logger.error(`Failed to send goodbye message to owner of ${guild.name}:`, error);
        }

        // --- Logging System ---
        try {
            const logChannelId = client.config.bot.logChannelId;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const owner = await guild.fetchOwner().catch(() => null);
                    const logContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🔴 Bot Left a Server`))
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(`**Server Name:** \`${guild.name}\`\n**Server ID:** \`${guild.id}\`\n**Owner:** ${owner ? `<@${owner.id}> (${owner.user.tag})` : 'Unknown'}\n**Member Count:** \`${guild.memberCount}\``)
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(guild.iconURL({ size: 128 }) || client.user.displayAvatarURL()))
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Tarang Logging System • Left`));
                    
                    await logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
                }
            }
        } catch (error) {
            logger.error('Failed to log guildDelete event:', error);
        }
    });

    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guildId = oldState.guild.id;
        const player = client.kazagumo.players.get(guildId);

        if (!player) return;

        // If the bot itself was disconnected/kicked from the voice channel manually
        if (oldState.id === client.user.id && oldState.channelId && !newState.channelId) {
            player.destroy();
            return;
        }

        // Auto-leave logic: If someone leaves the bot's channel and it becomes empty
        if (oldState.channelId === player.voiceId && oldState.channelId !== newState.channelId) {
            const channel = oldState.channel;
            if (channel && channel.members.filter(m => !m.user.bot).size === 0) {
                setTimeout(async () => {
                    const currentChannel = client.channels.cache.get(oldState.channelId);
                    if (currentChannel && currentChannel.members.filter(m => !m.user.bot).size === 0) {
                        const playerCheck = client.kazagumo.players.get(guildId);
                        if (playerCheck && playerCheck.voiceId === oldState.channelId) {
                            const guildData = await db.getGuild(guildId);
                            if (!guildData.twentyFourSeven) {
                                playerCheck.destroy();
                                const textChannel = client.channels.cache.get(playerCheck.textId);
                                if (textChannel) {
                                    textChannel.send('Left the voice channel because it was empty.').catch(() => null);
                                }
                            }
                        }
                    }
                }, client.config.bot.autoLeaveTimeout || 60000);
            }
        }
    });

    client.on('interactionCreate', async interaction => {
        if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
            // Blacklist Check
            if (await db.isBlacklisted(interaction.user.id) || (interaction.guild && await db.isBlacklisted(interaction.guild.id))) {
                if (!interaction.isAutocomplete()) {
                    return interaction.reply({ 
                        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        components: [createErrorContainer('You or this server are blacklisted from using this bot.')] 
                    });
                }
                return;
            }

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                if (interaction.isChatInputCommand()) {
                    const guildData = await db.getGuild(interaction.guildId);
                    const djRole = guildData?.djRole;
                    const djCommands = ['stop', 'skip', 'pause', 'volume', 'loop', 'shuffle', 'bassboost', 'nightcore', 'remove', 'move', 'clear', 'skipto', 'previous', 'seek'];
                    
                    if (djRole && djCommands.includes(interaction.commandName)) {
                        if (!interaction.member.roles.cache.has(djRole) && !interaction.member.permissions.has('ManageGuild')) {
                            return interaction.reply({ 
                                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                                components: [createErrorContainer(`You need the <@&${djRole}> role to use this command!`)] 
                            });
                        }
                    }
                }

                if (interaction.isAutocomplete()) {
                    await command.autocomplete(interaction, client);
                } else {
                    const ctx = new CommandContext(interaction);
                    await command.execute(ctx, client);
                }
            } catch (error) {
                logger.error(error);
                if (interaction.isAutocomplete()) {
                    await interaction.respond([]).catch(() => {});
                } else {
                    const errPayload = {
                        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        components: [createErrorContainer('There was an error while executing this command!')]
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errPayload).catch(() => {});
                    } else {
                        await interaction.reply(errPayload).catch(() => {});
                    }
                }
            }
        } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
            try {
                await handleInteraction(interaction, client);
            } catch (error) {
                logger.error('Error handling interaction:', error);
            }
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        // Blacklist Check
        if (await db.isBlacklisted(message.author.id) || await db.isBlacklisted(message.guild.id)) return;

        const guildData = await db.getGuild(message.guild.id);
        const prefix = guildData?.prefix || '/';

        let isNoPrefix = await db.isGlobalPremium(message.author.id);
        if (!isNoPrefix) {
            if (guildData?.noprefixUsers?.includes(message.author.id)) isNoPrefix = true;
            if (guildData?.noprefixRoles?.some(r => message.member?.roles?.cache?.has(r))) isNoPrefix = true;
        }

        let content = message.content;
        let usedPrefix = false;

        if (content.startsWith(prefix)) {
            content = content.slice(prefix.length).trim();
            usedPrefix = true;
        }

        if (!usedPrefix && !isNoPrefix) return;

        const args = content.split(/ +/);
        let commandName = args.shift().toLowerCase();

        // Check if command is a filter alias
        const filterNames = [
            '3d', 'alienvibes', 'ambient', 'bass', 'bassboost', 'chillwave', 'china', 'chipmunk', 'dance', 
            'darthvader', 'daycore', 'doubletime', 'haunted', 'lofi', 'muffled', 'nightcore', 'reset', 
            'slowed', 'soft', 'softfocus', 'softguitar', 'space', 'underwater', 'warmpad'
        ];

        if (filterNames.includes(commandName)) {
            args.unshift(commandName); // Put it back as an argument
            commandName = 'filter'; // Route to the filter command
        }

        // Handle short aliases
        const aliases = {
            'p': 'play',
            'dc': 'disconnect',
            'leave': 'disconnect',
            'np': 'nowplaying',
            'q': 'queue',
            's': 'skip',
            'v': 'volume',
            'vol': 'volume',
            'pa': 'pause',
            're': 'resume',
            'sh': 'shuffle',
            'cl': 'clear',
            'rm': 'remove',
            'st': 'stop',
            'pn': 'previous',
            'back': 'previous'
        };

        if (aliases[commandName]) {
            commandName = aliases[commandName];
        }

        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            const djRole = guildData?.djRole;
            const djCommands = ['stop', 'skip', 'pause', 'volume', 'loop', 'shuffle', 'bassboost', 'nightcore', 'remove', 'move', 'clear', 'skipto', 'previous', 'seek'];
            
            if (djRole && djCommands.includes(commandName)) {
                if (!message.member.roles.cache.has(djRole) && !message.member.permissions.has('ManageGuild')) {
                    return message.reply({ 
                        flags: [MessageFlags.IsComponentsV2],
                        components: [createErrorContainer(`You need the <@&${djRole}> role to use this command!`)] 
                    });
                }
            }

            const ctx = new CommandContext(message, args);
            await command.execute(ctx, client);
        } catch (error) {
            logger.error('Error executing message command:', error);
            const errPayload = {
                flags: [MessageFlags.IsComponentsV2],
                components: [createErrorContainer('There was an error while executing this command!')]
            };
            await message.reply(errPayload).catch(() => {});
        }
    });
}
