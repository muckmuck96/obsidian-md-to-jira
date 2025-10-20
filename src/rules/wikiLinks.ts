import * as markdownIt from 'markdown-it';
import { Translator } from 'src/core/Translator';

export function wikiLinks(md: markdownIt, options?: { translator?: Translator }): void {
    md.inline.ruler.before('link', 'wikilink', (state, silent) => {
        const max = state.posMax;
        const start = state.pos;

        // Check for wiki image embed `![[` or wiki link `[[`
        const isImage = state.src.charCodeAt(start) === 0x21; /* ! */
        const linkStart = isImage ? start + 1 : start;

        // Check for the opening of a wikilink `[[`
        if (state.src.charCodeAt(linkStart) !== 0x5B /* [ */ || state.src.charCodeAt(linkStart + 1) !== 0x5B /* [ */) {
            return false;
        }

        let pos = linkStart + 2;

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

        const content = state.src.slice(linkStart + 2, pos).trim();

        if (!silent) {
            if (isImage) {
                const token = state.push('wiki_image', '', 0);
                token.content = content;
                token.markup = '![[';
            } else {
                const token = state.push('wikilink', '', 0);
                token.content = content;
                token.markup = '[[';
            }
        }

        state.pos = pos + 2;
        return true;
    });

    md.renderer.rules.wiki_image = (tokens, idx) => {
        const content = tokens[idx].content;

        // Parse the content to extract filename and optional alt text
        // Format can be: filename.jpg or filename.jpg|alt text
        const parts = content.split('|');
        const filename = parts[0].trim();
        const alt = parts[1]?.trim() || filename;

        if (options?.translator) {
            return options.translator.registerImage(filename, alt);
        }

        return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${filename}*{color}
{panel}

!${filename}|alt=${alt}!`;
    };

    md.renderer.rules.wikilink = (tokens, idx) => {
        const content = tokens[idx].content;
        // Convert wikilinks to Jira format links assuming internal pages
        return `[${content}|#${content.replace(/\s+/g, '-').toLowerCase()}]`;
    };
}