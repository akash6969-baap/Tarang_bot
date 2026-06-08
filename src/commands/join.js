import { emojis } from '../utils/emojis.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createErrorContainer, createSuccessContainer } from '../utils/components.js';
import { validateVoiceState } from '../utils/voiceValidator.js';

export default {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Summons the bot to your voice channel.'),
        
    async execute(interaction, client) {
        let player = client.kazagumo.players.get(interaction.guild.id);
        const voiceError = validateVoiceState(interaction, player);
        if (voiceError) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer(voiceError)] 
            });
        }
        
        const memberChannel = interaction.member.voice.channel;
        
        if (player && player.voiceId === memberChannel.id) {
            return interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [createErrorContainer('I am already in your voice channel.')] 
            });
        }

        player = await client.kazagumo.createPlayer({
            guildId: interaction.guild.id,
            textId: interaction.channel.id,
            voiceId: memberChannel.id,
            volume: client.config.bot.defaultVolume,
            deaf: true
        });

        await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2,
            components: [createSuccessContainer(`${emojis.success} Joined`, `Successfully joined <#${memberChannel.id}>!`)]
        });
    }
};
