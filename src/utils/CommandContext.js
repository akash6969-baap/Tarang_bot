export class CommandContext {
    constructor(payload, args = []) {
        this.isInteraction = !payload.author;
        this.payload = payload;
        this.args = args;
        
        // Standard properties mapped uniformly
        this.guild = payload.guild;
        this.guildId = payload.guild?.id;
        this.channel = payload.channel;
        this.channelId = payload.channel?.id;
        this.member = payload.member;
        this.user = payload.user || payload.author;
        this.client = payload.client;
        
        // Command execution state
        this.deferred = false;
        this.replied = false;
        this.replyMessage = null;

        // Smart arguments parser to mimic Interaction options
        this.options = {
            getString: (name) => {
                if (this.isInteraction) return payload.options.getString(name);
                // For messages, if we ask for a string, we return the entire remaining arguments joined
                // This covers things like "query" for the play command
                return this.args.length > 0 ? this.args.join(' ') : null;
            },
            getInteger: (name) => {
                if (this.isInteraction) return payload.options.getInteger(name);
                // For messages, parse the first argument as an integer
                const val = parseInt(this.args[0]);
                return isNaN(val) ? null : val;
            },
            getBoolean: (name) => {
                if (this.isInteraction) return payload.options.getBoolean(name);
                if (!this.args[0]) return null;
                const arg = this.args[0].toLowerCase();
                if (['true', 'yes', 'on', '1'].includes(arg)) return true;
                if (['false', 'no', 'off', '0'].includes(arg)) return false;
                return null;
            },
            getUser: (name) => {
                if (this.isInteraction) return payload.options.getUser(name);
                const arg = this.args.find(a => a.startsWith('<@') && !a.startsWith('<@&'));
                if (!arg) return null;
                const id = arg.replace(/[<@!>]/g, '');
                return this.guild?.members.cache.get(id)?.user || this.client.users.cache.get(id) || null;
            },
            getRole: (name) => {
                if (this.isInteraction) return payload.options.getRole(name);
                const arg = this.args.find(a => a.startsWith('<@&'));
                if (!arg) return null;
                const id = arg.replace(/[<@&>]/g, '');
                return this.guild?.roles.cache.get(id) || null;
            },
            getSubcommand: () => {
                if (this.isInteraction) return payload.options.getSubcommand(false);
                return this.args[0] ? this.args[0].toLowerCase() : null;
            },
            getSubcommandGroup: () => {
                if (this.isInteraction) return payload.options.getSubcommandGroup(false);
                return null;
            }
        };
    }

    async deferReply(options = {}) {
        this.deferred = true;
        if (this.isInteraction) {
            return await this.payload.deferReply(options);
        } else {
            // For messages, send a temporary processing message
            // Unless it's ephemeral (prefix commands can't be ephemeral, so we just ignore the ephemeral flag for the temporary message or skip it)
            if (!options.ephemeral) {
                this.replyMessage = await this.payload.reply('⏳ Processing...');
            }
        }
    }

    async reply(options) {
        this.replied = true;
        if (this.isInteraction) {
            return await this.payload.reply(options);
        } else {
            // Message reply
            const safeOptions = { ...options };
            delete safeOptions.flags; // Remove interaction-specific flags
            this.replyMessage = await this.payload.reply(safeOptions);
            return this.replyMessage;
        }
    }

    async editReply(options) {
        if (this.isInteraction) {
            return await this.payload.editReply(options);
        } else {
            // If we're transitioning a message to V2 components, we MUST clear legacy fields like content
            const safeOptions = { ...options };
            delete safeOptions.flags; // Remove interaction-specific flags
            
            if (safeOptions.components && safeOptions.content === undefined) {
                safeOptions.content = null;
            }

            if (this.replyMessage) {
                return await this.replyMessage.edit(safeOptions);
            } else {
                return await this.reply(safeOptions);
            }
        }
    }

    async followUp(options) {
        if (this.isInteraction) {
            return await this.payload.followUp(options);
        } else {
            return await this.payload.channel.send(options);
        }
    }
}
