/**
 * Token types for Jira markup parsing
 */
export interface JiraToken {
	type: string;
	content: string;
	raw: string;
	children?: JiraToken[];
	meta?: Record<string, any>;
}

/**
 * Tokenizer for Jira markup
 */
export class JiraTokenizer {
	tokenize(input: string): JiraToken[] {
		const tokens: JiraToken[] = [];
		const lines = input.split(/\r?\n/);

		let i = 0;
		while (i < lines.length) {
			const line = lines[i];

			// Code block
			if (line.match(/^\{code(:[^}]+)?\}/)) {
				const codeMatch = this.parseCodeBlock(lines, i);
				if (codeMatch) {
					tokens.push(codeMatch.token);
					i = codeMatch.endIndex + 1;
					continue;
				}
			}

			// Quote block
			if (line.match(/^\{quote\}/)) {
				const quoteMatch = this.parseQuoteBlock(lines, i);
				if (quoteMatch) {
					tokens.push(quoteMatch.token);
					i = quoteMatch.endIndex + 1;
					continue;
				}
			}

			// Panel block
			if (line.match(/^\{panel/)) {
				const panelMatch = this.parsePanelBlock(lines, i);
				if (panelMatch) {
					tokens.push(panelMatch.token);
					i = panelMatch.endIndex + 1;
					continue;
				}
			}

			// Noformat block
			if (line.match(/^\{noformat\}/)) {
				const noformatMatch = this.parseNoformatBlock(lines, i);
				if (noformatMatch) {
					tokens.push(noformatMatch.token);
					i = noformatMatch.endIndex + 1;
					continue;
				}
			}

			// Confluence macros: {info}, {warning}, {note}, {tip}
			const confluenceMacroMatch = line.match(/^\{(info|warning|note|tip)([^}]*)\}/);
			if (confluenceMacroMatch) {
				const macroResult = this.parseConfluenceMacro(lines, i, confluenceMacroMatch[1]);
				if (macroResult) {
					tokens.push(macroResult.token);
					i = macroResult.endIndex + 1;
					continue;
				}
			}

			// Confluence expand macro
			if (line.match(/^\{expand([^}]*)\}/)) {
				const expandMatch = this.parseExpandMacro(lines, i);
				if (expandMatch) {
					tokens.push(expandMatch.token);
					i = expandMatch.endIndex + 1;
					continue;
				}
			}

			// Heading
			const headingMatch = line.match(/^h([1-6])\.(.*)$/);
			if (headingMatch) {
				tokens.push({
					type: 'heading',
					content: headingMatch[2].trim(),
					raw: line,
					meta: { level: parseInt(headingMatch[1]) }
				});
				i++;
				continue;
			}

			// Block quote (bq.)
			if (line.startsWith('bq.')) {
				tokens.push({
					type: 'blockquote',
					content: line.slice(3).trim(),
					raw: line
				});
				i++;
				continue;
			}

			// Horizontal rule
			if (line.match(/^-{4,}$/)) {
				tokens.push({
					type: 'hr',
					content: '',
					raw: line
				});
				i++;
				continue;
			}

			// Table row
			if (line.includes('||') || (line.startsWith('|') && line.endsWith('|'))) {
				const tableLines: string[] = [];
				while (i < lines.length && (lines[i].includes('||') || (lines[i].startsWith('|') && lines[i].endsWith('|')))) {
					tableLines.push(lines[i]);
					i++;
				}
				tokens.push({
					type: 'table',
					content: tableLines.join('\n'),
					raw: tableLines.join('\n')
				});
				continue;
			}

			// List item (bullet or numbered)
			const listMatch = line.match(/^([*#]+)\s+(.*)$/);
			if (listMatch) {
				tokens.push({
					type: 'list_item',
					content: listMatch[2],
					raw: line,
					meta: {
						marker: listMatch[1],
						level: listMatch[1].length,
						ordered: listMatch[1][listMatch[1].length - 1] === '#'
					}
				});
				i++;
				continue;
			}

			// Regular paragraph
			if (line.trim()) {
				tokens.push({
					type: 'paragraph',
					content: line,
					raw: line
				});
			} else {
				tokens.push({
					type: 'blank',
					content: '',
					raw: ''
				});
			}
			i++;
		}

		return tokens;
	}

	private parseCodeBlock(lines: string[], startIndex: number): { token: JiraToken; endIndex: number } | null {
		const openMatch = lines[startIndex].match(/^\{code(:[^}]+)?\}/);
		if (!openMatch) return null;

		const lang = openMatch[1]?.slice(1) || '';
		const contentLines: string[] = [];

		let i = startIndex + 1;
		while (i < lines.length && !lines[i].match(/^\{code\}/)) {
			contentLines.push(lines[i]);
			i++;
		}

		if (i >= lines.length) return null;

		return {
			token: {
				type: 'code_block',
				content: contentLines.join('\n'),
				raw: lines.slice(startIndex, i + 1).join('\n'),
				meta: { lang }
			},
			endIndex: i
		};
	}

