import { Modal, App, Setting } from "obsidian";

export class UpdateModal extends Modal {
	version: string;

	constructor(app: App, version: string) {
		super(app);
		this.version = version;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: `Markdown to Jira Converter updated to ${this.version}`,
		});

		if (this.version == "0.2.0") {
			new Setting(contentEl).setName('Thank you for using this plugin.').setDesc(
				"I'm currently working on a significantly improved converter that will be much easier to extend. Stay tuned for exciting new features and enhancements!"
			);

			new Setting(contentEl).setName('').setDesc(
				"With this update, the new converter has been enabled by default. Since it's in an early beta stage, I've added an option in the settings to switch back to the legacy converter if needed."
			);

			new Setting(contentEl).setName('Stay tuned; more exciting updates are coming soon!');
		}
	}
}
