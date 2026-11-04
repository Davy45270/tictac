import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
});

// The author's other games are plain same-tab links: following one is a navigation, not a request.
const siblings = /https:\/\/davy45270\.github\.io\/(?:Opencade|opencadkid|tictac|petit-astronome)\//;

// The follow-up is for parents on this device only: the application code holds no way to send data.
it('application code never opens a network channel', () => {
    const channels = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|RTCPeerConnection|navigator\.share|https?:\/\/(?!www\.w3\.org\/|davy45270\.github\.io\/(?:Opencade|opencadkid|tictac|petit-astronome)\/|github\.com\/Davy45270\/tictac\/issues\/new\/choose)/;
    const hits = files('src').filter(file => /\.(ts|js|css|html)$/.test(file)).flatMap(file => readFileSync(file, 'utf8').split('\n').flatMap((line, i) => channels.test(line) ? [`${file}:${String(i + 1)}`] : []));
    expect(hits).toEqual([]);
});

it('sibling game addresses live in the other-games list only', () => {
    const hits = files('src').filter(file => /\.(ts|js|css|html)$/.test(file) && siblings.test(readFileSync(file, 'utf8'))).map(file => file.replaceAll('\\', '/'));
    expect(hits).toEqual(['src/ui/other-games.ts']);
    expect(readFileSync('src/ui/other-games.ts', 'utf8')).not.toMatch(/\bfetch\b|XMLHttpRequest|sendBeacon|window\.open|target=/);
});

// "Give feedback" is a plain new-tab link to the public forms, written in one place.
it('the feedback address lives in the feedback link only', () => {
    const hits = files('src').filter(file => /\.(ts|js|css|html)$/.test(file) && readFileSync(file, 'utf8').includes('github.com/')).map(file => file.replaceAll('\\', '/'));
    expect(hits).toEqual(['src/ui/feedback.ts']);
    expect(readFileSync('src/ui/feedback.ts', 'utf8')).not.toMatch(/\bfetch\b|XMLHttpRequest|sendBeacon|window\.open|utm_/);
});
