import { App, Modal, ButtonComponent } from 'obsidian';

type Segment = { text: string; cls?: string };

/**
 * Modal for previewing converted markup before copying to clipboard
 */
export class PreviewModal extends Modal {
	private markup: string;
	private markupType: 'jira' | 'confluence';
	private onCopy: () => void;

	constructor(
		app: App,
		markup: string,
		markupType: 'jira' | 'confluence',
		onCopy: () => void
	) {
		super(app);
		this.markup = markup;
		this.markupType = markupType;
		this.onCopy = onCopy;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const markupName = this.markupType === 'confluence' ? 'Confluence' : 'Jira';
		this.titleEl.setText(`${markupName} markup preview`);

		const previewContainer = contentEl.createDiv({ cls: 'mtj-preview-container' });
		const codeEl = previewContainer.createEl('code');
		this.highlightSyntax(codeEl, this.markup);

		contentEl.createEl('p', {
			text: `${this.markup.length} characters`,
			cls: 'mtj-preview-info',
		});

		const buttonContainer = contentEl.createDiv({ cls: 'mtj-modal-buttons' });

		new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => {
				this.close();
			});

		new ButtonComponent(buttonContainer)
			.setButtonText('Copy to clipboard')
			.setCta()
			.onClick(() => {
				this.close();
				this.onCopy();
			});
	}

	private highlightSyntax(container: HTMLElement, markup: string): void {
		const lines = markup.split('\n');
		lines.forEach((line, idx) => {
			const segments = this.tokenizeLine(line);
			for (const seg of segments) {
				if (seg.cls) {
					container.createSpan({ cls: seg.cls, text: seg.text });
				} else if (seg.text.length > 0) {
					container.appendText(seg.text);
				}
			}
			if (idx < lines.length - 1) {
				container.appendText('\n');
			}
		});
	}

	private tokenizeLine(line: string): Segment[] {
		const headingMatch = line.match(/^(h[1-6]\.)(.*)$/);
		if (headingMatch) {
			return [
				{ text: headingMatch[1], cls: 'mtj-syntax-accent' },
				{ text: headingMatch[2], cls: 'mtj-syntax-bold' },
			];
		}

		const listMatch = line.match(/^([*#]+)\s(.*)$/);
		if (listMatch) {
			const segments: Segment[] = [
				{ text: listMatch[1] + ' ', cls: 'mtj-syntax-accent' },
			];
			this.tokenizeInline(listMatch[2], segments);
			return segments;
		}

		const segments: Segment[] = [];
		this.tokenizeInline(line, segments);
		return segments;
	}

	private tokenizeInline(text: string, segments: Segment[]): void {
		let remaining = text;
		while (remaining.length > 0) {
			const blockMacro = remaining.match(
				/^(\{code[^}]*\}|\{\/code\}|\{panel[^}]*\}|\{panel\}|\{quote\})/
			);
			if (blockMacro) {
				segments.push({ text: blockMacro[0], cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(blockMacro[0].length);
				continue;
			}

			const inlineCode = remaining.match(/^\{\{([^}]+)\}\}/);
			if (inlineCode) {
				segments.push({ text: '{{', cls: 'mtj-syntax-accent' });
				segments.push({ text: inlineCode[1], cls: 'mtj-syntax-inline-code' });
				segments.push({ text: '}}', cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(inlineCode[0].length);
				continue;
			}

			if (remaining.startsWith('||')) {
				segments.push({ text: '||', cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(2);
				continue;
			}

			const link = remaining.match(/^\[([^\]|]+)(\|)([^\]]+)\]/);
			if (link) {
				segments.push({ text: '[', cls: 'mtj-syntax-accent' });
				segments.push({ text: link[1], cls: 'mtj-syntax-link-text' });
				segments.push({ text: link[2], cls: 'mtj-syntax-accent' });
				segments.push({ text: link[3], cls: 'mtj-syntax-link-url' });
				segments.push({ text: ']', cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(link[0].length);
				continue;
			}

			const nextSpecial = remaining.search(/[{[|]/);
			if (nextSpecial === -1) {
				segments.push({ text: remaining });
				break;
			}
			if (nextSpecial > 0) {
				segments.push({ text: remaining.slice(0, nextSpecial) });
				remaining = remaining.slice(nextSpecial);
			} else {
				segments.push({ text: remaining[0] });
				remaining = remaining.slice(1);
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
