import { Editor, Plugin } from "obsidian";

import { J2M } from "./j2m";
import MTJSettingsTab, {
	DEFAULT_SETTINGS,
	MTJPluginSettings,
} from "./settings";
import { Translator } from "./core/Translator";
import { UpdateModal } from "./modals/UpdateModal";

export default class MTJPlugin extends Plugin {
	settings: MTJPluginSettings;
	translator: Translator;

	async onload() {
		await this.loadSettings();

		const currentVersion = this.manifest.version;
		const storedVersion = this.settings.version;

		if (currentVersion != storedVersion) {
			if(currentVersion == "0.2.0") {
				new UpdateModal(this.app, currentVersion).open();
			}
			this.settings.version = currentVersion;
			await this.saveSettings();
		}

		this.translator = new Translator(this);
		this.addCommand({
			id: "mtj-convert-note-to-jira",
			name: "Note to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				let markup = "";
				if (this.settings.useLegacyConverter) {
					markup = J2M.toJ(editor.getDoc().getValue(), this.settings);
				} else {
					markup = this.translator.convertMarkdownToJira(editor.getDoc().getValue());
				}
				await navigator.clipboard.writeText(markup);
			},
		});

		this.addCommand({
			id: "mtj-convert-selection-to-jira",
			name: "Selection to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				let markup = "";
				if (this.settings.useLegacyConverter) {
					markup = J2M.toJ(editor.getSelection(), this.settings);
				} else {
					markup = this.translator.convertMarkdownToJira(editor.getSelection());
				}
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
