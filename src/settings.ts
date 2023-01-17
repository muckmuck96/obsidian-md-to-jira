import {
	App,
	PluginSettingTab,
	Setting,
	ToggleComponent,
	Notice,
} from "obsidian";
import MTJPlugin from "./main";

export interface MTJPluginSettings {
	imageEnableUploadToHost: boolean;
}

export const DEFAULT_SETTINGS: MTJPluginSettings = {
	imageEnableUploadToHost: false,
};

export default class MTJSettingsTab extends PluginSettingTab {
	plugin: MTJPlugin;

	constructor(app: App, plugin: MTJPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Markdown to Jira - Settings" });

		new Setting(containerEl)
			.setName(
				"Image Translation (This feature is still in development...)"
			)
			.setDesc("Should images be uploaded to one of the selected hosts?")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setDisabled(true);
				toggle.onChange(async () => {
					if (toggle.disabled) {
						new Notice(
							`This feature is still in development...`,
							3000
						);
						this.plugin.settings.imageEnableUploadToHost = false;
						toggle.setValue(false);
					} else {
						this.plugin.settings.imageEnableUploadToHost =
							toggle.getValue();
						await this.plugin.saveSettings();
					}
				});
			});
	}
}
