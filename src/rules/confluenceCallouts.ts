import * as MarkdownIt from "markdown-it";
import { MTJCallout } from "../settings";

/**
 * Confluence-specific callout handling
 * Maps Obsidian callouts to Confluence macros: {info}, {warning}, {note}, {tip}
 */

// Map Obsidian callout types to Confluence macros
const CONFLUENCE_MACRO_MAP: Record<string, string> = {
	// Info types
	'NOTE': 'info',
	'INFO': 'info',
	'ABSTRACT': 'info',
	'SUMMARY': 'info',
	'TLDR': 'info',

	// Warning types
	'WARNING': 'warning',
	'CAUTION': 'warning',
	'ATTENTION': 'warning',

	// Note/Important types
	'IMPORTANT': 'note',
	'DANGER': 'note',
	'BUG': 'note',
	'FAILURE': 'note',
	'FAIL': 'note',
	'MISSING': 'note',
	'ERROR': 'note',

	// Tip types
	'TIP': 'tip',
	'HINT': 'tip',
	'SUCCESS': 'tip',
	'CHECK': 'tip',
	'DONE': 'tip',

	// Other types default to info
	'QUESTION': 'info',
	'HELP': 'info',
	'FAQ': 'info',
	'EXAMPLE': 'info',
	'QUOTE': 'info',
	'CITE': 'info',
};

export function confluenceCallouts(md: MarkdownIt, calloutConfigs: MTJCallout[]): void {
	md.block.ruler.before("blockquote", "confluence_callout", (state, startLine, endLine, silent) => {
		const startPos = state.bMarks[startLine] + state.tShift[startLine];
		const maxPos = state.eMarks[startLine];
		const lineText = state.src.slice(startPos, maxPos);

		// Match callout syntax: > [!TYPE] Title
		const calloutMatch = lineText.match(/^>\s*\[!(\w+)\]\s*(.*)?$/);
		if (!calloutMatch) {
			return false;
		}

		if (silent) {
			return true;
		}

		const calloutType = calloutMatch[1].toUpperCase();
		const calloutTitle = calloutMatch[2]?.trim() || calloutType;

		// Collect content lines
		const contentLines: string[] = [];
		let nextLine = startLine + 1;

		while (nextLine < endLine) {
			const pos = state.bMarks[nextLine] + state.tShift[nextLine];
			const max = state.eMarks[nextLine];
			const line = state.src.slice(pos, max);

			// Check if line continues the callout
			if (line.startsWith('>')) {
				// Remove leading '>' and optional space
				const content = line.replace(/^>\s?/, '');
				// Skip empty lines that are just continuation markers
				if (content.trim() || contentLines.length > 0) {
					contentLines.push(content);
				}
			} else if (line.trim() === '') {
				// Empty line might end the callout
				break;
			} else {
				// Non-continuation line ends the callout
				break;
			}
			nextLine++;
		}

		// Determine Confluence macro type
		const confluenceMacro = CONFLUENCE_MACRO_MAP[calloutType] || 'info';

		// Create opening token
		const tokenOpen = state.push('confluence_callout_open', 'div', 1);
		tokenOpen.block = true;
		tokenOpen.meta = {
			type: calloutType,
			title: calloutTitle,
			macro: confluenceMacro,
		};
		tokenOpen.map = [startLine, nextLine];

		// Create inline token for content
		const tokenContent = state.push('inline', '', 0);
		tokenContent.content = contentLines.join('\n');
		tokenContent.map = [startLine + 1, nextLine];
		tokenContent.children = [];

		// Create closing token
		state.push('confluence_callout_close', 'div', -1);

		state.line = nextLine;
		return true;
	});

	// Renderer for Confluence callout
	md.renderer.rules.confluence_callout_open = (tokens, idx) => {
		const meta = tokens[idx].meta;
		const macro = meta.macro;
		const title = meta.title;

		// Format: {macro:title=Title}\n
		if (title && title !== meta.type) {
			return `{${macro}:title=${title}}\n`;
		}
		return `{${macro}}\n`;
	};

	md.renderer.rules.confluence_callout_close = (tokens, idx) => {
		// Find the opening token to get the macro type
		let openIdx = idx - 1;
		while (openIdx >= 0 && tokens[openIdx].type !== 'confluence_callout_open') {
			openIdx--;
		}

		const macro = tokens[openIdx]?.meta?.macro || 'info';
		return `{${macro}}\n\n`;
	};
}
