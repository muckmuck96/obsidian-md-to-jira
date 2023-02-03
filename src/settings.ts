import {
	App,
	PluginSettingTab,
	Setting,
	TextComponent,
} from "obsidian";
import MTJPlugin from "./main";
import { FolderSuggest } from "./util/folderSuggest";

export interface MTJPluginSettings {
	imageDirectoryPath: string;
}

export const DEFAULT_SETTINGS: MTJPluginSettings = {
	imageDirectoryPath: "/",
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
				"Image Directory Path"
			)
			.setDesc("Location of all images, which should be automatically copied")
			.addSearch((text: TextComponent) => {
				new FolderSuggest(text.inputEl);
				text
					.setPlaceholder("Example: folderA/folderB")
					.setValue(this.plugin.settings.imageDirectoryPath)
					.onChange(async () => {
						this.plugin.settings.imageDirectoryPath = text.getValue();
						await this.plugin.saveSettings();
					});
			});
	}
}
