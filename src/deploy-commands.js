import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    try {
        const command = await import(`file://${filePath}`);
        if ('data' in command.default && 'execute' in command.default) {
            commands.push(command.default.data.toJSON());
        }
    } catch (error) {
        logger.error(`Error processing ${file} for deployment:`, error);
    }
}

const rest = new REST().setToken(config.discord.token);

(async () => {
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(config.discord.clientId),
            { body: commands },
        );

        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logger.error('Failed to deploy commands:', error);
    }
})();
