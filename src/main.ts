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

		if (currentVersion !== storedVersion && storedVersion !== '0.0.0') {
			console.log(`[MTJPlugin] Version updated from ${storedVersion} to ${currentVersion}`);
			new UpdateModal(this.app, currentVersion).open();
		}

		if (currentVersion !== storedVersion) {
			this.settings.version = currentVersion;
			await this.saveSettings();
		}

		this.translator = new Translator(this);
		this.addCommand({
			id: "mtj-convert-note-to-jira",
			name: "Note to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const content = editor.getDoc().getValue();
				await this.convertToJira(content);
			},
		});

		this.addCommand({
			id: "mtj-convert-selection-to-jira",
			name: "Selection to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const content = editor.getSelection();
				await this.convertToJira(content);
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

	async convertToJira(content: string): Promise<void> {
		let markup = "";

		if (this.settings.useLegacyConverter) {
			markup = J2M.toJ(content, this.settings);
		} else {
			markup = await this.translator.convertMarkdownToJira(content);
		}

		await navigator.clipboard.writeText(markup);
	}

	onunload() {}

	async loadSettings() {
		const loadedData = await this.loadData();

		let needsMigration = false;

		if (loadedData) {
			const oldImageUpload = (loadedData as any).imageUpload;

			if (oldImageUpload && !oldImageUpload.method && (
				oldImageUpload.hasOwnProperty('enabled') ||
				oldImageUpload.hasOwnProperty('host') ||
				oldImageUpload.hasOwnProperty('username')
			)) {
				console.log('[MTJPlugin] Detected old settings format, migrating...');
				needsMigration = true;

				// Migrate old imageUpload settings to new format
				loadedData.imageUpload = {
					method: 'manual', // Default to manual for safety
					imgbb: {
						apiKey: '', 
					}
				};

				console.log('[MTJPlugin] Migrated imageUpload settings to new format');
			}

			// Also handle case where jiraApi exists (recent version before removal)
			if (oldImageUpload && oldImageUpload.jiraApi) {
				console.log('[MTJPlugin] Removing deprecated jiraApi configuration');
				needsMigration = true;

				if (oldImageUpload.method === 'jira-api') {
					loadedData.imageUpload.method = 'manual';
					console.log('[MTJPlugin] Changed upload method from jira-api to manual');
				}

				delete oldImageUpload.jiraApi;
			}

			if (oldImageUpload) {
				delete oldImageUpload.enabled;
				delete oldImageUpload.host;
				delete oldImageUpload.apiKey;
				delete oldImageUpload.username;
				delete oldImageUpload.password;
			}

			if ((loadedData as any).imageEnableUploadToHost !== undefined) {
				delete (loadedData as any).imageEnableUploadToHost;
				needsMigration = true;
			}

			// Migrate taskListVisualization if it's the old empty format
			if (loadedData.taskListVisualization &&
				loadedData.taskListVisualization.enabled === false &&
				Object.keys(loadedData.taskListVisualization.mapping || {}).length === 0) {
				console.log('[MTJPlugin] Migrating task list visualization to new defaults');
				loadedData.taskListVisualization = {
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
				needsMigration = true;
			}
		}

		this.settings = this.deepMerge(DEFAULT_SETTINGS, loadedData || {});

		if (needsMigration) {
			await this.saveSettings();
			console.log('[MTJPlugin] Settings migration completed and saved');
		}
	}

	deepMerge(target: any, source: any): any {
		const result = { ...target };

		for (const key in source) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				result[key] = this.deepMerge(target[key] || {}, source[key]);
			} else {
				result[key] = source[key];
			}
		}

		return result;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
