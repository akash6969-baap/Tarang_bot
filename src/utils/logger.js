import winston from 'winston';
import { DiscordTransport } from './DiscordTransport.js';

const { combine, timestamp, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  ),
  transports: [
    new winston.transports.Console()
  ],
});

export function initDiscordLogger(client) {
  if (!process.env.LOG_CHANNEL_ID) return;
  
  logger.add(new DiscordTransport({
    client,
    channelId: process.env.LOG_CHANNEL_ID,
    level: 'info' // Forward info, warn, error
  }));
}
