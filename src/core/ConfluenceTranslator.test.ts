import { ConfluenceTranslator } from './ConfluenceTranslator';
import MTJPlugin from '../main';
import { MTJPluginSettings, MTJCallout } from '../settings';

jest.mock('../main');

jest.mock('obsidian', () => ({
	App: jest.fn(),
	Notice: jest.fn(),
	TFile: jest.fn(),
	requestUrl: jest.fn(),
}));

jest.mock('../services/ImageHandler', () => {
	return {
		ImageHandler: jest.fn().mockImplementation(() => {
			return {
				handleImage: jest.fn().mockImplementation(async (src: string, alt: string) => {
					const isUrlOrBase64 = src.startsWith('http://') ||
						src.startsWith('https://') ||
						src.startsWith('data:image/');

					if (isUrlOrBase64) {
						return {
							jiraMarkup: `!${src}|alt=${alt}!`,
							success: true
						};
					} else {
						return {
							jiraMarkup: `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
{panel}

!${src}|alt=${alt}!`,
							success: true
						};
					}
				})
			};
		})
	};
});

describe('ConfluenceTranslator - Markdown to Confluence Conversion', () => {
	let translator: ConfluenceTranslator;
	let mockPlugin: jest.Mocked<MTJPlugin>;
	let defaultSettings: MTJPluginSettings;

	beforeEach(() => {
		const defaultCallout: MTJCallout = {
			identifier: 'NOTE',
			titleBgColor: '#deebff',
			titleColor: '#0747a6',
			contentBgColor: '#f4f5f7',
			contentColor: '#172b4d',
			contentBorderColor: '#4c9aff',
			titleIcon: ':information_source:'
		};

		defaultSettings = {
			renderMetadata: false,
			calloutConfigurations: [defaultCallout],
			taskListVisualization: {
				enabled: false,
				mapping: {}
			},
			imageUpload: {
				method: 'manual',
				imgbb: {
					apiKey: ''
				}
			},
			temp: {
				createCalloutConfiguration: ''
			},
			showCalloutConfiguration: false,
			version: '0.0.0',
			outputFormat: 'confluence',
			autoDetectJiraPaste: true,
			mermaidHandling: 'code-block',
			convertMentions: true,
			jiraIssueLink: {
				enabled: false,
				projectKeys: '',
				baseUrl: '',
			},
			showPreviewBeforeCopy: false,
		};

		mockPlugin = {
			settings: defaultSettings,
			app: {} as any
		} as any;

		translator = new ConfluenceTranslator(mockPlugin);
	});

	describe('Basic Formatting', () => {
		test('should convert bold text', async () => {
			const markdown = '**bold text**';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result.trim()).toBe('*bold text*');
		});

		test('should convert italic text', async () => {
			const markdown = '*italic text*';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result.trim()).toBe('_italic text_');
		});

		test('should convert headings', async () => {
			const markdown = '# Heading 1\n\n## Heading 2';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('h1. Heading 1');
			expect(result).toContain('h2. Heading 2');
		});
	});

	describe('Lists', () => {
		test('should convert bullet lists', async () => {
			const markdown = '- Item 1\n- Item 2';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('* Item 1');
			expect(result).toContain('* Item 2');
		});

		test('should convert numbered lists', async () => {
			const markdown = '1. First\n2. Second';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('# First');
			expect(result).toContain('# Second');
		});
	});

	describe('Code', () => {
		test('should convert inline code', async () => {
			const markdown = 'Use `code` here';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result.trim()).toBe('Use {{code}} here');
		});

		test('should convert code blocks', async () => {
			const markdown = '```javascript\nconst x = 1;\n```';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('{code:javascript}');
			expect(result).toContain('const x = 1;');
			expect(result).toContain('{code}');
		});
	});

	describe('Links', () => {
		test('should convert links', async () => {
			const markdown = '[Google](https://google.com)';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result.trim()).toBe('[Google|https://google.com]');
		});
	});

	describe('Tables', () => {
		test('should convert tables', async () => {
			const markdown = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('||Header 1||Header 2||');
			expect(result).toContain('|Cell 1|Cell 2|');
		});
	});

	describe('Confluence Callouts', () => {
		test('should convert NOTE callout to info macro', async () => {
			const markdown = '> [!NOTE] Important\n> This is important';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('{info:title=Important}');
			expect(result).toContain('This is important');
			expect(result).toContain('{info}');
		});

		test('should convert WARNING callout to warning macro', async () => {
			const markdown = '> [!WARNING] Be careful\n> Handle with care';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('{warning:title=Be careful}');
			expect(result).toContain('{warning}');
		});

		test('should convert TIP callout to tip macro', async () => {
			const markdown = '> [!TIP] Pro tip\n> Do it this way';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('{tip:title=Pro tip}');
			expect(result).toContain('{tip}');
		});

		test('should convert IMPORTANT callout to note macro', async () => {
			const markdown = '> [!IMPORTANT] Critical\n> Must read this';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('{note:title=Critical}');
			expect(result).toContain('{note}');
		});
	});

	describe('Blockquotes', () => {
		test('should convert blockquotes', async () => {
			const markdown = '> This is a quote';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('{quote}');
			expect(result).toContain('This is a quote');
		});
	});

	describe('Horizontal Rules', () => {
		test('should convert horizontal rules', async () => {
			const markdown = '---';
			const result = await translator.convertMarkdownToConfluence(markdown);
			expect(result).toContain('----');
		});
	});

	describe('Complex Documents', () => {
		test('should handle complete document', async () => {
			const markdown = `# Main Title

## Section 1

This is **bold** and *italic*.

- Item 1
- Item 2

\`\`\`javascript
const x = 42;
\`\`\`

> [!NOTE] Notice
> Important information

---

Final paragraph.`;

			const result = await translator.convertMarkdownToConfluence(markdown);

			expect(result).toContain('h1. Main Title');
			expect(result).toContain('h2. Section 1');
			expect(result).toContain('*bold*');
			expect(result).toContain('_italic_');
			expect(result).toContain('* Item 1');
			expect(result).toContain('{code:javascript}');
			expect(result).toContain('{info');
			expect(result).toContain('----');
			expect(result).toContain('Final paragraph');
		});
	});
});
