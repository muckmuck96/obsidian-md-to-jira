import { ClipboardDetector } from './ClipboardDetector';

describe('ClipboardDetector', () => {
	describe('isLikelyJiraMarkup', () => {
		test('should detect Jira headings', () => {
			const text = 'h1. Heading\n\nSome text with {{code}} here';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(true);
		});

		test('should detect Jira code blocks', () => {
			const text = '{code:javascript}\nconst x = 1;\n{code}\n\n* List item';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(true);
		});

		test('should detect Jira panels', () => {
			const text = '{panel:title=Warning}\nContent here\n{panel}\n\nh2. Section';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(true);
		});

		test('should detect Jira user mentions', () => {
			const text = 'Hello [~john.doe], please check {{this.function()}}';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(true);
		});

		test('should detect Jira links', () => {
			const text = 'Check out [this link|https://example.com]\n\n* Item 1\n* Item 2';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(true);
		});

		test('should detect Jira tables', () => {
			const text = '||Header 1||Header 2||\n|Cell 1|Cell 2|\n\n* List';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(true);
		});

		test('should not detect plain text as Jira', () => {
			const text = 'Just some regular plain text without any special formatting.';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(false);
		});

		test('should not detect Markdown as Jira', () => {
			const text = '# Heading\n\n**Bold** and *italic*\n\n```javascript\ncode\n```';
			expect(ClipboardDetector.isLikelyJiraMarkup(text)).toBe(false);
		});

		test('should handle empty input', () => {
			expect(ClipboardDetector.isLikelyJiraMarkup('')).toBe(false);
			expect(ClipboardDetector.isLikelyJiraMarkup('   ')).toBe(false);
		});
	});

	describe('isLikelyConfluenceMarkup', () => {
		test('should detect Confluence info macro', () => {
			const text = '{info}\nThis is info\n{info}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should detect Confluence warning macro', () => {
			const text = '{warning}\nThis is a warning\n{warning}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should detect Confluence note macro', () => {
			const text = '{note}\nThis is a note\n{note}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should detect Confluence tip macro', () => {
			const text = '{tip}\nThis is a tip\n{tip}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should detect Confluence expand macro', () => {
			const text = '{expand:Click to expand}\nHidden content\n{expand}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should detect Confluence toc macro', () => {
			const text = 'h1. Title\n\n{toc}\n\nh2. Section';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should detect Confluence jira macro', () => {
			const text = 'See issue {jira:PROJ-123}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(true);
		});

		test('should not detect regular Jira as Confluence', () => {
			const text = 'h1. Heading\n\n* Item 1\n* Item 2\n\n{code}\ncode here\n{code}';
			expect(ClipboardDetector.isLikelyConfluenceMarkup(text)).toBe(false);
		});
	});

	describe('detectMarkupType', () => {
		test('should detect Confluence markup', () => {
			const text = '{info}\nThis is info\n{info}';
			expect(ClipboardDetector.detectMarkupType(text)).toBe('confluence');
		});

		test('should detect Jira markup', () => {
			const text = 'h1. Heading\n\n{{code}} here\n\n* List item';
			expect(ClipboardDetector.detectMarkupType(text)).toBe('jira');
		});

		test('should detect Markdown', () => {
			const text = '# Heading\n\n**Bold** text\n\n```code```';
			expect(ClipboardDetector.detectMarkupType(text)).toBe('markdown');
		});

		test('should return unknown for plain text', () => {
			const text = 'Just some plain text.';
			expect(ClipboardDetector.detectMarkupType(text)).toBe('unknown');
		});

		test('should prioritize Confluence over Jira', () => {
			// If it has Confluence macros, it's Confluence even if it has Jira patterns
			const text = 'h1. Heading\n\n{info}\nInfo here\n{info}\n\n* List';
			expect(ClipboardDetector.detectMarkupType(text)).toBe('confluence');
		});
	});
});
