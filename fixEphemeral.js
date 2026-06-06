import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            let original = content;
            
            // Fix standard order: flags: ..., components: ..., ephemeral: true
            content = content.replace(/flags:\s*MessageFlags\.IsComponentsV2,([\s\S]*?)ephemeral:\s*true/g, (match, middle) => {
                // If it ends with a comma, strip it
                const cleanMiddle = middle.replace(/,\s*$/, '');
                return 'flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],' + cleanMiddle;
            });
            
            if (content !== original) {
                // clean trailing commas if they got orphaned before }
                content = content.replace(/,\s*\n\s*}/g, '\n}');
                fs.writeFileSync(fullPath, content);
                console.log('Fixed:', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
