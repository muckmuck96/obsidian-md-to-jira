import * as MarkdownIt from "markdown-it";
import { Validator } from "../utils/Validator";
import { ConfluenceTranslator } from "../core/ConfluenceTranslator";

/**
 * Confluence-specific markdown-it rules
 * Similar to Jira but with some Confluence-specific syntax
 */
export function confluenceBasics(md: MarkdownIt, options?: { translator?: ConfluenceTranslator }): void {
	md.renderer.rules.heading_open = (tokens, idx) => {
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

	// List handling (same as Jira)
	md.core.ruler.before('inline', 'confluence_list_fix', function (state) {
		const stack: Array<{ isOrdered: boolean }> = [];

		state.tokens.forEach((token, i) => {
			if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
				stack.push({
					isOrdered: token.type === 'ordered_list_open',
				});
				token.meta = token.meta || {};
				token.meta.listLevel = stack.length;
				token.meta.isOrdered = token.type === 'ordered_list_open';
			} else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
				stack.pop();
				if (stack.length === 0) {
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

	md.renderer.rules.list_item_close = () => '';
	md.renderer.rules.bullet_list_open = () => '';
	md.renderer.rules.bullet_list_close = () => '';
	md.renderer.rules.ordered_list_open = () => '';
	md.renderer.rules.ordered_list_close = () => '';
	md.renderer.rules.list_end_marker = () => '';

	md.renderer.rules.inline = (tokens, idx) => {
		return tokens[idx].content;
	};

	md.renderer.rules.text = (tokens, idx) => {
		return tokens[idx].content;
	};

	// Formatting
	md.renderer.rules.strong_open = () => '*';
	md.renderer.rules.strong_close = () => '*';
	md.renderer.rules.em_open = () => '_';
	md.renderer.rules.em_close = () => '_';
	md.renderer.rules.s_open = () => '-';
	md.renderer.rules.s_close = () => '-';

	// Links
	md.renderer.rules.link_open = (tokens, idx, options, env) => {
		env.currentHref = tokens[idx].attrGet('href');
		return `[`;
	};

	md.renderer.rules.link_close = (tokens, idx, options, env) => {
		const href = env.currentHref;
		return `|${href}]`;
	};

	// Images
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

	// Code
	md.renderer.rules.code_inline = (tokens, idx) => {
		return `{{${tokens[idx].content}}}`;
	};

	md.renderer.rules.fence = (tokens, idx) => {
		const token = tokens[idx];
		const code = token.content.trim();
		const lang = token.info.trim() || 'none';
		return `{code:${lang}}\n${code}\n{code}\n`;
	};

	// Tables (same as Jira - Confluence uses same syntax)
	md.renderer.rules.table_open = () => '';
	md.renderer.rules.table_close = () => '\n';
	md.renderer.rules.thead_open = () => '';
	md.renderer.rules.thead_close = () => '';
	md.renderer.rules.tbody_open = () => '';
	md.renderer.rules.tbody_close = () => '';
	md.renderer.rules.tr_open = () => '';

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
		return isHeaderRow ? '||\n' : '|\n';
	};

	md.renderer.rules.th_open = () => '||';
	md.renderer.rules.th_close = () => '';
	md.renderer.rules.td_open = () => '|';
	md.renderer.rules.td_close = () => '';

	// Blockquotes
	md.renderer.rules.blockquote_open = () => '{quote}\n';
	md.renderer.rules.blockquote_close = () => '{quote}\n';

	// Horizontal rule
	md.renderer.rules.hr = () => '----\n';
}