	private parseQuoteBlock(lines: string[], startIndex: number): { token: JiraToken; endIndex: number } | null {
		if (!lines[startIndex].match(/^\{quote\}/)) return null;

		const contentLines: string[] = [];
		let i = startIndex + 1;

		while (i < lines.length && !lines[i].match(/^\{quote\}/)) {
			contentLines.push(lines[i]);
			i++;
		}

		if (i >= lines.length) return null;

		return {
			token: {
				type: 'quote_block',
				content: contentLines.join('\n'),
				raw: lines.slice(startIndex, i + 1).join('\n')
			},
			endIndex: i
		};
	}

	private parsePanelBlock(lines: string[], startIndex: number): { token: JiraToken; endIndex: number } | null {
		const openMatch = lines[startIndex].match(/^\{panel([^}]*)\}/);
		if (!openMatch) return null;

		const params = openMatch[1] || '';
		const contentLines: string[] = [];
		let i = startIndex + 1;

		while (i < lines.length && !lines[i].match(/^\{panel\}/)) {
			contentLines.push(lines[i]);
			i++;
		}

		if (i >= lines.length) return null;

		// Parse panel parameters
		const meta: Record<string, string> = {};
		const paramParts = params.split('|');
		for (const part of paramParts) {
			const [key, value] = part.split('=');
			if (key && value) {
				meta[key.replace(':', '')] = value;
			}
		}

		return {
			token: {
				type: 'panel',
				content: contentLines.join('\n'),
				raw: lines.slice(startIndex, i + 1).join('\n'),
				meta
			},
			endIndex: i
		};
	}

	private parseNoformatBlock(lines: string[], startIndex: number): { token: JiraToken; endIndex: number } | null {
		if (!lines[startIndex].match(/^\{noformat\}/)) return null;

		const contentLines: string[] = [];
		let i = startIndex + 1;

		while (i < lines.length && !lines[i].match(/^\{noformat\}/)) {
			contentLines.push(lines[i]);
			i++;
		}

		if (i >= lines.length) return null;

		return {
			token: {
				type: 'noformat',
				content: contentLines.join('\n'),
				raw: lines.slice(startIndex, i + 1).join('\n')
			},
			endIndex: i
		};
	}

	private parseConfluenceMacro(lines: string[], startIndex: number, macroType: string): { token: JiraToken; endIndex: number } | null {
		const openMatch = lines[startIndex].match(new RegExp(`^\\{${macroType}([^}]*)\\}`));
		if (!openMatch) return null;

		const params = openMatch[1] || '';
		const contentLines: string[] = [];
		let i = startIndex + 1;

		// Find the closing tag
		const closePattern = new RegExp(`^\\{${macroType}\\}`);
		while (i < lines.length && !lines[i].match(closePattern)) {
			contentLines.push(lines[i]);
			i++;
		}

		if (i >= lines.length) return null;

		// Parse parameters (e.g., :title=Something)
		const meta: Record<string, string> = { macroType };
		const titleMatch = params.match(/title=([^|]+)/);
		if (titleMatch) {
			meta.title = titleMatch[1].trim();
		}

		return {
			token: {
				type: 'confluence_macro',
				content: contentLines.join('\n'),
				raw: lines.slice(startIndex, i + 1).join('\n'),
				meta
			},
			endIndex: i
		};
	}

	private parseExpandMacro(lines: string[], startIndex: number): { token: JiraToken; endIndex: number } | null {
		const openMatch = lines[startIndex].match(/^\{expand([^}]*)\}/);
		if (!openMatch) return null;

		const params = openMatch[1] || '';
		const contentLines: string[] = [];
		let i = startIndex + 1;

		while (i < lines.length && !lines[i].match(/^\{expand\}/)) {
			contentLines.push(lines[i]);
			i++;
		}

		if (i >= lines.length) return null;

		// Parse title from params (e.g., :title=Click to expand or just :Click to expand)
		const meta: Record<string, string> = {};
		const titleMatch = params.match(/(?:title=)?:?(.+)/);
		if (titleMatch) {
			meta.title = titleMatch[1].trim();
		}

		return {
			token: {
				type: 'expand',
				content: contentLines.join('\n'),
				raw: lines.slice(startIndex, i + 1).join('\n'),
				meta
			},
			endIndex: i
		};
	}
}

/**
 * Converts Jira markup to Markdown
 */
export class ReverseTranslator {
	private tokenizer: JiraTokenizer;

	constructor() {
		this.tokenizer = new JiraTokenizer();
	}

	/**
	 * Convert Jira markup to Markdown
	 */
	convertJiraToMarkdown(jira: string): string {
		// First pass: block-level conversion using tokenizer
		const tokens = this.tokenizer.tokenize(jira);
		let output = '';

		for (const token of tokens) {
			output += this.renderToken(token);
		}

		// Second pass: inline conversions
		output = this.convertInlineMarkup(output);

		return output.trim() + '\n';
	}

