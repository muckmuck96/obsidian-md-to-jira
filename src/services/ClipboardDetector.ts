/**
 * Detects if clipboard content contains Jira or Confluence markup
 */
export class ClipboardDetector {
	// Strong Jira-specific patterns (high confidence)
	private static readonly JIRA_STRONG_PATTERNS = [
		/^h[1-6]\.\s/m,                       // Headings: h1. h2. etc.
		/\{code(:[^}]+)?\}[\s\S]*?\{code\}/,  // Code blocks
		/\{quote\}[\s\S]*?\{quote\}/,         // Quote blocks
		/\{noformat\}[\s\S]*?\{noformat\}/,   // Noformat blocks
		/\{panel[^}]*\}[\s\S]*?\{panel\}/,    // Panels
		/\{\{[^}]+\}\}/,                      // Inline code {{code}}
		/\[~[^\]]+\]/,                        // User mentions [~username]
		/^\|\|.+\|\|/m,                       // Table headers ||col1||col2||
		/\{color:[^}]+\}[^{]*\{color\}/,      // Color tags
		/\[\^[^\]]+\]/,                       // Superscript [^text]
		/\[([^\]|]+)\|https?:\/\/[^\]]+\]/,   // Links with URL [text|http...]
		/^bq\.\s/m,                           // Block quote bq.
		/\+[^+\s][^+]*\+/,                    // Underlined text +text+
		/\^[^^]+\^/,                          // Superscript ^text^
		/~[^~]+~/,                            // Subscript ~text~
		/\(\?\)/,                             // Jira emoticon (?)
		/\(!\)/,                              // Jira emoticon (!)
		/\(on\)/,                             // Jira emoticon (on)
		/\(off\)/,                            // Jira emoticon (off)
		/\(x\)/,                              // Jira emoticon (x)
		/\(\/\)/,                             // Jira emoticon (/)
		/\(\*[rgby]\)/,                       // Jira colored stars (*r), (*g), etc.
	];

	// Weak Jira patterns (need multiple to be confident)
	private static readonly JIRA_WEAK_PATTERNS = [
		/\[[^\]|]+\|[^\]]+\]/,                // Links [text|url]
		/!\S+\|[^!]*!/,                       // Images with params !url|param!
		/^\*\s+\S/m,                          // Bullet list starting with * (followed by content)
		/^#\s+\S/m,                           // Numbered list starting with # (followed by content)
		/^-{4,}$/m,                           // Horizontal rule ----
	];

	// Confluence-specific patterns (macros)
	private static readonly CONFLUENCE_PATTERNS = [
		/\{info[^}]*\}[\s\S]*?\{info\}/,       // Info macro
		/\{warning[^}]*\}[\s\S]*?\{warning\}/, // Warning macro
		/\{note[^}]*\}[\s\S]*?\{note\}/,       // Note macro
		/\{tip[^}]*\}[\s\S]*?\{tip\}/,         // Tip macro
		/\{expand[^}]*\}[\s\S]*?\{expand\}/,   // Expand macro
		/\{toc[^}]*\}/,                        // Table of contents
		/\{anchor:[^}]+\}/,                    // Anchor macro
		/\{status[^}]*\}/,                     // Status macro
		/\{jira[^}]*\}/,                       // Jira issue macro
		/\{children[^}]*\}/,                   // Children macro
	];

	// Patterns that indicate this is NOT Jira/Confluence markup
	private static readonly MARKDOWN_PATTERNS = [
		/^#{1,6}\s+\S/m,        // Markdown headings # ## ###
		/```[\s\S]*?```/,       // Markdown fenced code blocks
		/\[.+\]\(.+\)/,         // Markdown links [text](url)
		/!\[.*\]\(.+\)/,        // Markdown images ![alt](url)
		/\*\*[^*]+\*\*/,        // Markdown bold **text**
		/__[^_]+__/,            // Markdown bold __text__
	];

	/**
	 * Detect if text is likely Jira markup
	 * @param text The text to analyze
	 * @returns true if the text appears to be Jira markup
	 */
	static isLikelyJiraMarkup(text: string): boolean {
		if (!text || text.trim().length === 0) {
			return false;
		}

		// Check for strong patterns - any single match is enough
		for (const pattern of this.JIRA_STRONG_PATTERNS) {
			if (pattern.test(text)) {
				return true;
			}
		}

		// Count weak Jira pattern matches
		let weakScore = 0;
		for (const pattern of this.JIRA_WEAK_PATTERNS) {
			if (pattern.test(text)) {
				weakScore++;
			}
		}

		// Count Markdown pattern matches (indicates it's NOT Jira)
		let markdownScore = 0;
		for (const pattern of this.MARKDOWN_PATTERNS) {
			if (pattern.test(text)) {
				markdownScore++;
			}
		}

		// If we have weak patterns and no Markdown patterns, it's likely Jira
		// Or if we have more weak Jira patterns than Markdown patterns
		if (weakScore > 0 && markdownScore === 0) {
			return true;
		}

		return weakScore >= 2 && weakScore > markdownScore;
	}

	/**
	 * Detect if text is likely Confluence markup
	 * @param text The text to analyze
	 * @returns true if the text appears to be Confluence markup
	 */
	static isLikelyConfluenceMarkup(text: string): boolean {
		if (!text || text.trim().length === 0) {
			return false;
		}

		// Check if it has Confluence-specific macros
		for (const pattern of this.CONFLUENCE_PATTERNS) {
			if (pattern.test(text)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get the detected markup type
	 * @param text The text to analyze
	 * @returns 'jira', 'confluence', 'markdown', or 'unknown'
	 */
	static detectMarkupType(text: string): 'jira' | 'confluence' | 'markdown' | 'unknown' {
		if (this.isLikelyConfluenceMarkup(text)) {
			return 'confluence';
		}
		if (this.isLikelyJiraMarkup(text)) {
			return 'jira';
		}

		// Check for Markdown patterns
		for (const pattern of this.MARKDOWN_PATTERNS) {
			if (pattern.test(text)) {
				return 'markdown';
			}
		}

		return 'unknown';
	}
}
