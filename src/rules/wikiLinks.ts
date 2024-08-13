import * as markdownIt from 'markdown-it';

export function wikiLinks(md: markdownIt): void {
    md.inline.ruler.before('link', 'wikilink', (state, silent) => {
        const max = state.posMax;
        const start = state.pos;

        // Check for the opening of a wikilink `[[`
        if (state.src.charCodeAt(start) !== 0x5B /* [ */ || state.src.charCodeAt(start + 1) !== 0x5B /* [ */) {
            return false;
        }

        let pos = start + 2;

        // Look for the closing `]]`
        while (pos < max) {
            if (state.src.charCodeAt(pos) === 0x5D /* ] */ && state.src.charCodeAt(pos + 1) === 0x5D /* ] */) {
                break;
            }
            pos++;
        }

        if (pos >= max) {
            return false;
        }

        const content = state.src.slice(start + 2, pos).trim();

        if (!silent) {
            const token = state.push('wikilink', '', 0);
            token.content = content;
            token.markup = '[[';
        }

        state.pos = pos + 2;
        return true;
    });

    // Renderer for wikilinks
    md.renderer.rules.wikilink = (tokens, idx) => {
        const content = tokens[idx].content;
        // Convert wikilinks to Jira format links assuming internal pages
        return `[${content}|#${content.replace(/\s+/g, '-').toLowerCase()}]`;
    };
}