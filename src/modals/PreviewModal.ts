import { App, Modal, ButtonComponent } from 'obsidian';

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

		contentEl.createEl('h2', { text: `${markupName} Markup Preview` });

		// Create preview container with syntax highlighting
		const previewContainer = contentEl.createDiv({ cls: 'mtj-preview-container' });
		previewContainer.style.backgroundColor = 'var(--background-secondary)';
		previewContainer.style.padding = '16px';
		previewContainer.style.borderRadius = '6px';
		previewContainer.style.marginBottom = '16px';
		previewContainer.style.maxHeight = '400px';
		previewContainer.style.overflow = 'auto';
		previewContainer.style.fontFamily = 'var(--font-monospace)';
		previewContainer.style.fontSize = '13px';
		previewContainer.style.lineHeight = '1.5';
		previewContainer.style.whiteSpace = 'pre-wrap';
		previewContainer.style.wordBreak = 'break-word';

		// Add syntax-highlighted content
		const codeEl = previewContainer.createEl('code');
		this.highlightSyntax(codeEl, this.markup);

		// Character count info
		const infoEl = contentEl.createEl('p', {
			text: `${this.markup.length} characters`,
			cls: 'mtj-preview-info'
		});
		infoEl.style.fontSize = '12px';
		infoEl.style.color = 'var(--text-muted)';
		infoEl.style.marginBottom = '16px';

		// Button container
		const buttonContainer = contentEl.createDiv({ cls: 'mtj-modal-buttons' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '10px';

		// Cancel button
		new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => {
				this.close();
			});

		// Copy to Clipboard button (primary action)
		new ButtonComponent(buttonContainer)
			.setButtonText('Copy to Clipboard')
			.setCta()
			.onClick(() => {
				this.close();
				this.onCopy();
			});
	}

	private highlightSyntax(container: HTMLElement, markup: string): void {
		// Simple syntax highlighting for Jira/Confluence markup
		let html = this.escapeHtml(markup);

		// Highlight headings
		html = html.replace(/^(h[1-6]\.)(.*)$/gm, '<span style="color: var(--text-accent);">$1</span><span style="font-weight: bold;">$2</span>');

		// Highlight code blocks
		html = html.replace(/(\{code[^}]*\})/g, '<span style="color: var(--text-accent);">$1</span>');
		html = html.replace(/(\{\/code\}|\{code\}$)/gm, '<span style="color: var(--text-accent);">$1</span>');

		// Highlight panels
		html = html.replace(/(\{panel[^}]*\})/g, '<span style="color: var(--text-accent);">$1</span>');
		html = html.replace(/(\{panel\})/g, '<span style="color: var(--text-accent);">$1</span>');

		// Highlight quotes
		html = html.replace(/(\{quote\})/g, '<span style="color: var(--text-accent);">$1</span>');

		// Highlight inline code
		html = html.replace(/(\{\{)([^}]+)(\}\})/g, '<span style="color: var(--text-accent);">$1</span><span style="background: var(--background-primary-alt); padding: 2px 4px; border-radius: 3px;">$2</span><span style="color: var(--text-accent);">$3</span>');

		// Highlight table delimiters
		html = html.replace(/(\|\|)/g, '<span style="color: var(--text-accent);">$1</span>');

		// Highlight list markers
		html = html.replace(/^(\*+|\#+)\s/gm, '<span style="color: var(--text-accent);">$1</span> ');

		// Highlight links
		html = html.replace(/(\[)([^\]|]+)(\|)([^\]]+)(\])/g, '<span style="color: var(--text-accent);">$1</span><span style="color: var(--text-accent-hover);">$2</span><span style="color: var(--text-accent);">$3</span><span style="text-decoration: underline;">$4</span><span style="color: var(--text-accent);">$5</span>');

		container.innerHTML = html;
	}

	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
