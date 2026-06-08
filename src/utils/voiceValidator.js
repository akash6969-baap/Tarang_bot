import { PermissionFlagsBits } from 'discord.js';

/**
 * Validates if the bot can join and speak in a voice channel.
 * @param {VoiceChannel|StageChannel} channel - The voice channel to check.
 * @param {GuildMember} botMember - The bot's guild member object.
 * @returns {string|null} - Returns an error message if invalid, or null if valid.
 */
export function checkVoicePermissions(channel, botMember) {
    if (!channel) return 'Voice channel not found.';

    const permissions = channel.permissionsFor(botMember);
    if (!permissions) return 'Could not resolve permissions for your voice channel.';

    if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
        return 'I cannot see your voice channel.';
    }
    if (!permissions.has(PermissionFlagsBits.Connect)) {
        return 'I do not have permission to connect to your voice channel.';
    }
    if (!permissions.has(PermissionFlagsBits.Speak)) {
        return 'I do not have permission to speak in your voice channel.';
    }

    // Check if channel is full
    if (channel.userLimit > 0 && channel.members.size >= channel.userLimit) {
        if (!permissions.has(PermissionFlagsBits.ManageChannels) && !permissions.has(PermissionFlagsBits.Administrator)) {
            return 'Your voice channel is full, and I do not have permission to bypass the limit.';
        }
    }

    return null;
}

/**
 * Validates the full voice state for a command (checks user VC, bot VC, and permissions).
 * @param {Interaction} interaction - The discord interaction.
 * @param {Object} player - The current Kazagumo player (if any).
 * @returns {string|null} - Returns an error message if invalid, or null if valid.
 */
export function validateVoiceState(interaction, player) {
    const memberChannel = interaction.member?.voice?.channel;
    
    if (!memberChannel) {
        return 'You must be in a voice channel to use this command.';
    }

    // Check if bot is already in a DIFFERENT channel
    const botChannel = interaction.guild.members.me.voice.channel;
    if (botChannel && botChannel.id !== memberChannel.id) {
        return `I am already playing music in <#${botChannel.id}>.`;
    }

    // If we are not currently in the channel, we need to check if we can join it
    if (!botChannel || botChannel.id !== memberChannel.id) {
        const permError = checkVoicePermissions(memberChannel, interaction.guild.members.me);
        if (permError) return permError;
    }

    return null;
}
