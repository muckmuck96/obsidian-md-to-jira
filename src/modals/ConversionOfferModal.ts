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
		this.titleEl.setText(`${markupName} markup detected`);

		contentEl.createEl('p', {
			text: `The clipboard content appears to be ${markupName} markup. Would you like to convert it to Markdown?`,
		});

		const previewText = this.clipboardContent.length > 200
			? this.clipboardContent.substring(0, 200) + '...'
			: this.clipboardContent;

		const previewContainer = contentEl.createDiv({ cls: 'mtj-conversion-preview' });
		previewContainer.createEl('code', { text: previewText });

		const buttonContainer = contentEl.createDiv({ cls: 'mtj-modal-buttons' });

		new ButtonComponent(buttonContainer)
			.setButtonText('Keep original')
			.onClick(() => {
				this.close();
				this.onDecision(false);
			});

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
