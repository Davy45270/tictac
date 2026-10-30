/** Opaque sRGB colors, shared by the rendered button surfaces and contrast tests. */
function channels(hex: string): number[] {
    return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
}

export function mixWithWhite(accent: string, weight: number): string {
    return `#${channels(accent).map(value => Math.round(value * weight + 255 * (1 - weight)).toString(16).padStart(2, '0')).join('')}`;
}

export function contrastRatio(first: string, second: string): number {
    const luminance = (hex: string): number => channels(hex).reduce((sum, value, index) => {
        const channel = value / 255;
        return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [ .2126, .7152, .0722 ][index]!;
    }, 0);
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function buttonColors(accent: string, scene = 'day') {
    const colors = {
        ink: '#263547', light: '#fffefa', base: '#fff0d1',
        hoverLight: '#ffffff', hover: '#ffe5ab', character: '#ffebc9',
        selected: mixWithWhite(accent, .24),
        actionInk: '#182235', actionLight: mixWithWhite(accent, .18),
        action: mixWithWhite(accent, .42), actionHover: mixWithWhite(accent, .30),
        disabledInk: '#64606a', disabled: '#eae3d6',
        correctInk: '#234a2a', correct: '#def3df',
        incorrectInk: '#754315', incorrect: '#fff0da', levelInk: '#835000'
    };
    if (scene === 'night') return { ...colors, ink: '#f5f7ff', levelInk: '#ffe09a', light: '#243e62', base: '#172b4d', hoverLight: '#345071', hover: '#243e62', character: '#172b4d', selected: '#345071', actionInk: '#f5f7ff', actionLight: '#345071', action: '#243e62', actionHover: '#345071', disabledInk: '#d0d5df', disabled: '#303c51' };
    if (scene === 'evening') return { ...colors, light: '#fff3e6', base: '#ffdfbb', character: '#ffdfbb' };
    return colors;
}

/** Glass endpoints stay readable even over the brightest/darkest landscape. */
export function sceneColors(scene: string) {
    if (scene === 'night') return { ink: '#f5f7ff', panel: '#172b4d', heading: '#ffffff', outline: '#12203b' };
    if (scene === 'evening') return { ink: '#43291f', panel: '#ffe3c7', heading: '#43291f', outline: '#fff7e9' };
    return { ink: '#263547', panel: '#fff6e4', heading: '#263547', outline: '#fffaf0' };
}
export function glassOver(panel: string, background: string): string {
    const behind = channels(background);
    return `#${channels(panel).map((value, index) => Math.round(value * .94 + behind[index]! * .06).toString(16).padStart(2, '0')).join('')}`;
}
