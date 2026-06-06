import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileReplacements = {
    'src/handlers/interactionHandler.js': [
        { find: "'🎵 You need the", replace: "`${emojis.music} You need the" }
    ],
    'src/commands/volume.js': [
        { find: "'🔊 Volume Updated'", replace: "`${emojis.music} Volume Updated`" }
    ],
    'src/commands/stop.js': [
        { find: "'⏹️ Stopped'", replace: "`${emojis.stop} Stopped`" }
    ],
    'src/commands/skipto.js': [
        { find: "'⏭️ Skipped To'", replace: "`${emojis.skip} Skipped To`" }
    ],
    'src/commands/skip.js': [
        { find: "'⏭️ Skipped'", replace: "`${emojis.skip} Skipped`" }
    ],
    'src/commands/shuffle.js': [
        { find: "'🔀 Shuffled'", replace: "`${emojis.shuffle} Shuffled`" }
    ],
    'src/commands/remove.js': [
        { find: "'🗑️ Track Removed'", replace: "`${emojis.trash} Track Removed`" }
    ],
    'src/commands/previous.js': [
        { find: "'⏮️ Previous Track'", replace: "`${emojis.previous} Previous Track`" }
    ],
    'src/commands/pause.js': [
        { find: "'▶️ Resumed'", replace: "`${emojis.play} Resumed`" },
        { find: "'⏸️ Paused'", replace: "`${emojis.pause} Paused`" }
    ],
    'src/commands/nightcore.js': [
        { find: "'✨ Nightcore'", replace: "`${emojis.nightcore} Nightcore`" }
    ],
    'src/commands/move.js': [
        { find: "'↔️ Track Moved'", replace: "`${emojis.music} Track Moved`" } // using music since there's no move emoji
    ],
    'src/commands/loop.js': [
        { find: "'🔁 Loop Mode'", replace: "`${emojis.loop} Loop Mode`" }
    ],
    'src/commands/clear.js': [
        { find: "'🧹 Queue Cleared'", replace: "`${emojis.trash} Queue Cleared`" }
    ],
    'src/commands/bassboost.js': [
        { find: "'🎧 Bassboost'", replace: "`${emojis.bassboost} Bassboost`" }
    ]
};

for (const [relPath, rules] of Object.entries(fileReplacements)) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) continue;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    for (const rule of rules) {
        if (content.includes(rule.find)) {
            content = content.replace(rule.find, rule.replace);
            modified = true;
        }
    }

    if (modified) {
        if (!content.includes('emojis.js')) {
            content = `import { emojis, emojiIds } from '../utils/emojis.js';\n` + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Updated emojis in ${relPath}`);
    }
}
