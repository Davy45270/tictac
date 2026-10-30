import { characters, expressions, type CharacterId, type Expression, type Animation } from './model';

let serial = 0;
const ink = '#54342e';
const rainbow = ['#f789b6', '#ffc167', '#ffe381', '#80d6b0', '#83cbea', '#b39beb'];

/** All paint and motion live inside the stage, including when embedded in a group. */
export function characterSvg(id: CharacterId, expression: Expression = 'joie', animation: Animation = 'repos', motion: 'full' | 'reduce' = 'full'): string {
    const e = expressions.includes(expression) ? expression : 'joie';
    const prefix = `guide${++serial}-`;
    const c = characters[id];
    const panda = id === 'panda';
    const red = id === 'pandaroux';
    const dragon = id === 'dragon';
    const monkey = id === 'singe';
    const unicorn = id === 'licorne';
    const url = (name: string): string => `url(#${prefix}${name})`;
    const path = (d: string, fill: string, width = 3.2, stroke = ink): string => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, width = 3.2, stroke = ink): string => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
    const gradient = (name: string, light: string, mid: string, shade: string): string => `<radialGradient id="${prefix}${name}" cx="30%" cy="22%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${shade}"/></radialGradient>`;
    const shades = panda || unicorn ? ['#ffffff', c.coat, '#c7b8cc'] : red ? ['#ffd095', c.coat, '#9d3c25'] : dragon ? ['#ffb082', c.coat, '#ad2637'] : ['#e7b887', c.coat, '#72452f'];
    const coat = url('coat');
    const dark = url('dark');
    const cream = url('cream');
    const pink = url('pink');
    const gold = url('gold');
    const star = (x: number, y: number, size: number): string => path(`M${x} ${y-size} l${size*.3} ${size*.65} ${size*.7} ${size*.1} -${size*.5} ${size*.5} ${size*.13} ${size*.75} -${size*.63} -${size*.35} -${size*.63} ${size*.35} ${size*.13} -${size*.75} -${size*.5} -${size*.5} ${size*.7} -${size*.1}Z`, gold, 2);
    let rear = '';
    if (red) {
        rear += path('M151 185 C221 221 238 149 209 122 C194 109 174 128 183 145 C203 169 175 168 151 185Z', coat);
        for (let i = 0; i < 4; i++) rear += path(`M${180+i*5} ${181-i*14} q19 4 33 -9`, cream, 8, '#ffe6be');
    }
    if (monkey) rear += path('M158 182 C227 213 232 144 208 142 C187 141 190 164 205 160', 'none', 10, '#885334');
    if (dragon) {
        rear += path('M151 183 Q212 207 217 160 Q203 174 179 155Z', coat);
        for (const flip of [false, true]) rear += `<g${flip ? ' transform="translate(240 0) scale(-1 1)"' : ''}>${path('M78 159 Q33 144 28 102 Q53 104 78 128 L92 156Z', url('wing'))}${path('M30 104 L62 130 L44 139 M62 130 L76 154', 'none', 2.3)}</g>`;
    }
    if (unicorn) for (let i = 5; i >= 0; i--) rear += path(`M166 ${157+i*3} C225 137 191 203 216 ${201+i*2} Q189 221 182 184`, rainbow[i]!, 2);
    let body = ellipse(120, 166, 46, 43, coat) + ellipse(116, 168, 29, 33, cream, 0);
    for (const x of [87, 151]) {
        body += ellipse(x, 205, 23, 14, panda || red ? dark : monkey ? pink : coat);
        body += ellipse(x-5, 201, 9, 4, '#ffffff', 0).replace('fill="#ffffff"', 'fill="#ffffff" opacity="0.35"');
        if (monkey) body += path(`M${x-10} 201 l19 6 m-17 -1 17 -7`, 'none', 1.6, '#fff0df');
    }
    if (monkey) {
        body += path('M78 170 Q120 186 163 170 L178 190 Q169 201 155 194 Q141 207 126 198 Q110 208 96 198 Q78 203 65 191Z', pink);
        for (const x of [82, 100, 120, 140, 158]) body += path(`M${x} 180 l${x<120 ? -5 : 5} 13`, 'none', 2, '#fff0ed');
        body += path('M82 171 Q120 183 160 171', 'none', 4, '#a74275');
    }
    for (const x of [75, 167]) body += ellipse(x, 155, 16, 27, panda || red ? dark : coat);
    let head = '';
    if (panda || monkey) for (const x of [68, 171]) head += ellipse(x, 59, monkey ? 24 : 21, monkey ? 27 : 22, monkey ? coat : dark) + ellipse(x-1, 59, 12, 14, monkey ? cream : '#9c7370', 0);
    else for (const x of [72, 169]) head += path(`M${x-18} 70 Q${x-25} 40 ${x-12} 28 Q${x+8} 34 ${x+18} 63Z`, coat) + path(`M${x-11} 59 L${x-11} 40 ${x+9} 60Z`, pink, 0);
    if (dragon) for (const x of [77, 163]) {
        head += path(`M${x-9} 53 Q${x-28} 30 ${x-12} 12 Q${x-12} 31 ${x+12} 44Z`, gold);
        head += path(`M${x-14} 32 l12 -3 m-9 12 13 -4`, 'none', 1.8, '#b87938');
    }
    head += path('M61 72 Q68 45 110 44 Q158 40 180 70 Q194 91 183 116 L192 119 L181 127 L186 134 L172 135 Q155 154 120 155 Q81 156 64 137 L51 137 L57 128 L47 122 L58 115 Q48 92 61 72Z', coat, 3.8);
    head += path('M65 83 Q70 56 105 53', 'none', 3, '#fff4d9');
    if (red) {
        head += path('M59 94 Q74 89 91 111 L112 132 Q83 149 64 126 L53 124 L62 115 L54 110Z', cream, 0);
        head += path('M180 91 Q158 94 148 111 L127 133 Q160 149 178 125 L187 122 L179 113 L185 106Z', cream, 0);
        head += path('M83 76 Q94 64 106 75 M141 74 Q154 62 165 73', 'none', 6, '#fff0da');
    }
    if (monkey) head += path('M67 98 C60 64 100 62 120 85 C139 60 178 66 174 101 Q181 139 123 146 Q70 147 67 98Z', cream, 2);
    if (panda) for (const x of [88, 151]) head += ellipse(x, 101, 24, 29, dark, 0);
    if (unicorn) {
        for (let i = 5; i >= 0; i--) head += path(`M${77+i*13} 69 C${52+i*13} 43 ${86+i*12} 29 ${102+i*10} 48 Q${112+i*10} 71 ${95+i*12} 77`, rainbow[i]!, 2);
        head += path('M114 55 L129 8 Q137 29 137 56Z', gold) + path('M124 27 l10 4 m-14 7 15 5', 'none', 2, '#b87938');
    }
    if (monkey || dragon) head += path('M101 48 Q91 29 108 33 L114 42 Q111 18 125 29 L131 43 Q143 30 146 43 L144 53', coat, 3);
    let face = '';
    for (const x of [88, 150]) {
        if (e === 'joie' || e === 'dodo') {
            face += path(e === 'joie' ? `M${x-14} 104 Q${x} 85 ${x+14} 104` : `M${x-14} 98 Q${x} 112 ${x+14} 98`, 'none', 4.5);
            face += path(`M${x-11} 104 l-4 3`, 'none', 2.5);
        } else {
            face += ellipse(x, 100, 17, e === 'surprise' ? 23 : 20, '#fffdf4', 2.5);
            const look = e === 'concentre' ? 5 : 0;
            face += ellipse(x+look, 103, 10, 14, url('iris'), 1.2) + ellipse(x+look+1, 105, 5.5, 9, '#392e35', 0);
            face += ellipse(x+look-4, 97, 4, 5, '#ffffff', 0) + ellipse(x+look+4, 109, 2, 2.5, '#ffffff', 0);
            face += path(`M${x-16} 87 Q${x} 77 ${x+16} 88`, 'none', 2.5);
        }
        const left = x < 120;
        face += path(e === 'triste' ? `M${x-13} ${left?77:70} Q${x} 68 ${x+13} ${left?70:77}` : e === 'concentre' ? `M${x-13} ${left?73:81} L${x+12} ${left?82:73}` : `M${x-12} 76 Q${x} ${e==='surprise'?61:69} ${x+12} 76`, 'none', 3);
        face += ellipse(x-5, 124, 15, 7, pink, 0) + ellipse(x-9, 122, 5, 2, '#ffe3dd', 0);
    }
    face += ellipse(120, 121, unicorn ? 23 : 16, unicorn ? 14 : 10, cream, 0);
    face += dragon || unicorn ? ellipse(112, 119, 2, 3, ink, 0) + ellipse(129, 119, 2, 3, ink, 0) : path('M113 116 Q120 111 127 116 Q125 125 120 124 Q115 123 113 116Z', dark, 1.5);
    if (e === 'joie') face += path('M103 131 Q120 140 137 129 Q133 151 120 150 Q108 148 103 131Z', '#733d45', 2) + path('M111 144 Q120 135 130 143 Q123 153 111 144Z', pink, 0) + path('M109 133 Q120 137 131 132 L128 138 113 138Z', '#fff9ed', 0);
    else if (e === 'surprise') face += ellipse(120, 140, 8, 11, '#733d45', 2) + ellipse(118, 145, 4, 3, pink, 0);
    else if (e === 'triste') face += path('M108 141 Q120 129 133 141', 'none', 3);
    else if (e === 'concentre') face += path('M108 135 Q120 141 133 133', 'none', 2.5) + path('M123 138 Q126 150 133 144 L133 135', pink, 1.8);
    else face += path('M111 136 Q120 142 129 136', 'none', 2.5) + '<text x="183" y="66" fill="#805b96" font-size="23" font-family="sans-serif" font-weight="bold">z</text><text x="202" y="45" fill="#805b96" font-size="16" font-family="sans-serif">z</text>';
    let props = '';
    if (panda) {
        props += path('M56 183 L70 131', 'none', 7, '#609642');
        for (let i = 0; i < 4; i++) props += path(`M${61+i*2} ${168-i*8} q-25 -18 -23 -4 q10 10 23 4 m0 0 q21 -18 21 -8 q-7 11 -21 8`, '#70b74e', 1.5, '#406c35');
        props += path('M129 174 L184 174 179 206 Q154 219 134 203Z', gold);
        for (const x of [140, 151, 163, 175]) props += path(`M${x} 179 l1 25`, 'none', 1.5, '#aa713a');
        for (const [x,y,color] of [[140,172,'#efba56'],[157,167,'#ea6556'],[173,173,'#8ebc56']] as const) props += ellipse(x,y,10,10,color,1.5);
        props += path('M156 159 q0 -10 8 -9 M130 182 Q157 188 183 181', 'none', 3, '#6c713a');
    }
    if (dragon) {
        props += path('M87 169 Q103 163 120 174 Q137 162 156 168 L151 202 Q135 197 120 207 Q102 198 89 201Z', '#65504b');
        props += path('M92 167 Q105 165 120 176 Q139 164 152 168 L147 195 Q132 193 120 202 Q104 193 94 196Z', cream, 2) + path('M120 176 L120 201 M98 177 l15 5 m-14 3 13 5 m16 -8 16 -6 m-16 13 14 -5', 'none', 1.4, '#ad885e');
    }
    if (red) props += path('M171 164 C150 149 159 136 170 145 C184 129 198 149 171 164Z', pink, 2) + ellipse(164, 145, 4, 2, '#fff0e6', 0);
    if (monkey) {
        for (let i = 0; i < 5; i++) props += `<g transform="rotate(${i*72} 166 65)">${ellipse(166,53,7,12,pink,1.5)}</g>`;
        props += ellipse(166,65,6,6,gold,1.5);
    }
    if (unicorn) props += star(157, 177, 19) + star(200, 116, 8) + star(45, 155, 7);
    // Small specular marks on the paws and belly reinforce the shared light source.
    body += path('M91 151 Q89 164 94 171 M68 145 Q65 151 67 158', 'none', 2.5, '#ffe9d8');
    const movement = motion === 'reduce' ? '' : animation === 'special' ? '<animateTransform attributeName="transform" type="rotate" values="-4 120 180;4 120 180;-4 120 180" dur="4s" repeatCount="indefinite"/>' : `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${animation === 'saut' ? -12 : animation === 'celebration' ? -7 : animation === 'marche' ? -4 : -2};0 0" dur="${animation === 'repos' ? 4.8 : 2.8}s" repeatCount="indefinite"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${c.fr}"><defs>${gradient('coat',shades[0]!,shades[1]!,shades[2]!)}${gradient('dark','#9a7973','#594246','#352d38')}${gradient('cream','#fffef0','#ffe8c7','#d5a575')}${gradient('pink','#ffe3e6','#f799b5','#ce5b8c')}${gradient('gold','#fff4af','#f5cc61','#be8437')}${gradient('iris','#eecb8a',unicorn?'#68bad6':dragon?'#db8b32':'#96633e','#493735')}${gradient('wing','#c9f1c0','#73bd8c','#358778')}<radialGradient id="${prefix}shadow"><stop offset="0" stop-color="#694956" stop-opacity="0.26"/><stop offset="1" stop-color="#694956" stop-opacity="0"/></radialGradient></defs>${ellipse(122,219,88,15,url('shadow'),0)}<g>${movement}${rear}${body}${head}${face}${props}<path d="M79 156 Q75 150 72 155" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/></g></svg>`;
}
