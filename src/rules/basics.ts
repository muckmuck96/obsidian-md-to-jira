import MarkdownIt from "markdown-it";
import { Validator } from "src/utils/Validator";

export function basics(md: MarkdownIt): void {
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

    md.renderer.rules.paragraph_close = () => {
        return '\n\n';
    };

    // init handling lists
    md.core.ruler.before('inline', 'list_fix', function (state) {
        const stack: any = []; // Stack to track current list types

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
                // Use the current list level and type from the top of the stack
                token.meta = token.meta || {};
                token.meta.listLevel = stack.length;
                token.meta.isOrdered = stack[stack.length - 1]?.isOrdered || false;
            }
        });
    });

    // Rendering list items with correct markers for nesting
    md.renderer.rules.list_item_open = (tokens, idx) => {
        const listLevel = tokens[idx].meta?.listLevel || 1;
        const isOrdered = tokens[idx].meta?.isOrdered || false;
        const marker = isOrdered ? '#' : '*';
        return marker.repeat(listLevel) + ' ';
    };

    // Adjusting the list item close renderer to avoid new lines after third-level items
    md.renderer.rules.list_item_close = (tokens, idx) => {
        const listLevel = tokens[idx].meta?.listLevel || 1;
        // Avoid new lines after third-level list items
        return '';
    };

    // Handling bullet lists
    md.renderer.rules.bullet_list_open = () => {
        return '';
    };

    md.renderer.rules.bullet_list_close = () => {
        return '\n'; // No newline here
    };

    // Handling ordered lists
    md.renderer.rules.ordered_list_open = () => {
        return '';
    };

    md.renderer.rules.ordered_list_close = () => {
        return ''; // No newline here
    };

    // Custom renderer for the list end marker
    md.renderer.rules.list_end_marker = () => {
        return '\n'; // Add a newline after the entire list is complete
    };

    md.renderer.rules.paragraph_open = () => {
        return '';
    };

    md.renderer.rules.paragraph_close = () => {
        return '\n';
    };

    // Handling texts
    md.renderer.rules.inline = (tokens, idx) => {
        return tokens[idx].content;
    };

    md.renderer.rules.text = (tokens, idx) => {
        return tokens[idx].content;
    };

    // Handling bold and italics
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

    // Handling links
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

    // Handling images
    md.renderer.rules.image = (tokens, idx) => {
        const src = tokens[idx].attrGet('src');
        const alt = tokens[idx].content || 'Image';
        if (Validator.isUrlOrBase64(src)) {
            return `!${src}|alt=${alt}!`; 
        }
        // TODO: implement dynamical import of images
        return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
				{panel}
				
				!${src}|alt=${alt}!`;
    };

    // Handling code
    md.renderer.rules.code_inline = (tokens, idx) => {
        return `{{${tokens[idx].content}}}`;
    };

    // Handling code with syntax highlighting optional
    md.renderer.rules.fence = (tokens, idx) => {
        const token = tokens[idx];
        const code = token.content.trim();
        const lang = token.info.trim() || 'none'; // Default to 'none' if no language is specified
        return `{code:${lang}}\n${code}\n{code}\n`;
    };

    // Handling tables correctly
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

    md.renderer.rules.tr_close = () => {
        return '\n';
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

    // Adding a renderer for blockquotes to use Jira's {quote} syntax
    md.renderer.rules.blockquote_open = () => {
        return '{quote}\n';
    };

    md.renderer.rules.blockquote_close = () => {
        return '{quote}\n';
    };

    // Adding a renderer for horizontal rules
    md.renderer.rules.hr = () => {
        return '----\n'; 
    };
}