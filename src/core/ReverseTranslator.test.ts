import { ReverseTranslator, JiraTokenizer } from './ReverseTranslator';

describe('JiraTokenizer', () => {
	let tokenizer: JiraTokenizer;

	beforeEach(() => {
		tokenizer = new JiraTokenizer();
	});

	describe('Headings', () => {
		test('should tokenize h1 heading', () => {
			const tokens = tokenizer.tokenize('h1. Heading 1');
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('heading');
			expect(tokens[0].content).toBe('Heading 1');
			expect(tokens[0].meta?.level).toBe(1);
		});

		test('should tokenize h2-h6 headings', () => {
			const input = 'h2. Level 2\nh3. Level 3\nh4. Level 4';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(3);
			expect(tokens[0].meta?.level).toBe(2);
			expect(tokens[1].meta?.level).toBe(3);
			expect(tokens[2].meta?.level).toBe(4);
		});
	});

	describe('Code Blocks', () => {
		test('should tokenize code block without language', () => {
			const input = '{code}\nconst x = 1;\n{code}';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('code_block');
			expect(tokens[0].content).toBe('const x = 1;');
			expect(tokens[0].meta?.lang).toBe('');
		});

		test('should tokenize code block with language', () => {
			const input = '{code:javascript}\nconst x = 1;\n{code}';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('code_block');
			expect(tokens[0].meta?.lang).toBe('javascript');
		});
	});

	describe('Lists', () => {
		test('should tokenize bullet list', () => {
			const input = '* Item 1\n* Item 2';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(2);
			expect(tokens[0].type).toBe('list_item');
			expect(tokens[0].meta?.ordered).toBe(false);
			expect(tokens[0].meta?.level).toBe(1);
		});

		test('should tokenize numbered list', () => {
			const input = '# Item 1\n# Item 2';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(2);
			expect(tokens[0].type).toBe('list_item');
			expect(tokens[0].meta?.ordered).toBe(true);
		});

		test('should tokenize nested list', () => {
			const input = '* Item 1\n** Nested\n* Item 2';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(3);
			expect(tokens[1].meta?.level).toBe(2);
		});
	});

	describe('Quote Blocks', () => {
		test('should tokenize quote block', () => {
			const input = '{quote}\nThis is quoted\n{quote}';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('quote_block');
			expect(tokens[0].content).toBe('This is quoted');
		});

		test('should tokenize block quote (bq.)', () => {
			const tokens = tokenizer.tokenize('bq. This is a quote');
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('blockquote');
			expect(tokens[0].content).toBe('This is a quote');
		});
	});

	describe('Tables', () => {
		test('should tokenize table with headers', () => {
			const input = '||Header 1||Header 2||\n|Cell 1|Cell 2|';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('table');
		});
	});

	describe('Horizontal Rule', () => {
		test('should tokenize horizontal rule', () => {
			const tokens = tokenizer.tokenize('----');
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('hr');
		});
	});

	describe('Panels', () => {
		test('should tokenize panel', () => {
			const input = '{panel:title=My Title}\nContent here\n{panel}';
			const tokens = tokenizer.tokenize(input);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('panel');
			expect(tokens[0].meta?.title).toBe('My Title');
		});
	});
});

