import Transport from 'winston-transport';
import { ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

export class DiscordTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.client = opts.client;
    this.channelId = opts.channelId;
    this.buffer = [];
    this.intervalId = setInterval(() => this.flush(), 5000); // Flush every 5 seconds
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    // info[Symbol.for('message')] contains the fully formatted string, including ANSI codes
    const formattedMessage = info[Symbol.for('message')] || `${info.timestamp} [${info.level}]: ${info.message}`;
    this.buffer.push(formattedMessage);

    callback();
  }

  async flush() {
    if (this.buffer.length === 0 || !this.client || !this.channelId) return;

    // Get the channel
    const channel = this.client.channels.cache.get(this.channelId);
    if (!channel) return;

    // Join all logs
    let content = this.buffer.join('\n');
    this.buffer = []; // Clear buffer

    // Truncate if it's too long for Discord's limit (approx 4000 limit for components)
    if (content.length > 3800) {
      content = content.substring(content.length - 3800); // Keep only the latest 3800 chars
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🖥️ Tarang Live Console\nReal-time system diagnostics stream\n\n\`\`\`ansi\n${content}\n\`\`\`\n⚙️ **Logs Dispatched** - <t:${Math.floor(Date.now() / 1000)}:R>`)
      );

    try {
      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (err) {
      console.error('Failed to send log to Discord channel', err);
    }
  }
}
