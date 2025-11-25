// @ts-nocheck
/**
 * Build lora prompt additions from current lora settings
 * @param {Object} config - App config with loras array
 * @param {Object} loraSliders - Slider settings { 'Age': { enabled: true, value: 1.5 }, ... }
 * @param {Object} loraToggles - Toggle settings { 'White Outline': true, ... }
 * @param {string} loraStyle - Selected style name or empty string
 * @returns {string} Lora prompt additions to append to prompt
 */
export function buildLoraPrompt(config: any, loraSliders: any, loraToggles: any, loraStyle: string): string {
    if (!config?.loras) return '';

    const additions: string[] = [];

    // Process sliders
    config.loras
        .filter((lora: any) => lora.type === 'slider')
        .forEach((lora: any) => {
            const sliderState = loraSliders[lora.name];
            if (sliderState?.enabled) {
                // Replace ${value} placeholder with actual value
                const prompt = lora.prompt.replace('${value}', sliderState.value);
                additions.push(prompt);
            }
        });

    // Process toggles
    config.loras
        .filter((lora: any) => lora.type === 'toggle')
        .forEach((lora: any) => {
            const toggleState = loraToggles[lora.name];
            if (toggleState) {
                additions.push(lora.prompt);
            }
        });

    // Process style
    if (loraStyle) {
        const style = config.loras.find((lora: any) => lora.type === 'style' && lora.name === loraStyle);
        if (style) {
            additions.push(style.prompt);
        }
    }

    // Join with commas and add leading comma if there are additions
    return additions.length > 0 ? ', ' + additions.join(', ') : '';
}