describe('ReverseTranslator - Jira to Markdown Conversion', () => {
	let translator: ReverseTranslator;

	beforeEach(() => {
		translator = new ReverseTranslator();
	});

	describe('Text Formatting', () => {
		test('should convert bold (*text*) to Markdown (**text**)', () => {
			const jira = '*bold text*';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('**bold text**');
		});

		test('should convert italic (_text_) to Markdown (*text*)', () => {
			const jira = '_italic text_';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('*italic text*');
		});

		test('should convert strikethrough (-text-) to Markdown (~~text~~)', () => {
			const jira = '-strikethrough-';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('~~strikethrough~~');
		});

		test('should convert inline code ({{code}}) to Markdown (`code`)', () => {
			const jira = 'Use {{myFunction()}} here';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('Use `myFunction()` here');
		});

		test('should handle multiple formatting in one line', () => {
			const jira = '*bold* and _italic_ and -strikethrough-';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('**bold** and *italic* and ~~strikethrough~~');
		});
	});

	describe('Headings', () => {
		test('should convert h1. to # heading', () => {
			const jira = 'h1. Heading 1';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('# Heading 1');
		});

		test('should convert h2. to ## heading', () => {
			const jira = 'h2. Heading 2';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('## Heading 2');
		});

		test('should convert h3-h6 headings', () => {
			const jira = 'h3. Heading 3\n\nh4. Heading 4\n\nh5. Heading 5\n\nh6. Heading 6';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('### Heading 3');
			expect(result).toContain('#### Heading 4');
			expect(result).toContain('##### Heading 5');
			expect(result).toContain('###### Heading 6');
		});
	});

	describe('Lists', () => {
		test('should convert bullet list (* item) to Markdown (- item)', () => {
			const jira = '* Item 1\n* Item 2\n* Item 3';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('- Item 1');
			expect(result).toContain('- Item 2');
			expect(result).toContain('- Item 3');
		});

		test('should convert numbered list (# item) to Markdown (1. item)', () => {
			const jira = '# First\n# Second\n# Third';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('1. First');
			expect(result).toContain('1. Second');
			expect(result).toContain('1. Third');
		});

		test('should convert nested bullet list', () => {
			const jira = '* Item 1\n** Nested 1\n** Nested 2\n* Item 2';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('- Item 1');
			expect(result).toContain('  - Nested 1');
			expect(result).toContain('  - Nested 2');
			expect(result).toContain('- Item 2');
		});

		test('should convert nested numbered list', () => {
			const jira = '# First\n## Sub first\n## Sub second\n# Second';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('1. First');
			expect(result).toContain('  1. Sub first');
			expect(result).toContain('1. Second');
		});
	});

	describe('Links', () => {
		test('should convert [text|url] to [text](url)', () => {
			const jira = '[Google|https://google.com]';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('[Google](https://google.com)');
		});

		test('should convert plain link [url] to <url>', () => {
			const jira = '[https://example.com]';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('<https://example.com>');
		});

		test('should convert user mention [~username] to @username', () => {
			const jira = 'Hello [~john.doe]!';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('Hello @john.doe!');
		});
	});

	describe('Images', () => {
		test('should convert !url! to ![](url)', () => {
			const jira = '!https://example.com/image.png!';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('![](https://example.com/image.png)');
		});

		test('should convert !url|alt=text! to ![text](url)', () => {
			const jira = '!https://example.com/image.png|alt=My Image!';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('![My Image](https://example.com/image.png)');
		});

		test('should convert !url|thumbnail! to ![](url)', () => {
			const jira = '!image.png|thumbnail!';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('![](image.png)');
		});
	});

	describe('Code Blocks', () => {
		test('should convert {code}...{code} to fenced code block', () => {
			const jira = '{code}\nconst x = 1;\n{code}';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('```');
			expect(result).toContain('const x = 1;');
		});

		test('should convert {code:language}...{code} with language', () => {
			const jira = '{code:javascript}\nconst x = 1;\n{code}';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('```javascript');
			expect(result).toContain('const x = 1;');
		});

		test('should convert {noformat}...{noformat} to code block', () => {
			const jira = '{noformat}\nPreformatted text\n{noformat}';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('```');
			expect(result).toContain('Preformatted text');
		});
	});

	describe('Quotes', () => {
		test('should convert bq. to blockquote', () => {
			const jira = 'bq. This is a quote';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('> This is a quote');
		});

		test('should convert {quote}...{quote} to blockquote', () => {
			const jira = '{quote}\nLine 1\nLine 2\n{quote}';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('> Line 1');
			expect(result).toContain('> Line 2');
		});
	});

	describe('Tables', () => {
		test('should convert Jira table to Markdown table', () => {
			const jira = '||Header 1||Header 2||\n|Cell 1|Cell 2|';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('| Header 1 | Header 2 |');
			expect(result).toContain('|---|---|');
			expect(result).toContain('| Cell 1 | Cell 2 |');
		});

		test('should handle table with multiple rows', () => {
			const jira = '||Name||Age||\n|John|30|\n|Jane|25|';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('| Name | Age |');
			expect(result).toContain('| John | 30 |');
			expect(result).toContain('| Jane | 25 |');
		});
	});

	describe('Horizontal Rule', () => {
		test('should convert ---- to ---', () => {
			const jira = '----';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('---');
		});
	});

	describe('Panels', () => {
		test('should convert panel to callout', () => {
			const jira = '{panel:title=Important}\nThis is important content\n{panel}';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result).toContain('> [!NOTE] Important');
			expect(result).toContain('> This is important content');
		});
	});

	describe('Color Tags', () => {
		test('should strip color tags', () => {
			const jira = '{color:#ff0000}Red text{color}';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('Red text');
		});
	});

	describe('Special Formatting', () => {
		test('should convert citation ??text?? to <cite>text</cite>', () => {
			const jira = '??citation??';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('<cite>citation</cite>');
		});

		test('should convert +inserted+ to <ins>inserted</ins>', () => {
			const jira = '+inserted text+';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('<ins>inserted text</ins>');
		});

		test('should convert ^superscript^ to <sup>superscript</sup>', () => {
			const jira = '^super^';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('<sup>super</sup>');
		});

		test('should convert ~subscript~ to <sub>subscript</sub>', () => {
			const jira = '~sub~';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('<sub>sub</sub>');
		});
	});

	describe('Complex Documents', () => {
		test('should handle document with mixed content', () => {
			const jira = `h1. Main Title

h2. Section 1

This is *bold* and _italic_ text.

* Item 1
* Item 2
** Nested item

{code:javascript}
const x = 42;
{code}

||Name||Age||
|John|30|

----

bq. A quote here`;

			const result = translator.convertJiraToMarkdown(jira);

			expect(result).toContain('# Main Title');
			expect(result).toContain('## Section 1');
			expect(result).toContain('**bold**');
			expect(result).toContain('*italic*');
			expect(result).toContain('- Item 1');
			expect(result).toContain('  - Nested item');
			expect(result).toContain('```javascript');
			expect(result).toContain('const x = 42;');
			expect(result).toContain('| Name | Age |');
			expect(result).toContain('---');
			expect(result).toContain('> A quote here');
		});
	});

	describe('Edge Cases', () => {
		test('should handle empty input', () => {
			const result = translator.convertJiraToMarkdown('');
			expect(result.trim()).toBe('');
		});

		test('should handle input with only whitespace', () => {
			const result = translator.convertJiraToMarkdown('   \n\n   ');
			expect(result.trim()).toBe('');
		});

		test('should preserve plain text', () => {
			const jira = 'Just plain text without any formatting';
			const result = translator.convertJiraToMarkdown(jira);
			expect(result.trim()).toBe('Just plain text without any formatting');
		});
	});

	describe('Confluence Macros', () => {
		test('should convert {info} macro to INFO callout', () => {
			const confluence = '{info}\nThis is info content\n{info}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('> [!INFO]');
			expect(result).toContain('> This is info content');
		});

		test('should convert {info:title=Title} macro with title', () => {
			const confluence = '{info:title=Important Info}\nContent here\n{info}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('> [!INFO] Important Info');
			expect(result).toContain('> Content here');
		});

		test('should convert {warning} macro to WARNING callout', () => {
			const confluence = '{warning}\nThis is a warning\n{warning}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('> [!WARNING]');
			expect(result).toContain('> This is a warning');
		});

		test('should convert {note} macro to NOTE callout', () => {
			const confluence = '{note}\nThis is a note\n{note}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('> [!NOTE]');
			expect(result).toContain('> This is a note');
		});

		test('should convert {tip} macro to TIP callout', () => {
			const confluence = '{tip}\nThis is a tip\n{tip}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('> [!TIP]');
			expect(result).toContain('> This is a tip');
		});

		test('should convert {expand} macro to details/summary', () => {
			const confluence = '{expand:Click to see more}\nHidden content\n{expand}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('<details>');
			expect(result).toContain('<summary>Click to see more</summary>');
			expect(result).toContain('Hidden content');
			expect(result).toContain('</details>');
		});

		test('should handle multi-line Confluence macro content', () => {
			const confluence = '{info:title=Multi-line}\nLine 1\nLine 2\nLine 3\n{info}';
			const result = translator.convertJiraToMarkdown(confluence);
			expect(result).toContain('> [!INFO] Multi-line');
			expect(result).toContain('> Line 1');
			expect(result).toContain('> Line 2');
			expect(result).toContain('> Line 3');
		});
	});

	describe('Mixed Jira and Confluence Content', () => {
		test('should handle document with both Jira and Confluence syntax', () => {
			const mixed = `h1. Main Title

{info:title=Note}
Important information
{info}

* Bullet 1
* Bullet 2

{code:javascript}
const x = 1;
{code}

{warning}
Be careful!
{warning}`;

			const result = translator.convertJiraToMarkdown(mixed);

			expect(result).toContain('# Main Title');
			expect(result).toContain('> [!INFO] Note');
			expect(result).toContain('- Bullet 1');
			expect(result).toContain('```javascript');
			expect(result).toContain('> [!WARNING]');
			expect(result).toContain('> Be careful!');
		});
	});
});
