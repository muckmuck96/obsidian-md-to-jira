import * as MarkdownIt from "markdown-it";

export interface IssueLinksOptions {
	projectKeys: string[];
	baseUrl: string;
}

/**
 * Convert Jira issue keys (e.g., PROJ-123) to links
 */
export function issueLinks(md: MarkdownIt, options: IssueLinksOptions): void {
	if (!options.projectKeys || options.projectKeys.length === 0) {
		return;
	}

	// Build regex pattern from project keys
	const keysPattern = options.projectKeys
		.map(key => key.trim().toUpperCase())
		.filter(key => key.length > 0)
		.join('|');

	if (!keysPattern) {
		return;
	}

	// Pattern: PROJECT-123
	const issuePattern = new RegExp(`\\b(${keysPattern})-(\\d+)\\b`, 'g');

	// Store original text renderer
	const originalText = md.renderer.rules.text;

	md.renderer.rules.text = (tokens, idx, opts, env, self) => {
		const content = tokens[idx].content;

		// Check if content contains any issue keys
		if (!issuePattern.test(content)) {
			// Reset lastIndex since test() advances it
			issuePattern.lastIndex = 0;
			if (originalText) {
				return originalText(tokens, idx, opts, env, self);
			}
			return content;
		}

		// Reset lastIndex for the replace operation
		issuePattern.lastIndex = 0;

		// Replace issue keys with Jira links
		const baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash

		const result = content.replace(issuePattern, (match, project, number) => {
			const issueKey = `${project}-${number}`;
			if (baseUrl) {
				return `[${issueKey}|${baseUrl}/browse/${issueKey}]`;
			} else {
				// If no base URL, just format as a reference
				return `[${issueKey}]`;
			}
		});

		return result;
	};

	// Also handle inline tokens to catch issue keys in various contexts
	md.core.ruler.push('issue_links', (state) => {
		for (const blockToken of state.tokens) {
			if (blockToken.type !== 'inline' || !blockToken.children) {
				continue;
			}

			const newChildren: any[] = [];

			for (const token of blockToken.children) {
				if (token.type !== 'text') {
					newChildren.push(token);
					continue;
				}

				// Check if this text token contains issue keys
				issuePattern.lastIndex = 0;
				if (!issuePattern.test(token.content)) {
					newChildren.push(token);
					continue;
				}

				// Split and process the text
				issuePattern.lastIndex = 0;
				let lastIndex = 0;
				let match;
				const content = token.content;

				while ((match = issuePattern.exec(content)) !== null) {
					// Add text before the match
					if (match.index > lastIndex) {
						const textToken = new state.Token('text', '', 0);
						textToken.content = content.slice(lastIndex, match.index);
						newChildren.push(textToken);
					}

					// Add the issue link token
					const issueToken = new state.Token('issue_link', '', 0);
					issueToken.content = match[0];
					issueToken.meta = {
						project: match[1],
						number: match[2],
						baseUrl: options.baseUrl,
					};
					newChildren.push(issueToken);

					lastIndex = match.index + match[0].length;
				}

				// Add remaining text after last match
				if (lastIndex < content.length) {
					const textToken = new state.Token('text', '', 0);
					textToken.content = content.slice(lastIndex);
					newChildren.push(textToken);
				}
			}

			blockToken.children = newChildren;
		}
	});

	// Renderer for issue link tokens
	md.renderer.rules.issue_link = (tokens, idx) => {
		const token = tokens[idx];
		const issueKey = token.content;
		const baseUrl = token.meta?.baseUrl?.replace(/\/$/, '') || '';

		if (baseUrl) {
			return `[${issueKey}|${baseUrl}/browse/${issueKey}]`;
		}
		return `[${issueKey}]`;
	};
}
