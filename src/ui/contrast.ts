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

export function buttonColors(accent: string) {
    return {
        ink: '#263547', light: '#fffefa', base: '#fff0d1',
        hoverLight: '#ffffff', hover: '#ffe5ab', character: '#ffebc9',
        selected: mixWithWhite(accent, .24),
        actionInk: '#182235', actionLight: mixWithWhite(accent, .18),
        action: mixWithWhite(accent, .42), actionHover: mixWithWhite(accent, .30),
        disabledInk: '#64606a', disabled: '#eae3d6',
        correctInk: '#234a2a', correct: '#def3df',
        incorrectInk: '#754315', incorrect: '#fff0da', levelInk: '#835000'
    };
}
