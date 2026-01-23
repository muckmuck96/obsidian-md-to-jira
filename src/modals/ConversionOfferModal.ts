import { App, Modal, ButtonComponent } from 'obsidian';

/**
 * Modal shown when Jira/Confluence markup is detected in clipboard during paste
 */
export class ConversionOfferModal extends Modal {
	private clipboardContent: string;
	private markupType: 'jira' | 'confluence';
	private onDecision: (shouldConvert: boolean) => void;

	constructor(
		app: App,
		clipboardContent: string,
		markupType: 'jira' | 'confluence',
		onDecision: (shouldConvert: boolean) => void
	) {
		super(app);
		this.clipboardContent = clipboardContent;
		this.markupType = markupType;
		this.onDecision = onDecision;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const markupName = this.markupType === 'confluence' ? 'Confluence' : 'Jira';

		contentEl.createEl('h2', { text: `${markupName} Markup Detected` });

		contentEl.createEl('p', {
			text: `The clipboard content appears to be ${markupName} markup. Would you like to convert it to Markdown?`
		});

		// Preview of the content (first 200 chars)
		const previewText = this.clipboardContent.length > 200
			? this.clipboardContent.substring(0, 200) + '...'
			: this.clipboardContent;

		const previewContainer = contentEl.createDiv({ cls: 'mtj-conversion-preview' });
		previewContainer.style.backgroundColor = 'var(--background-secondary)';
		previewContainer.style.padding = '10px';
		previewContainer.style.borderRadius = '6px';
		previewContainer.style.marginBottom = '16px';
		previewContainer.style.maxHeight = '150px';
		previewContainer.style.overflow = 'auto';
		previewContainer.style.fontFamily = 'monospace';
		previewContainer.style.fontSize = '12px';
		previewContainer.style.whiteSpace = 'pre-wrap';
		previewContainer.style.wordBreak = 'break-all';

		previewContainer.createEl('code', { text: previewText });

		// Button container
		const buttonContainer = contentEl.createDiv({ cls: 'mtj-modal-buttons' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '10px';

		// Keep Original button
		new ButtonComponent(buttonContainer)
			.setButtonText('Keep Original')
			.onClick(() => {
				this.close();
				this.onDecision(false);
			});

		// Convert to Markdown button (primary action)
		new ButtonComponent(buttonContainer)
			.setButtonText('Convert to Markdown')
			.setCta()
			.onClick(() => {
				this.close();
				this.onDecision(true);
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
