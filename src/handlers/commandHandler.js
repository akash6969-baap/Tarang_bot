import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client) {
    client.commands = new Map();
    const commandsPath = join(__dirname, '../commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        try {
            const command = await import(`file://${filePath}`);
            if ('data' in command.default && 'execute' in command.default) {
                client.commands.set(command.default.data.name, command.default);
            } else {
                logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            logger.error(`Error loading command ${file}:`, error);
        }
    }
    logger.info(`Loaded ${client.commands.size} commands.`);
}
