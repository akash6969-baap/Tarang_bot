import { Client, GatewayIntentBits } from 'discord.js';
import { Connectors } from 'shoukaku';
import { Kazagumo } from 'kazagumo';
import { logger } from './utils/logger.js';
import { config } from '../config/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadMusicEvents } from './handlers/musicEventHandler.js';
import { startWebServer } from './web/server.js';
import { connectMongo } from './utils/mongoose.js';
import { connectRedis } from './utils/redisCache.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.config = config;

const shoukakuOptions = {
    reconnectTries: 100000, // Keep trying forever
    reconnectInterval: 15000, // Every 15 seconds
    restTimeout: 15000,
    moveOnDisconnect: true, // Auto-failover to another node
    resume: true, // Resume music automatically
    resumeTimeout: 60,
    resumeByLibrary: true
};

client.kazagumo = new Kazagumo({
    defaultSearchEngine: "youtube",
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Connectors.DiscordJS(client), config.lavalinkNodes, shoukakuOptions);

async function init() {
    await loadCommands(client);
    loadEvents(client);
    loadMusicEvents(client);
    startWebServer(client);
    
    await connectMongo();
    await connectRedis();

    client.login(config.discord.token)
        .catch(err => logger.error('Failed to login to Discord:', err));
}
init();

// Anti-crash mechanism
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
});
