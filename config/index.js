import dotenv from 'dotenv';
dotenv.config();

function getLavalinkNodes() {
    const nodes = [];
    const envVars = Object.keys(process.env);
    
    // Find all unique node prefixes like LAVALINK_NODE1_, LAVALINK_NODE2_
    const nodePrefixes = new Set();
    envVars.forEach(key => {
        const match = key.match(/^LAVALINK_NODE\d+_/);
        if (match) {
            nodePrefixes.add(match[0]);
        }
    });

    nodePrefixes.forEach(prefix => {
        const name = process.env[`${prefix}NAME`] || `Node-${nodes.length + 1}`;
        const url = process.env[`${prefix}URL`];
        const password = process.env[`${prefix}PASSWORD`];
        const secure = process.env[`${prefix}SECURE`] === 'true';
        
        if (url && password) {
            nodes.push({
                name,
                url,
                auth: password,
                secure
            });
        }
    });

    return nodes;
}

export const config = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
    },
    web: {
        port: process.env.PORT || 3000,
        sessionSecret: process.env.SESSION_SECRET || 'super_secret_session_key',
        dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
        callbackUrl: process.env.CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    },
    bot: {
        defaultVolume: parseInt(process.env.DEFAULT_VOLUME) || 75,
        autoLeaveTimeout: parseInt(process.env.AUTO_LEAVE_TIMEOUT) || 60000,
        logChannelId: process.env.LOG_CHANNEL_ID,
        owners: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',').map(id => id.trim()) : [],
    },
    lavalinkNodes: getLavalinkNodes()
};
