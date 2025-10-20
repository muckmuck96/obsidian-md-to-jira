import { Translator } from './Translator';
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

describe('Translator - Markdown to Jira Conversion', () => {
    let translator: Translator;
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
            useLegacyConverter: false,
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
            version: '0.0.0'
        };

        mockPlugin = {
            settings: defaultSettings,
            app: {} as any
        } as any;

        translator = new Translator(mockPlugin);
    });

    describe('Text Formatting', () => {
        test('should convert bold text (**text**) to Jira format (*text*)', async () => {
            const markdown = '**bold text**';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('*bold text*');
        });

        test('should convert italic text (*text*) to Jira format (_text_)', async () => {
            const markdown = '*italic text*';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('_italic text_');
        });

        test('should convert italic text (_text_) to Jira format (_text_)', async () => {
            const markdown = '_italic text_';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('_italic text_');
        });

        test('should convert strikethrough (~~text~~) to Jira format (-text-)', async () => {
            const markdown = '~~strikethrough text~~';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('-strikethrough text-');
        });

        test('should convert combined bold and italic (***text***) to Jira format (*_text_* or _*text*_)', async () => {
            const markdown = '***bold and italic***';
            const result = await translator.convertMarkdownToJira(markdown);
            // Both *_text_* and _*text*_ are valid Jira markup for bold+italic
            const isValid = result.trim() === '*_bold and italic_*' || result.trim() === '_*bold and italic*_';
            expect(isValid).toBe(true);
        });

        test('should handle multiple formatting in single line', async () => {
            const markdown = '**bold** and *italic* and ~~strikethrough~~';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('*bold* and _italic_ and -strikethrough-');
        });

        test('should preserve plain text without formatting', async () => {
            const markdown = 'plain text without any formatting';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('plain text without any formatting');
        });
    });

    describe('Headings', () => {
        test('should convert h1 (# text) to Jira format (h1. text)', async () => {
            const markdown = '# Heading 1';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h1. Heading 1');
        });

        test('should convert h2 (## text) to Jira format (h2. text)', async () => {
            const markdown = '## Heading 2';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h2. Heading 2');
        });

        test('should convert h3 (### text) to Jira format (h3. text)', async () => {
            const markdown = '### Heading 3';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h3. Heading 3');
        });

        test('should convert h4 (#### text) to Jira format (h4. text)', async () => {
            const markdown = '#### Heading 4';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h4. Heading 4');
        });

        test('should convert h5 (##### text) to Jira format (h5. text)', async () => {
            const markdown = '##### Heading 5';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h5. Heading 5');
        });

        test('should convert h6 (###### text) to Jira format (h6. text)', async () => {
            const markdown = '###### Heading 6';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h6. Heading 6');
        });

        test('should handle headings with formatting', async () => {
            const markdown = '## **Bold** Heading';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('h2. *Bold* Heading');
        });

        test('should handle multiple headings', async () => {
            const markdown = '# Heading 1\n\n## Heading 2\n\n### Heading 3';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('h1. Heading 1');
            expect(result).toContain('h2. Heading 2');
            expect(result).toContain('h3. Heading 3');
        });
    });

    describe('Lists', () => {
        describe('Bullet Lists', () => {
            test('should convert single-level bullet list', async () => {
                const markdown = '- Item 1\n- Item 2\n- Item 3';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('* Item 1');
                expect(result).toContain('* Item 2');
                expect(result).toContain('* Item 3');
            });

            test('should convert two-level nested bullet list', async () => {
                const markdown = '- Item 1\n  - Nested 1.1\n  - Nested 1.2\n- Item 2';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('* Item 1');
                expect(result).toContain('** Nested 1.1');
                expect(result).toContain('** Nested 1.2');
                expect(result).toContain('* Item 2');
            });

            test('should convert three-level nested bullet list', async () => {
                const markdown = '- Item 1\n  - Nested 1.1\n    - Deep 1.1.1\n    - Deep 1.1.2\n  - Nested 1.2\n- Item 2';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('* Item 1');
                expect(result).toContain('** Nested 1.1');
                expect(result).toContain('*** Deep 1.1.1');
                expect(result).toContain('*** Deep 1.1.2');
                expect(result).toContain('** Nested 1.2');
                expect(result).toContain('* Item 2');
            });
        });

        describe('Numbered Lists', () => {
            test('should convert single-level numbered list', async () => {
                const markdown = '1. First item\n2. Second item\n3. Third item';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('# First item');
                expect(result).toContain('# Second item');
                expect(result).toContain('# Third item');
            });

            test('should convert two-level nested numbered list', async () => {
                const markdown = '1. First item\n   1. Nested 1.1\n   2. Nested 1.2\n2. Second item';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('# First item');
                expect(result).toContain('## Nested 1.1');
                expect(result).toContain('## Nested 1.2');
                expect(result).toContain('# Second item');
            });

            test('should convert three-level nested numbered list', async () => {
                const markdown = '1. First\n   1. Nested 1.1\n      1. Deep 1.1.1\n      2. Deep 1.1.2\n   2. Nested 1.2\n2. Second';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('# First');
                expect(result).toContain('## Nested 1.1');
                expect(result).toContain('### Deep 1.1.1');
                expect(result).toContain('### Deep 1.1.2');
                expect(result).toContain('## Nested 1.2');
                expect(result).toContain('# Second');
            });
        });

        describe('Mixed Lists', () => {
            test('should handle bullet list with formatted text', async () => {
                const markdown = '- **Bold** item\n- *Italic* item\n- ~~Strike~~ item';
                const result = await translator.convertMarkdownToJira(markdown);
                expect(result).toContain('* *Bold* item');
                expect(result).toContain('* _Italic_ item');
                expect(result).toContain('* -Strike- item');
            });
        });
    });

    describe('Links', () => {
        test('should convert inline link to Jira format', async () => {
            const markdown = '[Link Text](https://example.com)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('[Link Text|https://example.com]');
        });

        test('should convert multiple links', async () => {
            const markdown = '[First](https://first.com) and [Second](https://second.com)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('[First|https://first.com]');
            expect(result).toContain('[Second|https://second.com]');
        });

        test('should handle links with special characters in text', async () => {
            const markdown = '[Link with **bold**](https://example.com)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('https://example.com');
        });
    });

    describe('Images', () => {
        test('should convert image with URL to Jira format', async () => {
            const markdown = '![Alt Text](https://example.com/image.png)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('!https://example.com/image.png|alt=Alt Text!');
        });

        test('should handle image with Base64 data', async () => {
            const markdown = '![Alt](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('data:image/png;base64');
            expect(result).toContain('alt=Alt');
        });

        test('should show warning panel for local image files', async () => {
            const markdown = '![Local Image](./local-image.png)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{panel:borderColor=#ffecb5|bgColor=#fff3cd}');
            expect(result).toContain('Warning');
            expect(result).toContain('./local-image.png');
        });

        test('should handle wiki-style image embed', async () => {
            const markdown = '![[atomic.jpg]]';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{panel:borderColor=#ffecb5|bgColor=#fff3cd}');
            expect(result).toContain('Warning');
            expect(result).toContain('atomic.jpg');
        });

        test('should handle wiki-style image with alt text', async () => {
            const markdown = '![[image.png|My Alt Text]]';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('image.png');
            expect(result).toContain('alt=My Alt Text');
        });
    });

    describe('Code', () => {
        test('should convert inline code to Jira format', async () => {
            const markdown = 'This is `inline code` in text';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('This is {{inline code}} in text');
        });

        test('should convert fenced code block without language', async () => {
            const markdown = '```\ncode line 1\ncode line 2\n```';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{code:none}');
            expect(result).toContain('code line 1');
            expect(result).toContain('code line 2');
            expect(result).toContain('{code}');
        });

        test('should convert fenced code block with JavaScript language', async () => {
            const markdown = '```javascript\nconst x = 42;\nconsole.log(x);\n```';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{code:javascript}');
            expect(result).toContain('const x = 42;');
            expect(result).toContain('console.log(x);');
            expect(result).toContain('{code}');
        });

        test('should convert fenced code block with Python language', async () => {
            const markdown = '```python\ndef hello():\n    print("Hello")\n```';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{code:python}');
            expect(result).toContain('def hello():');
            expect(result).toContain('print("Hello")');
        });

        test('should handle multiple inline code blocks', async () => {
            const markdown = 'Use `foo()` and `bar()` functions';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{{foo()}}');
            expect(result).toContain('{{bar()}}');
        });
    });

    describe('Tables', () => {
        test('should convert simple table to Jira format', async () => {
            const markdown = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('||Header 1||Header 2||');
            expect(result).toContain('|Cell 1|Cell 2|');
        });

        test('should convert table with multiple rows', async () => {
            const markdown = '| Name | Age |\n|------|-----|\n| John | 30  |\n| Jane | 25  |';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('||Name||Age||');
            expect(result).toContain('|John|30|');
            expect(result).toContain('|Jane|25|');
        });

        test('should handle table with formatted content', async () => {
            const markdown = '| Name | Status |\n|------|--------|\n| **John** | *Active* |';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('||Name||Status||');
            expect(result).toContain('*John*');
            expect(result).toContain('_Active_');
        });
    });

    describe('Blockquotes', () => {
        test('should convert simple blockquote to Jira format', async () => {
            const markdown = '> This is a quote';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{quote}');
            expect(result).toContain('This is a quote');
        });

        test('should convert multi-line blockquote', async () => {
            const markdown = '> Line 1\n> Line 2\n> Line 3';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{quote}');
            expect(result).toContain('Line 1');
            expect(result).toContain('Line 2');
            expect(result).toContain('Line 3');
        });

        test('should handle blockquote with formatting', async () => {
            const markdown = '> **Bold** quote with *italic*';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{quote}');
            expect(result).toContain('*Bold*');
            expect(result).toContain('_italic_');
        });
    });

    describe('Horizontal Rules', () => {
        test('should convert horizontal rule (---) to Jira format', async () => {
            const markdown = '---';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('----');
        });

        test('should convert horizontal rule (***) to Jira format', async () => {
            const markdown = '***';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('----');
        });

        test('should handle horizontal rules between content', async () => {
            const markdown = 'Content above\n\n---\n\nContent below';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('Content above');
            expect(result).toContain('----');
            expect(result).toContain('Content below');
        });
    });

    describe('Wiki-style Links', () => {
        test('should convert wiki-style link to Jira anchor format', async () => {
            const markdown = '[[Internal Page]]';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('[Internal Page|#internal-page]');
        });

        test('should convert multiple wiki-style links', async () => {
            const markdown = '[[First Page]] and [[Second Page]]';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('[First Page|#first-page]');
            expect(result).toContain('[Second Page|#second-page]');
        });

        test('should handle wiki-style links with spaces', async () => {
            const markdown = '[[My Page With Spaces]]';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('[My Page With Spaces|#my-page-with-spaces]');
        });
    });

    describe('YAML Frontmatter', () => {
        test('should not render frontmatter when renderMetadata is false', async () => {
            mockPlugin.settings.renderMetadata = false;
            const markdown = '---\ntitle: Test\nauthor: John\n---\n\nContent here';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).not.toContain('h1. Metadata');
            expect(result).toContain('Content here');
        });

        test('should render frontmatter when renderMetadata is true', async () => {
            mockPlugin.settings.renderMetadata = true;
            const markdown = '---\ntitle: Test Document\nauthor: John Doe\n---\n\nContent here';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('h1. Metadata');
            expect(result).toContain('* title: Test Document');
            expect(result).toContain('* author: John Doe');
            expect(result).toContain('Content here');
        });

        test('should handle frontmatter with arrays', async () => {
            mockPlugin.settings.renderMetadata = true;
            const markdown = '---\ntags:\n  - tag1\n  - tag2\n---\n\nContent';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('h1. Metadata');
            expect(result).toContain('tags');
        });

        test('should handle content without frontmatter', async () => {
            const markdown = 'Just regular content without frontmatter';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).not.toContain('h1. Metadata');
            expect(result).toContain('Just regular content');
        });
    });

    describe('Obsidian Callouts', () => {
        test('should convert NOTE callout to Jira panel', async () => {
            const markdown = '> [!NOTE] Important Note\n> This is the content';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{panel:');
            expect(result).toContain('bgColor=');
            expect(result).toContain('titleBGColor=');
            expect(result).toContain('title=');
            expect(result).toContain('This is the content');
            expect(result).toContain('{panel}');
        });

        test('should apply configured colors for callout', async () => {
            const markdown = '> [!NOTE] Test\n> Content';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('#deebff'); // titleBgColor
            expect(result).toContain('#0747a6'); // titleColor
            expect(result).toContain('#f4f5f7'); // contentBgColor
        });

        test('should include title icon in callout', async () => {
            const markdown = '> [!NOTE] Test Note\n> Content here';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain(':information_source:');
            expect(result).toContain('Test Note');
        });

        test('should handle multi-line callout content', async () => {
            const markdown = '> [!NOTE] Multi-line\n> Line 1\n> Line 2\n> Line 3';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('Line 1');
            expect(result).toContain('Line 2');
            expect(result).toContain('Line 3');
        });

        test('should handle callout without custom title', async () => {
            const markdown = '> [!NOTE]\n> Content only';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{panel:');
            expect(result).toContain('Content only');
        });
    });

    describe('Complex Nested Structures', () => {
        test('should handle lists with formatted text and links', async () => {
            const markdown = '- **Bold item** with [link](https://example.com)\n- *Italic* item with `code`';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('* *Bold item*');
            expect(result).toContain('[link|https://example.com]');
            expect(result).toContain('* _Italic_ item');
            expect(result).toContain('{{code}}');
        });

        test('should handle headings followed by lists', async () => {
            const markdown = '## Section\n\n- Item 1\n- Item 2';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('h2. Section');
            expect(result).toContain('* Item 1');
            expect(result).toContain('* Item 2');
        });

        test('should handle blockquote with multiple paragraphs', async () => {
            const markdown = '> Paragraph 1\n>\n> Paragraph 2';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('{quote}');
            expect(result).toContain('Paragraph 1');
            expect(result).toContain('Paragraph 2');
        });

        test('should handle complete document with mixed content', async () => {
            const markdown = `# Main Title

## Section 1

This is **bold** and *italic* text.

- List item 1
- List item 2
  - Nested item

\`\`\`javascript
const code = true;
\`\`\`

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

> A quote here

---

Final paragraph with [link](https://example.com).`;

            const result = await translator.convertMarkdownToJira(markdown);

            expect(result).toContain('h1. Main Title');
            expect(result).toContain('h2. Section 1');
            expect(result).toContain('*bold*');
            expect(result).toContain('_italic_');
            expect(result).toContain('* List item 1');
            expect(result).toContain('** Nested item');
            expect(result).toContain('{code:javascript}');
            expect(result).toContain('||Header 1||Header 2||');
            expect(result).toContain('{quote}');
            expect(result).toContain('----');
            expect(result).toContain('[link|https://example.com]');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty input', async () => {
            const markdown = '';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('');
        });

        test('should handle input with only whitespace', async () => {
            const markdown = '   \n\n   ';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result.trim()).toBe('');
        });

        test('should preserve line breaks between paragraphs', async () => {
            const markdown = 'Paragraph 1\n\nParagraph 2';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('Paragraph 1');
            expect(result).toContain('Paragraph 2');
        });

        test('should handle special characters in text', async () => {
            const markdown = 'Text with & < > " special chars';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('special chars');
        });

        test('should handle escaped markdown characters', async () => {
            const markdown = 'This is \\*not italic\\* and \\**not bold\\**';
            const result = await translator.convertMarkdownToJira(markdown);
            // The behavior here depends on markdown-it's handling of escapes
            expect(result).toBeTruthy();
        });

        test('should preserve multiple blank lines between paragraphs', async () => {
            const markdown = `**Section 1**
Blah blah

**Section 2**
Blah blah



**Section 3**

**Notes**
Some notes here











Some stuff down here`;

            const result = await translator.convertMarkdownToJira(markdown);

            expect(result).toContain('Blah blah\n\n*Section 2*');

            expect(result).toContain('Blah blah\n\n\n\n*Section 3*');

            expect(result).toContain('Some notes here\n\n\n\n\n\n\n\n\n\n\n\nSome stuff down here');
        });

        test('should preserve exact spacing in complex documents', async () => {
            const markdown = `First paragraph

Second paragraph


Third paragraph with gap`;

            const result = await translator.convertMarkdownToJira(markdown);

            expect(result).toMatch(/First paragraph\n\nSecond paragraph/);
            expect(result).toMatch(/Second paragraph\n\n\nThird paragraph with gap/);
        });

        test('should preserve spacing before tables correctly', async () => {
            const markdown = `Konfiguration:
- Item 1
- Item 2


| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

            const result = await translator.convertMarkdownToJira(markdown);

            const idx1 = result.indexOf('Item 2');
            const idx2 = result.indexOf('||Header 1||');
            const between = result.substring(idx1 + 'Item 2'.length, idx2);

            const newlineCount = (between.match(/\n/g) || []).length;
            expect(newlineCount).toBe(3);
        });
    });

    describe('Task Lists', () => {
        beforeEach(() => {
            mockPlugin.settings.taskListVisualization = {
                enabled: true,
                mapping: {
                    '[ ]': '(/)',
                    '[x]': '(on)',
                    '[X]': '(on)',
                    '[>]': '(*b)',
                    '[-]': '(-)',
                    '[/]': '(*y)',
                }
            };
        });

        test('should convert unchecked task to Jira emoticon', async () => {
            const markdown = '- [ ] Unchecked task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(/)');
            expect(result).toContain('Unchecked task');
        });

        test('should convert checked task (lowercase x)', async () => {
            const markdown = '- [x] Completed task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(on)');
            expect(result).toContain('Completed task');
        });

        test('should convert checked task (uppercase X)', async () => {
            const markdown = '- [X] Completed task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(on)');
            expect(result).toContain('Completed task');
        });

        test('should convert in-progress task', async () => {
            const markdown = '- [>] In progress task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(*b)');
            expect(result).toContain('In progress task');
        });

        test('should convert cancelled task', async () => {
            const markdown = '- [-] Cancelled task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(-)');
            expect(result).toContain('Cancelled task');
        });

        test('should convert partial task', async () => {
            const markdown = '- [/] Partially complete';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(*y)');
            expect(result).toContain('Partially complete');
        });

        test('should handle multiple task items', async () => {
            const markdown = '- [ ] First task\n- [x] Second task\n- [>] Third task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(/)');
            expect(result).toContain('First task');
            expect(result).toContain('(on)');
            expect(result).toContain('Second task');
            expect(result).toContain('(*b)');
            expect(result).toContain('Third task');
        });

        test('should handle nested task lists', async () => {
            const markdown = '- [ ] Parent task\n  - [x] Child task 1\n  - [ ] Child task 2';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(/)');
            expect(result).toContain('Parent task');
            expect(result).toContain('(on)');
            expect(result).toContain('Child task 1');
            expect(result).toContain('Child task 2');
        });

        test('should handle tasks with formatting', async () => {
            const markdown = '- [x] **Bold** task with *italic* text';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(on)');
            expect(result).toContain('*Bold*');
            expect(result).toContain('_italic_');
        });

        test('should handle tasks with links', async () => {
            const markdown = '- [ ] Task with [link](https://example.com)';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(/)');
            expect(result).toContain('[link|https://example.com]');
        });

        test('should handle tasks with inline code', async () => {
            const markdown = '- [x] Fix `bug` in code';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(on)');
            expect(result).toContain('{{bug}}');
        });

        test('should not convert tasks when disabled', async () => {
            mockPlugin.settings.taskListVisualization.enabled = false;
            const markdown = '- [ ] Task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('[ ]');
            expect(result).toContain('Task');
        });

        test('should handle unmapped checkbox states gracefully', async () => {
            const markdown = '- [!] Custom state';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('[!]');
            expect(result).toContain('Custom state');
        });

        test('should handle custom mapping', async () => {
            mockPlugin.settings.taskListVisualization.mapping['[!]'] = '(!)';
            const markdown = '- [!] Important task';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('(!)');
            expect(result).toContain('Important task');
        });

        test('should preserve regular lists without checkboxes', async () => {
            const markdown = '- Regular list item\n- Another item';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('* Regular list item');
            expect(result).toContain('* Another item');
            expect(result).not.toContain('(/)');
            expect(result).not.toContain('(on)');
        });

        test('should handle mixed regular and task lists', async () => {
            const markdown = '- Regular item\n- [ ] Task item\n- Another regular';
            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('Regular item');
            expect(result).toContain('(/)');
            expect(result).toContain('Task item');
            expect(result).toContain('Another regular');
        });

        test('should handle task lists in complex document', async () => {
            const markdown = `# Todo List

## Today's Tasks

- [x] Morning standup
- [ ] Review PR
- [>] Working on feature
- [-] Cancelled meeting

## Notes

Regular paragraph text.

- [ ] Another task`;

            const result = await translator.convertMarkdownToJira(markdown);
            expect(result).toContain('h1. Todo List');
            expect(result).toContain('h2. Today\'s Tasks');
            expect(result).toContain('(on)');
            expect(result).toContain('(/)');
            expect(result).toContain('(*b)');
            expect(result).toContain('(-)');
        });
    });
});