	private renderToken(token: JiraToken): string {
		switch (token.type) {
			case 'heading':
				return '#'.repeat(token.meta?.level || 1) + ' ' + token.content + '\n\n';

			case 'code_block': {
				const lang = token.meta?.lang || '';
				return '```' + lang + '\n' + token.content + '\n```\n\n';
			}

			case 'noformat':
				return '```\n' + token.content + '\n```\n\n';

			case 'quote_block':
				return token.content.split('\n').map(line => '> ' + line).join('\n') + '\n\n';

			case 'blockquote':
				return '> ' + token.content + '\n\n';

			case 'hr':
				return '---\n\n';

			case 'table':
				return this.convertTable(token.content) + '\n';

			case 'list_item': {
				const indent = '  '.repeat((token.meta?.level || 1) - 1);
				const marker = token.meta?.ordered ? '1.' : '-';
				return indent + marker + ' ' + token.content + '\n';
			}

			case 'panel': {
				const panelTitle = token.meta?.title || 'NOTE';
				const panelContent = token.content
					.replace(/\{color:[^}]+\}/g, '')
					.replace(/\{color\}/g, '')
					.trim();
				return `> [!NOTE] ${panelTitle}\n` +
					panelContent.split('\n').map(line => '> ' + line).join('\n') + '\n\n';
			}

			case 'confluence_macro': {
				const macroType = token.meta?.macroType || 'info';
				const macroTitle = token.meta?.title || '';
				const macroContent = token.content
					.replace(/\{color:[^}]+\}/g, '')
					.replace(/\{color\}/g, '')
					.trim();

				const calloutTypeMap: Record<string, string> = {
					'info': 'INFO',
					'note': 'NOTE',
					'warning': 'WARNING',
					'tip': 'TIP',
				};
				const calloutType = calloutTypeMap[macroType] || 'NOTE';
				const calloutTitle = macroTitle || calloutType;

				return `> [!${calloutType}] ${calloutTitle}\n` +
					macroContent.split('\n').map(line => '> ' + line).join('\n') + '\n\n';
			}

			case 'expand': {
				const expandTitle = token.meta?.title || 'Details';
				const expandContent = token.content.trim();
				return `<details>\n<summary>${expandTitle}</summary>\n\n${expandContent}\n\n</details>\n\n`;
			}

			case 'paragraph':
				return token.content + '\n\n';

			case 'blank':
				return '\n';

			default:
				return token.raw + '\n';
		}
	}

	private convertTable(tableContent: string): string {
		const lines = tableContent.split('\n').filter(l => l.trim());
		const result: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const isHeader = line.includes('||');

			if (isHeader) {
				// Header row
				const cells = line.split('||').filter(c => c !== '');
				result.push('| ' + cells.map(c => c.trim()).join(' | ') + ' |');
				// Add separator
				result.push('|' + cells.map(() => '---').join('|') + '|');
			} else {
				// Regular row
				const cells = line.split('|').filter(c => c !== '');
				result.push('| ' + cells.map(c => c.trim()).join(' | ') + ' |');
			}
		}

		return result.join('\n');
	}

	private convertInlineMarkup(text: string): string {
		let result = text;

		// Bold: *text* → **text**
		result = result.replace(/\*([^*\n]+)\*/g, '**$1**');

		// Italic: _text_ → *text*
		result = result.replace(/_([^_\n]+)_/g, '*$1*');

		// Strikethrough: -text- → ~~text~~
		result = result.replace(/-([^-\n]+)-/g, '~~$1~~');

		// Inline code: {{code}} → `code`
		result = result.replace(/\{\{([^}]+)\}\}/g, '`$1`');

		// Links: [text|url] → [text](url)
		result = result.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '[$1]($2)');

		// Plain links: [url] → <url> or just url
		result = result.replace(/\[([^\]|]+)\]/g, '<$1>');

		// User mentions: [~username] → @username
		result = result.replace(/\[~([^\]]+)\]/g, '@$1');

		// Images with alt: !url|alt=text! → ![text](url)
		result = result.replace(/!([^|!\n\s]+)\|([^\n!]*)alt=([^\n!,]+?)([^\n!]*)!/g, '![$3]($1)');

		// Images with other params: !url|params! → ![](url)
		result = result.replace(/!([^|!\n\s]+)\|[^\n!]*!/g, '![]($1)');

		// Simple images: !url! → ![](url)
		result = result.replace(/!([^\n\s!|]+)!/g, '![]($1)');

		// Color tags: {color:...}text{color} → text (strip color)
		result = result.replace(/\{color:[^}]+\}([^]*?)\{color\}/g, '$1');

		// Citation: ??text?? → <cite>text</cite>
		result = result.replace(/\?\?([^?]+)\?\?/g, '<cite>$1</cite>');

		// Inserted: +text+ → <ins>text</ins>
		result = result.replace(/\+([^+\n]+)\+/g, '<ins>$1</ins>');

		// Superscript: ^text^ → <sup>text</sup>
		result = result.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');

		// Subscript: ~text~ → <sub>text</sub>
		result = result.replace(/~([^~\n]+)~/g, '<sub>$1</sub>');

		return result;
	}
}
