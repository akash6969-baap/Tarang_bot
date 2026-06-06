import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createSuccessContainer } from '../utils/components.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Set the text prefix for the bot.'),
        
    async execute(interaction) {
        await interaction.reply({ 
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: [createSuccessContainer('Slash Commands Only', 'Tarang has transitioned to **100% Slash Commands** (`/`) for a better, faster, and more secure experience. Text prefixes are no longer supported!')] 
        });
    }
};
