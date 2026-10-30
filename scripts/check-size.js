import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import process from 'node:process';
import { log } from 'node:console';

function size(directory) {
    return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
        const path = join(directory, entry.name);
        return total + (entry.isDirectory() ? size(path) :
            ['.js', '.css', '.svg', '.woff2'].includes(extname(path)) ? gzipSync(readFileSync(path)).length : 0);
    }, 0);
}
const bytes = size('dist/assets');
log(`Assets gzip: ${(bytes / 1024).toFixed(1)} / 400 KiB`);
if (bytes > 400 * 1024) process.exitCode = 1;
