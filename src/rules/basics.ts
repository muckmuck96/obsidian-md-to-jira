import MarkdownIt from "markdown-it";
import { Validator } from "src/utils/Validator";
import { Translator } from "src/core/Translator";

export function basics(md: MarkdownIt, options?: { translator?: Translator }): void {
    md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const level = tokens[idx].tag.slice(1);
        return `h${level}. `;
    };

    md.renderer.rules.heading_close = () => {
        return '\n';
    };

    md.renderer.rules.paragraph_open = () => {
        return '';
    };

    md.renderer.rules.paragraph_close = (tokens, idx) => {
        let isInListItem = false;
        for (let i = idx - 1; i >= 0; i--) {
            if (tokens[i].type === 'list_item_open') {
                isInListItem = true;
                break;
            }
            if (tokens[i].type === 'list_item_close') {
                break;
            }
        }

        if (isInListItem) {
            return '\n';
        }

        const openToken = tokens[idx - 2];

        let nextBlockToken = null;
        for (let i = idx + 1; i < tokens.length; i++) {
            if (tokens[i].type === 'paragraph_open' ||
                tokens[i].type === 'heading_open' ||
                tokens[i].type === 'list_item_open' ||
                tokens[i].type === 'table_open' ||
                tokens[i].type === 'hr' ||
                tokens[i].type === 'fence' ||
                tokens[i].type === 'blockquote_open') {
                nextBlockToken = tokens[i];
                break;
            }
        }

        if (openToken && openToken.map && nextBlockToken && nextBlockToken.map) {
            const currentEnd = openToken.map[1];
            const nextStart = nextBlockToken.map[0];
            const blankLines = nextStart - currentEnd;

            if (blankLines >= 1) {
                return '\n'.repeat(blankLines + 1);
            }
        }

        return '\n\n';
    };

    md.core.ruler.before('inline', 'list_fix', function (state) {
        const stack: any = []; 

        state.tokens.forEach((token, i) => {
            if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
                // Push new list level info onto the stack
                stack.push({
                    isOrdered: token.type === 'ordered_list_open',
                });
                token.meta = token.meta || {};
                token.meta.listLevel = stack.length;
                token.meta.isOrdered = token.type === 'ordered_list_open';
            } else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
                // Pop the list level from the stack when closing a list
                stack.pop();
                // Check if we are closing the last list in the stack
                if (stack.length === 0) {
                    // Add a custom marker to indicate the end of the list
                    const closeToken = new state.Token('list_end_marker', '', 0);
                    state.tokens.splice(i + 1, 0, closeToken);
                }
            } else if (token.type === 'list_item_open') {
                token.meta = token.meta || {};
                token.meta.listLevel = stack.length;
                token.meta.isOrdered = stack[stack.length - 1]?.isOrdered || false;
            }
        });
    });

    md.renderer.rules.list_item_open = (tokens, idx) => {
        const listLevel = tokens[idx].meta?.listLevel || 1;
        const isOrdered = tokens[idx].meta?.isOrdered || false;
        const marker = isOrdered ? '#' : '*';
        return marker.repeat(listLevel) + ' ';
    };

    md.renderer.rules.list_item_close = () => {
        return '';
    };

    md.renderer.rules.bullet_list_open = () => {
        return '';
    };

    md.renderer.rules.bullet_list_close = () => {
        return '';
    };

    md.renderer.rules.ordered_list_open = () => {
        return '';
    };

    md.renderer.rules.ordered_list_close = () => {
        return ''; 
    };

    md.renderer.rules.list_end_marker = (tokens, idx) => {
        let lastContentToken = null;
        for (let i = idx - 1; i >= 0; i--) {
            if ((tokens[i].type === 'paragraph_open' ||
                 tokens[i].type === 'inline' ||
                 tokens[i].type === 'heading_open') &&
                tokens[i].map) {
                lastContentToken = tokens[i];
                break;
            }
            if (tokens[i].type === 'bullet_list_open' || tokens[i].type === 'ordered_list_open') {
                break;
            }
        }

        let nextBlockToken = null;
        for (let i = idx + 1; i < tokens.length; i++) {
            if (tokens[i].type === 'paragraph_open' ||
                tokens[i].type === 'heading_open' ||
                tokens[i].type === 'list_item_open' ||
                tokens[i].type === 'table_open' ||
                tokens[i].type === 'hr' ||
                tokens[i].type === 'fence' ||
                tokens[i].type === 'blockquote_open') {
                nextBlockToken = tokens[i];
                break;
            }
        }

        if (lastContentToken && lastContentToken.map && nextBlockToken && nextBlockToken.map) {
            const contentEnd = lastContentToken.map[1];
            const nextStart = nextBlockToken.map[0];
            const blankLines = nextStart - contentEnd;

            if (blankLines > 0) {
                return '\n'.repeat(blankLines);
            }
        }

        return ''; 
    };

    md.renderer.rules.inline = (tokens, idx) => {
        return tokens[idx].content;
    };

    md.renderer.rules.text = (tokens, idx) => {
        return tokens[idx].content;
    };

    md.renderer.rules.strong_open = () => {
        return '*';
    };

    md.renderer.rules.strong_close = () => {
        return '*';
    };

    md.renderer.rules.em_open = () => {
        return '_';
    };

    md.renderer.rules.em_close = () => {
        return '_';
    };

    md.renderer.rules.s_open = () => {
        return '-'; 
    };

    md.renderer.rules.s_close = () => {
        return '-'; 
    };

    md.renderer.rules.link_open = (tokens, idx, options, env) => {
        env.currentHref = tokens[idx].attrGet('href');
        return `[`;
    };

    md.renderer.rules.link_close = (tokens, idx, options, env) => {
        const href = env.currentHref; 
        return `|${href}]`;
    };

    md.renderer.rules.text = (tokens, idx) => {
        return tokens[idx].content;
    };

    md.renderer.rules.image = (tokens, idx) => {
        const src = tokens[idx].attrGet('src');
        const alt = tokens[idx].content || 'Image';

        if (options?.translator && src != null) {
            return options.translator.registerImage(src, alt);
        }

        if (Validator.isUrlOrBase64(src)) {
            return `!${src}|alt=${alt}!`;
        }
        return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
				{panel}

				!${src}|alt=${alt}!`;
    };

    md.renderer.rules.code_inline = (tokens, idx) => {
        return `{{${tokens[idx].content}}}`;
    };

    md.renderer.rules.fence = (tokens, idx) => {
        const token = tokens[idx];
        const code = token.content.trim();
        const lang = token.info.trim() || 'none'; 
        return `{code:${lang}}\n${code}\n{code}\n`;
    };

    md.renderer.rules.table_open = () => {
        return '';
    };

    md.renderer.rules.table_close = () => {
        return '\n';
    };

    md.renderer.rules.thead_open = () => {
        return '';
    };

    md.renderer.rules.thead_close = () => {
        return '';
    };

    md.renderer.rules.tbody_open = () => {
        return '';
    };

    md.renderer.rules.tbody_close = () => {
        return '';
    };

    md.renderer.rules.tr_open = () => {
        return '';
    };

    md.renderer.rules.tr_close = (tokens, idx) => {
        let isHeaderRow = false;
        for (let i = idx - 1; i >= 0; i--) {
            if (tokens[i].type === 'thead_open') {
                isHeaderRow = true;
                break;
            }
            if (tokens[i].type === 'tbody_open' || tokens[i].type === 'thead_close') {
                break;
            }
        }

        if (isHeaderRow) {
            return '||\n';
        }

        return '|\n';
    };

    md.renderer.rules.th_open = () => {
        return '||';
    };

    md.renderer.rules.th_close = () => {
        return '';
    };

    md.renderer.rules.td_open = () => {
        return '|';
    };

    md.renderer.rules.td_close = () => {
        return '';
    };

    md.renderer.rules.blockquote_open = () => {
        return '{quote}\n';
    };

    md.renderer.rules.blockquote_close = () => {
        return '{quote}\n';
    };

    md.renderer.rules.hr = () => {
        return '----\n'; 
    };
}