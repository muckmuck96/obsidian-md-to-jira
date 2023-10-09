import { Editor, Plugin } from "obsidian";

import { J2M } from "./j2m";
import MTJSettingsTab, {
	DEFAULT_SETTINGS,
	MTJPluginSettings,
} from "./settings";

export default class MTJPlugin extends Plugin {
	settings: MTJPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addCommand({
			id: "mtj-convert-note-to-jira",
			name: "Note to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const markup = J2M.toJ(editor.getDoc().getValue(), this.settings);
				await navigator.clipboard.writeText(markup);
			},
		});

		this.addCommand({
			id: "mtj-convert-selection-to-jira",
			name: "Selection to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const markup = J2M.toJ(editor.getSelection(), this.settings);
				await navigator.clipboard.writeText(markup);
			},
		});

		this.addCommand({
			id: "mtj-convert-jira-selection-to-markdown",
			name: "Jira markup (clipboard) to markdown note",
			editorCallback: async (editor: Editor) => {
				const markup = await navigator.clipboard.readText();
				const markdown = J2M.toM(markup);
				editor.replaceSelection(markdown);
			},
		});

		this.addSettingTab(new MTJSettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
