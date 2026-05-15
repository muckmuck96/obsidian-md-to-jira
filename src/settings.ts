import {
	App,
	PluginSettingTab,
	Setting,
	Notice,
	ButtonComponent,
	DropdownComponent,
	ColorComponent,
	ExtraButtonComponent,
	TextComponent,
} from "obsidian";
import MTJPlugin from "./main";
import { calloutTypes } from "./utils/calloutTypes";
import { calloutTypesDefaultColors } from "./utils/calloutTypeDefaultColors";
import { calloutIcons } from "./utils/calloutIcons";
import { ImgbbValidator } from "./services/ImgbbValidator";
import { MESSAGES } from "./constants";

export interface MTJCallout {
	identifier: string;
	titleIcon: string;
	titleColor: string;
	titleBgColor: string;
	contentBgColor: string;
	contentBorderColor: string;
	contentColor: string;
}

export type ImageUploadMethod = 'manual' | 'imgbb';
export type OutputFormat = 'jira' | 'confluence';
export type MermaidHandling = 'code-block' | 'plantuml' | 'warning';

export interface MTJImageUploadSettings {
	method: ImageUploadMethod;
	imgbb: {
		apiKey: string;
	};
}

export interface MTJJiraIssueLinkSettings {
	enabled: boolean;
	projectKeys: string;
	baseUrl: string;
}

export interface MTJPluginSettings {
	renderMetadata: boolean;
	temp: {
		createCalloutConfiguration: string;
	};
	showCalloutConfiguration: boolean;
	calloutConfigurations: MTJCallout[];
	imageUpload: MTJImageUploadSettings;
	version: string;
	taskListVisualization: {
		enabled: boolean;
		mapping: Record<string, string>;
	};
	// New settings
	outputFormat: OutputFormat;
	autoDetectJiraPaste: boolean;
	mermaidHandling: MermaidHandling;
	convertMentions: boolean;
	jiraIssueLink: MTJJiraIssueLinkSettings;
	showPreviewBeforeCopy: boolean;
}

export const DEFAULT_SETTINGS: MTJPluginSettings = {
	renderMetadata: true,
	temp: {
		createCalloutConfiguration: "",
	},
	showCalloutConfiguration: true,
	calloutConfigurations: [],
	imageUpload: {
		method: 'manual',
		imgbb: {
			apiKey: '',
		},
	},
	version: '0.0.0',
	taskListVisualization: {
		enabled: true,
		mapping: {
			'[ ]': '(/)',     // Unchecked - checkbox
			'[x]': '(on)',    // Checked - light bulb on
			'[X]': '(on)',    // Checked (alternate)
			'[>]': '(*b)',    // In progress - blue star
			'[-]': '(-)',     // Cancelled - minus
			'[/]': '(*y)',    // Partial - yellow star
		},
	},
	outputFormat: 'jira',
	autoDetectJiraPaste: false,
	mermaidHandling: 'code-block',
	convertMentions: true,
	jiraIssueLink: {
		enabled: false,
		projectKeys: '',
		baseUrl: '',
	},
	showPreviewBeforeCopy: false,
};

export default class MTJSettingsTab extends PluginSettingTab {
	plugin: MTJPlugin;

