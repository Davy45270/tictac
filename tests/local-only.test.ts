import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
});

// The follow-up is for parents on this device only: the application code holds no way to send data.
it('application code never opens a network channel', () => {
    const channels = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|RTCPeerConnection|navigator\.share|https?:\/\/(?!www\.w3\.org\/)/;
    const hits = files('src').filter(file => /\.(ts|js|css|html)$/.test(file)).flatMap(file => readFileSync(file, 'utf8').split('\n').flatMap((line, i) => channels.test(line) ? [`${file}:${String(i + 1)}`] : []));
    expect(hits).toEqual([]);
});
