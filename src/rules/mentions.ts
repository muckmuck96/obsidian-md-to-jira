import * as MarkdownIt from "markdown-it";

/**
 * Convert @username mentions to Jira user mentions [~username]
 */
export function mentions(md: MarkdownIt): void {
	// Add inline rule to detect @mentions
	md.inline.ruler.push('mentions', (state, silent) => {
		const start = state.pos;
		const max = state.posMax;

		// Check if we're at an @ symbol
		if (state.src.charCodeAt(start) !== 0x40 /* @ */) {
			return false;
		}

		// Check if @ is at the start or preceded by whitespace/punctuation
		if (start > 0) {
			const prevChar = state.src.charCodeAt(start - 1);
			// Allow @ after whitespace, start of line, or certain punctuation
			if (!isValidPrecedingChar(prevChar)) {
				return false;
			}
		}

		// Find the end of the username
		let pos = start + 1;

		// Username must start with a letter
		if (pos >= max || !isValidUsernameStartChar(state.src.charCodeAt(pos))) {
			return false;
		}

		// Continue matching valid username characters
		while (pos < max && isValidUsernameChar(state.src.charCodeAt(pos))) {
			pos++;
		}

		// Must have at least one character after @
		if (pos === start + 1) {
			return false;
		}

		// Check that username ends at a word boundary
		if (pos < max && isValidUsernameChar(state.src.charCodeAt(pos))) {
			return false;
		}

		const username = state.src.slice(start + 1, pos);

		if (!silent) {
			const token = state.push('mention', '', 0);
			token.content = username;
			token.markup = '@';
		}

		state.pos = pos;
		return true;
	});

	// Renderer for mention tokens
	md.renderer.rules.mention = (tokens, idx) => {
		const username = tokens[idx].content;
		return `[~${username}]`;
	};
}

/**
 * Check if a character is valid at the start of a username
 */
function isValidUsernameStartChar(code: number): boolean {
	// a-z, A-Z
	return (code >= 0x61 && code <= 0x7A) || (code >= 0x41 && code <= 0x5A);
}

/**
 * Check if a character is valid within a username
 * Allows: letters, numbers, dots, underscores, hyphens
 */
function isValidUsernameChar(code: number): boolean {
	return (
		// a-z
		(code >= 0x61 && code <= 0x7A) ||
		// A-Z
		(code >= 0x41 && code <= 0x5A) ||
		// 0-9
		(code >= 0x30 && code <= 0x39) ||
		// . _ -
		code === 0x2E || code === 0x5F || code === 0x2D
	);
}

/**
 * Check if a character is valid before an @mention
 */
function isValidPrecedingChar(code: number): boolean {
	// Whitespace
	if (code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0D) {
		return true;
	}
	// Opening brackets, parens
	if (code === 0x28 || code === 0x5B || code === 0x7B) {
		return true;
	}
	// Punctuation: , ; : ! ? . /
	if (code === 0x2C || code === 0x3B || code === 0x3A ||
		code === 0x21 || code === 0x3F || code === 0x2E || code === 0x2F) {
		return true;
	}
	return false;
}