	constructor(app: App, plugin: MTJPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;

		containerEl.empty();

		// Output Format Selection
		new Setting(containerEl)
			.setName("Output format")
			.setDesc("Choose the target markup format for conversion.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption('jira', 'Jira')
					.addOption('confluence', 'Confluence')
					.setValue(this.plugin.settings.outputFormat)
					.onChange(async (value: OutputFormat) => {
						this.plugin.settings.outputFormat = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Render metadata")
			.setDesc("Transforms the metadata at the top of an Obsidian note, enclosed by ---, into a Jira-compatible format, resulting in a list of key-value pairs labeled as 'Metadata'.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.renderMetadata)
					.onChange(async (value) => {
						this.plugin.settings.renderMetadata = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Show preview before copy")
			.setDesc("Display a preview modal showing the converted markup before copying to clipboard.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showPreviewBeforeCopy)
					.onChange(async (value) => {
						this.plugin.settings.showPreviewBeforeCopy = value;
						await this.plugin.saveSettings();
					})
			);

		// Paste Detection Section
		new Setting(containerEl).setName("Clipboard detection").setHeading();

		new Setting(containerEl)
			.setName("Auto-detect Jira markup on paste")
			.setDesc("When pasting, detect if the clipboard contains Jira/Confluence markup and offer to convert it to Markdown.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoDetectJiraPaste)
					.onChange(async (value) => {
						this.plugin.settings.autoDetectJiraPaste = value;
						await this.plugin.saveSettings();
					})
			);

		// Task Lists Section
		new Setting(containerEl).setName("Task lists").setHeading();

		new Setting(containerEl)
			.setName("Enable task list visualization")
			.setDesc(
				"Convert Markdown task list checkboxes (e.g., [ ], [x], [>]) to Jira emoticons in the output. " +
				"This makes task status visible in Jira comments and descriptions."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.taskListVisualization.enabled)
					.onChange(async (value) => {
						this.plugin.settings.taskListVisualization.enabled = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.taskListVisualization.enabled) {
			new Setting(containerEl)
				.setName("Task state mappings")
				.setDesc("Map task checkbox states to Jira emoticons. Common states are preconfigured.")
				.setHeading();

			const taskStates = [
				{ key: '[ ]', label: 'Unchecked (incomplete)', default: '(/)' },
				{ key: '[x]', label: 'Checked (complete)', default: '(on)' },
				{ key: '[X]', label: 'Checked (complete, uppercase)', default: '(on)' },
				{ key: '[>]', label: 'In progress / forwarded', default: '(*b)' },
				{ key: '[-]', label: 'Cancelled / removed', default: '(-)' },
				{ key: '[/]', label: 'Partially complete', default: '(*y)' },
			];

			for (const taskState of taskStates) {
				if (!this.plugin.settings.taskListVisualization.mapping[taskState.key]) {
					this.plugin.settings.taskListVisualization.mapping[taskState.key] = taskState.default;
				}

				const currentValue = this.plugin.settings.taskListVisualization.mapping[taskState.key];

				new Setting(containerEl)
					.setName(taskState.label)
					.setDesc(`Markdown: \`- ${taskState.key} Task text\``)
					.addDropdown((dropdown: DropdownComponent) => {
						dropdown
							.addOptions(Object.entries(calloutIcons).reduce(
								(acc, [key, { jiraTag, displayName }]) => ({
									...acc,
									[jiraTag]: displayName,
								}),
								{}
							))
							.setValue(currentValue)
							.onChange(async (value: string) => {
								this.plugin.settings.taskListVisualization.mapping[taskState.key] = value;
								await this.plugin.saveSettings();
							});
					})
					.addButton((button: ButtonComponent) => {
						button
							.setButtonText("Reset")
							.setTooltip(`Reset to default: ${taskState.default}`)
							.onClick(async () => {
								this.plugin.settings.taskListVisualization.mapping[taskState.key] = taskState.default;
								await this.plugin.saveSettings();
								this.display();
							});
					});
			}

			new Setting(containerEl)
				.setName("Custom task state mappings")
				.setDesc("Add your own custom checkbox states (e.g., [!], [?], [*])");

			const customMappings = Object.entries(this.plugin.settings.taskListVisualization.mapping)
				.filter(([key]) => !taskStates.some(ts => ts.key === key));

			for (const [key, value] of customMappings) {
				new Setting(containerEl)
					.setName("Custom mapping")
					.addText((text: TextComponent) => {
						text
							.setPlaceholder("[?]")
							.setValue(key)
							.onChange(async (newKey: string) => {
								if (newKey !== key) {
									delete this.plugin.settings.taskListVisualization.mapping[key];
									this.plugin.settings.taskListVisualization.mapping[newKey] = value;
									await this.plugin.saveSettings();
									this.display();
								}
							});
					})
					.addDropdown((dropdown: DropdownComponent) => {
						dropdown
							.addOptions(Object.entries(calloutIcons).reduce(
								(acc, [key, { jiraTag, displayName }]) => ({
									...acc,
									[jiraTag]: displayName,
								}),
								{}
							))
							.setValue(value)
							.onChange(async (value: string) => {
								this.plugin.settings.taskListVisualization.mapping[key] = value;
								await this.plugin.saveSettings();
							});
					})
					.addExtraButton((button: ExtraButtonComponent) => {
						button.setIcon("cross").setTooltip("Delete mapping").onClick(async () => {
							delete this.plugin.settings.taskListVisualization.mapping[key];
							await this.plugin.saveSettings();
							this.display();
						});
					});
			}

			new Setting(containerEl)
				.addButton((button: ButtonComponent) => {
					button
						.setButtonText("Add custom mapping")
						.setIcon("plus")
						.onClick(async () => {
							let newKey = '[?]';
							let counter = 1;
							while (this.plugin.settings.taskListVisualization.mapping[newKey]) {
								newKey = `[${counter}]`;
								counter++;
							}
							this.plugin.settings.taskListVisualization.mapping[newKey] = calloutIcons.question.jiraTag;
							await this.plugin.saveSettings();
							this.display();
						});
				});
		}

		// Mentions & Issue Links Section
		new Setting(containerEl).setName("Mentions & issue links").setHeading();

		new Setting(containerEl)
			.setName("Convert @mentions")
			.setDesc("Convert @username mentions to Jira user mentions [~username].")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.convertMentions)
					.onChange(async (value) => {
						this.plugin.settings.convertMentions = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable Jira issue linking")
			.setDesc("Automatically convert issue keys (e.g., PROJ-123) to Jira links.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.jiraIssueLink.enabled)
					.onChange(async (value) => {
						this.plugin.settings.jiraIssueLink.enabled = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.jiraIssueLink.enabled) {
			new Setting(containerEl)
				.setName("Project keys")
				.setDesc("Comma-separated list of Jira project keys (e.g., PROJ,DEV,OPS).")
				.addText((text) =>
					text
						.setPlaceholder("PROJ,DEV,OPS")
						.setValue(this.plugin.settings.jiraIssueLink.projectKeys)
						.onChange(async (value) => {
							this.plugin.settings.jiraIssueLink.projectKeys = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Jira base URL")
				.setDesc("Your Jira instance URL (e.g., https://your-company.atlassian.net).")
				.addText((text) =>
					text
						.setPlaceholder("https://your-company.atlassian.net")
						.setValue(this.plugin.settings.jiraIssueLink.baseUrl)
						.onChange(async (value) => {
							this.plugin.settings.jiraIssueLink.baseUrl = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// Mermaid Section
		new Setting(containerEl).setName("Mermaid diagrams").setHeading();

		new Setting(containerEl)
			.setName("Mermaid diagram handling")
			.setDesc("Choose how to handle Mermaid diagram code blocks during conversion.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption('code-block', 'Keep as code block')
					.addOption('plantuml', 'Convert to PlantUML (basic)')
					.addOption('warning', 'Show warning message')
					.setValue(this.plugin.settings.mermaidHandling)
					.onChange(async (value: MermaidHandling) => {
						this.plugin.settings.mermaidHandling = value;
						await this.plugin.saveSettings();
					});
			});

		// Callouts Section
		new Setting(containerEl).setName("Callouts").setHeading();

		new Setting(containerEl)
			.setName("Add callout configuration")
			.setDesc(
				"This setting is mandatory if callouts should be converted. Choose one of the callout types and set the different color settings for each element of a callout."
			)
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOptions(calloutTypes).onChange(async (value) => {
					settings.temp.createCalloutConfiguration = value;
					await this.plugin.saveSettings();
				});
			})
			.addButton((button: ButtonComponent) => {
				button.setIcon("plus").onClick(async () => {
					if (settings.temp.createCalloutConfiguration.length == 0) {
						return new Notice(
							"First select a callout type to add!"
						);
					}
					if (
						settings.calloutConfigurations.some(
							(ccfg) =>
								ccfg.identifier ==
								settings.temp.createCalloutConfiguration
						)
					) {
						return new Notice(
							"This callout configuration already exists!"
						);
					}
					settings.calloutConfigurations.push({
						identifier: settings.temp.createCalloutConfiguration,
						titleIcon: calloutIcons.empty.jiraTag,
						titleColor:
							calloutTypesDefaultColors[
								settings.temp.createCalloutConfiguration
							].titleColor,
						titleBgColor:
							calloutTypesDefaultColors[
								settings.temp.createCalloutConfiguration
							].titleBgColor,
						contentBgColor:
							calloutTypesDefaultColors[
								settings.temp.createCalloutConfiguration
							].contentBgColor,
						contentBorderColor:
							calloutTypesDefaultColors[
								settings.temp.createCalloutConfiguration
							].contentBorderColor,
						contentColor:
							calloutTypesDefaultColors[
								settings.temp.createCalloutConfiguration
							].contentColor,
					});
					this.plugin.settings.showCalloutConfiguration = true;
					await this.plugin.saveSettings();
					this.display();
				});
			})
			.addButton((button: ButtonComponent) => {
				button
					.setIcon(this.plugin.settings.showCalloutConfiguration ? "up-chevron-glyph" : "down-chevron-glyph")
					.setTooltip(this.plugin.settings.showCalloutConfiguration ? "Hide callout configuration" : "Show callout configuration").onClick(async () => {
					this.plugin.settings.showCalloutConfiguration = !this.plugin.settings.showCalloutConfiguration;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		if (this.plugin.settings.showCalloutConfiguration) {
			for (const [i, val] of settings.calloutConfigurations.entries()) {
				new Setting(containerEl)
					.setName(`Callout-Config of ${val.identifier}:`)
					.setHeading();

				new Setting(containerEl)
					.setName("Choose title icon")
					.addDropdown((dropdown: DropdownComponent) => {
						dropdown
							.addOptions(
								Object.entries(calloutIcons).reduce(
									(acc, [key, { jiraTag, displayName }]) => ({
										...acc,
										[jiraTag]: displayName,
									}),
									{}
								)
							)
							.setValue(val.titleIcon)
							.onChange(async (value) => {
								settings.calloutConfigurations[i].titleIcon = value;
								await this.plugin.saveSettings();
							});
					});

				new Setting(containerEl)
					.setName(`Choose title text color:`)
					.addColorPicker((colorPicker: ColorComponent) => {
						colorPicker
							.setValue(
								settings.calloutConfigurations[i].titleColor ||
								calloutTypesDefaultColors[val.identifier]
									.titleColor
							)
							.onChange(async (color) => {
								settings.calloutConfigurations[i].titleColor =
									color;
								await this.plugin.saveSettings();
							});
					})
					.addExtraButton((btn) => {
						btn.setIcon("reset")
							.onClick(async () => {
								settings.calloutConfigurations[i].titleColor =
									calloutTypesDefaultColors[
										val.identifier
									].titleColor;
								await this.plugin.saveSettings();
								this.display();
							})
							.setTooltip("restore default color");
					});

				new Setting(containerEl)
					.setName(`Choose title background color:`)
					.addColorPicker((colorPicker: ColorComponent) => {
						colorPicker
							.setValue(
								settings.calloutConfigurations[i].titleBgColor ||
								calloutTypesDefaultColors[val.identifier]
									.titleBgColor
							)
							.onChange(async (color) => {
								settings.calloutConfigurations[i].titleBgColor =
									color;
								await this.plugin.saveSettings();
							});
					})
					.addExtraButton((btn) => {
						btn.setIcon("reset")
							.onClick(async () => {
								settings.calloutConfigurations[i].titleBgColor =
									calloutTypesDefaultColors[
										val.identifier
									].titleBgColor;
								await this.plugin.saveSettings();
								this.display();
							})
							.setTooltip("restore default color");
					});

				new Setting(containerEl)
					.setName(`Choose content text color:`)
					.addColorPicker((colorPicker: ColorComponent) => {
						colorPicker
							.setValue(
								settings.calloutConfigurations[i].contentColor ||
								calloutTypesDefaultColors[val.identifier]
									.contentColor
							)
							.onChange(async (color) => {
								settings.calloutConfigurations[i].contentColor =
									color;
								await this.plugin.saveSettings();
							});
					})
					.addExtraButton((btn) => {
						btn.setIcon("reset")
							.onClick(async () => {
								settings.calloutConfigurations[i].contentColor =
									calloutTypesDefaultColors[
										val.identifier
									].contentColor;
								await this.plugin.saveSettings();
								this.display();
							})
							.setTooltip("restore default color");
					});

				new Setting(containerEl)
					.setName(`Choose content background color:`)
					.addColorPicker((colorPicker: ColorComponent) => {
						colorPicker
							.setValue(
								settings.calloutConfigurations[i].contentBgColor ||
								calloutTypesDefaultColors[val.identifier]
									.contentBgColor
							)
							.onChange(async (color) => {
								settings.calloutConfigurations[i].contentBgColor =
									color;
								await this.plugin.saveSettings();
							});
					})
					.addExtraButton((btn) => {
						btn.setIcon("reset")
							.onClick(async () => {
								settings.calloutConfigurations[i].contentBgColor =
									calloutTypesDefaultColors[
										val.identifier
									].contentBgColor;
								await this.plugin.saveSettings();
								this.display();
							})
							.setTooltip("restore default color");
					});

				new Setting(containerEl)
					.setName(`Choose content border color:`)
					.addColorPicker((colorPicker: ColorComponent) => {
						colorPicker
							.setValue(
								settings.calloutConfigurations[i]
									.contentBorderColor ||
								calloutTypesDefaultColors[val.identifier]
									.contentBorderColor
							)
							.onChange(async (color) => {
								settings.calloutConfigurations[
									i
								].contentBorderColor = color;
								await this.plugin.saveSettings();
							});
					})
					.addExtraButton((btn) => {
						btn.setIcon("reset")
							.onClick(async () => {
								settings.calloutConfigurations[
									i
								].contentBorderColor =
									calloutTypesDefaultColors[
										val.identifier
									].contentBorderColor;
								await this.plugin.saveSettings();
								this.display();
							})
							.setTooltip("restore default color");
					});

				new Setting(containerEl)
					.setName("Remove configuration")
					.addButton((button: ButtonComponent) => {
						button.setIcon("minus").onClick(async () => {
							settings.calloutConfigurations.splice(i, 1);
							await this.plugin.saveSettings();
							this.display();
						});
					});

				containerEl.createEl("hr");
			}
		}

		// Image Handling Section
		new Setting(containerEl).setName("Image handling").setHeading();

		new Setting(containerEl)
			.setName("Image upload method")
			.setDesc(
				"Choose how to handle local images when converting to Jira markup. " +
				"Manual: show warning to drag & drop manually. " +
				"ImgBB: auto-upload to ImgBB (free API key required)."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('manual', 'Manual (drag & drop)')
					.addOption('imgbb', 'Auto-upload to ImgBB')
					.setValue(this.plugin.settings.imageUpload.method)
					.onChange(async (value: ImageUploadMethod) => {
						this.plugin.settings.imageUpload.method = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		if (this.plugin.settings.imageUpload.method === 'imgbb') {
			const warningEl = containerEl.createDiv({
				cls: 'imgbb-privacy-warning',
			});
			warningEl.createDiv({
				cls: 'mtj-warning-title',
				text: '! Important privacy notice',
			});
			warningEl.createEl('p', {
				text: MESSAGES.WARNINGS.PRIVACY_NOTICE,
			});
			warningEl.createEl('p', {
				cls: 'mtj-warning-tos',
				text: "By using ImgBB, you agree to their Terms of Service and Privacy Policy (available at imgbb.com). This plugin is not affiliated with or responsible for ImgBB's service.",
			});

			new Setting(containerEl)
				.setName("ImgBB API Key")
				.setDesc(
					"Get your free API key by creating an account at https://imgbb.com and visiting https://api.imgbb.com. " +
					"ImgBB supports images up to 32 MB with unlimited uploads."
				)
				.addText((text) =>
					text
						.setPlaceholder("Enter API Key")
						.setValue(this.plugin.settings.imageUpload.imgbb.apiKey)
						.onChange(async (value) => {
							this.plugin.settings.imageUpload.imgbb.apiKey = value;
							await this.plugin.saveSettings();
						})
				)
				.addButton((button: ButtonComponent) => {
					button
						.setButtonText("Test API Key")
						.onClick(async () => {
							const apiKey = this.plugin.settings.imageUpload.imgbb.apiKey;
							if (!apiKey) {
								new Notice("Please enter an API key first");
								return;
							}

							button.setButtonText("Testing...");
							button.setDisabled(true);

							try {
								const result = await ImgbbValidator.validateApiKey(apiKey);
								if (result.valid) {
									new Notice(MESSAGES.SUCCESS.API_KEY_VALID);
								} else {
									new Notice(`API key validation failed: ${result.error}`);
								}
							} catch (error) {
								new Notice(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
							} finally {
								button.setButtonText("Test API Key");
								button.setDisabled(false);
							}
						});
				});
		}
	}
}
