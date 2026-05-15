import { Editor, Notice, Plugin } from "obsidian";

import MTJSettingsTab, {
	DEFAULT_SETTINGS,
	MTJPluginSettings,
} from "./settings";
import { Translator } from "./core/Translator";
import { ConfluenceTranslator } from "./core/ConfluenceTranslator";
import { ReverseTranslator } from "./core/ReverseTranslator";
import { UpdateModal } from "./modals/UpdateModal";
import { PreviewModal } from "./modals/PreviewModal";
import { ClipboardDetector } from "./services/ClipboardDetector";
import { ConversionOfferModal } from "./modals/ConversionOfferModal";
import { MESSAGES } from "./constants";

export default class MTJPlugin extends Plugin {
	settings: MTJPluginSettings;
	translator: Translator;
	confluenceTranslator: ConfluenceTranslator;
	reverseTranslator: ReverseTranslator;

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
		this.confluenceTranslator = new ConfluenceTranslator(this);
		this.reverseTranslator = new ReverseTranslator();

		// Convert note to Jira markup
		this.addCommand({
			id: "mtj-convert-note-to-jira",
			name: "Note to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const content = editor.getDoc().getValue();
				await this.convertToJira(content);
			},
		});

		// Convert selection to Jira markup
		this.addCommand({
			id: "mtj-convert-selection-to-jira",
			name: "Selection to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const content = editor.getSelection();
				await this.convertToJira(content);
			},
		});

		// Convert Jira markup from clipboard to Markdown
		this.addCommand({
			id: "mtj-convert-jira-selection-to-markdown",
			name: "Jira markup (clipboard) to markdown note",
			editorCallback: async (editor: Editor) => {
				const markup = await navigator.clipboard.readText();
				const markdown = this.reverseTranslator.convertJiraToMarkdown(markup);
				editor.replaceSelection(markdown);
			},
		});

		// Convert Confluence markup from clipboard to Markdown
		this.addCommand({
			id: "mtj-convert-confluence-selection-to-markdown",
			name: "Confluence markup (clipboard) to markdown note",
			editorCallback: async (editor: Editor) => {
				const markup = await navigator.clipboard.readText();
				// ReverseTranslator handles both Jira and Confluence markup
				const markdown = this.reverseTranslator.convertJiraToMarkdown(markup);
				editor.replaceSelection(markdown);
			},
		});

		// Convert note to Confluence markup
		this.addCommand({
			id: "mtj-convert-note-to-confluence",
			name: "Note to Confluence markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const content = editor.getDoc().getValue();
				await this.convertToConfluence(content);
			},
		});

		// Convert selection to Confluence markup
		this.addCommand({
			id: "mtj-convert-selection-to-confluence",
			name: "Selection to Confluence markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const content = editor.getSelection();
				await this.convertToConfluence(content);
			},
		});

		// Register paste event handler for auto-detection
		// Note: Must handle synchronously to properly preventDefault
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
				if (evt.defaultPrevented) {
					return;
				}
				if (!this.settings.autoDetectJiraPaste) {
					return;
				}

				const clipboardText = evt.clipboardData?.getData('text/plain');
				if (!clipboardText || clipboardText.trim().length === 0) {
					return;
				}

				const markupType = ClipboardDetector.detectMarkupType(clipboardText);

				if (markupType === 'jira' || markupType === 'confluence') {
					// Must call preventDefault synchronously before any async work
					evt.preventDefault();

					// Store references for use in modal callback
					const reverseTranslator = this.reverseTranslator;

					new ConversionOfferModal(
						this.app,
						clipboardText,
						markupType,
						(shouldConvert) => {
							if (shouldConvert) {
								const markdown = reverseTranslator.convertJiraToMarkdown(clipboardText);
								editor.replaceSelection(markdown);
							} else {
								editor.replaceSelection(clipboardText);
							}
						}
					).open();
				}
			})
		);

		this.addSettingTab(new MTJSettingsTab(this.app, this));
	}

	async convertToJira(content: string): Promise<void> {
		const markup = await this.translator.convertMarkdownToJira(content);

		if (this.settings.showPreviewBeforeCopy) {
			new PreviewModal(this.app, markup, 'jira', async () => {
				await navigator.clipboard.writeText(markup);
				new Notice(MESSAGES.SUCCESS.COPIED_CLIPBOARD);
			}).open();
		} else {
			await navigator.clipboard.writeText(markup);
			new Notice(MESSAGES.SUCCESS.COPIED_CLIPBOARD);
		}
	}

	async convertToConfluence(content: string): Promise<void> {
		const markup = await this.confluenceTranslator.convertMarkdownToConfluence(content);

		if (this.settings.showPreviewBeforeCopy) {
			new PreviewModal(this.app, markup, 'confluence', async () => {
				await navigator.clipboard.writeText(markup);
				new Notice(MESSAGES.SUCCESS.COPIED_CLIPBOARD);
			}).open();
		} else {
			await navigator.clipboard.writeText(markup);
			new Notice(MESSAGES.SUCCESS.COPIED_CLIPBOARD);
		}
	}

	onunload() {}

	async loadSettings() {
		const loadedData = (await this.loadData()) as Record<string, unknown> | null;

		let needsMigration = false;

		if (loadedData) {
			const hasOwn = (obj: Record<string, unknown>, key: string): boolean =>
				Object.prototype.hasOwnProperty.call(obj, key);

			const oldImageUpload = loadedData.imageUpload as Record<string, unknown> | undefined;

			if (oldImageUpload && !oldImageUpload.method && (
				hasOwn(oldImageUpload, 'enabled') ||
				hasOwn(oldImageUpload, 'host') ||
				hasOwn(oldImageUpload, 'username')
			)) {
				console.log('[MTJPlugin] Detected old settings format, migrating...');
				needsMigration = true;

				loadedData.imageUpload = {
					method: 'manual',
					imgbb: {
						apiKey: '',
					}
				};

				console.log('[MTJPlugin] Migrated imageUpload settings to new format');
			}

			if (oldImageUpload && oldImageUpload.jiraApi) {
				console.log('[MTJPlugin] Removing deprecated jiraApi configuration');
				needsMigration = true;

				if (oldImageUpload.method === 'jira-api') {
					(loadedData.imageUpload as Record<string, unknown>).method = 'manual';
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

			if (loadedData.imageEnableUploadToHost !== undefined) {
				delete loadedData.imageEnableUploadToHost;
				needsMigration = true;
			}

			const tlv = loadedData.taskListVisualization as
				{ enabled?: boolean; mapping?: Record<string, string> } | undefined;
			if (tlv &&
				tlv.enabled === false &&
				Object.keys(tlv.mapping || {}).length === 0) {
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

			if (loadedData.useLegacyConverter !== undefined) {
				delete loadedData.useLegacyConverter;
				needsMigration = true;
				console.log('[MTJPlugin] Removed deprecated useLegacyConverter setting');
			}
		}

		this.settings = this.deepMerge(
			DEFAULT_SETTINGS as unknown as Record<string, unknown>,
			(loadedData || {}) as Record<string, unknown>,
		) as unknown as MTJPluginSettings;

		if (needsMigration) {
			await this.saveSettings();
			console.log('[MTJPlugin] Settings migration completed and saved');
		}
	}

	deepMerge(
		target: Record<string, unknown>,
		source: Record<string, unknown>,
	): Record<string, unknown> {
		const result: Record<string, unknown> = { ...target };

		for (const key in source) {
			const sourceValue = source[key];
			const targetValue = target[key];
			if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
				result[key] = this.deepMerge(
					(targetValue as Record<string, unknown>) || {},
					sourceValue as Record<string, unknown>,
				);
			} else {
				result[key] = sourceValue;
			}
		}

		return result;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
