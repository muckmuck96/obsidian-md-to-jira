import {
	App,
	PluginSettingTab,
	Setting,
	ToggleComponent,
	Notice,
	ButtonComponent,
	DropdownComponent,
	ColorComponent,
	ExtraButtonComponent,
} from "obsidian";
import MTJPlugin from "./main";
import { calloutTypes } from "./utils/calloutTypes";
import { calloutTypesDefaultColors } from "./utils/calloutTypeDefaultColors";
import { calloutIcons } from "./utils/calloutIcons";

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

export interface MTJImageUploadSettings {
	method: ImageUploadMethod;
	imgbb: {
		apiKey: string;
	};
}

export interface MTJPluginSettings {
	useLegacyConverter: boolean;
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
}

export const DEFAULT_SETTINGS: MTJPluginSettings = {
	useLegacyConverter: false,
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

		new Setting(containerEl)
			.setName("Use Legacy Converter")
			.setDesc(
				"We are in the process of developing an enhanced converter that aims to support all previous formatting options. However, there might still be some features that are not fully functional. If you encounter any issues, you can use this toggle to switch back to the previous converter."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useLegacyConverter)
					.onChange(async (value) => {
						this.plugin.settings.useLegacyConverter = value;
						if (value) {
							this.plugin.settings.renderMetadata = false;
						}
						await this.plugin.saveSettings();
						this.display();
					})
		);

		if (!this.plugin.settings.useLegacyConverter) {

			new Setting(containerEl)
				.setName("Render metadata")
				.setDesc("Transforms the metadata at the top of an Obsidian note, enclosed by ---, into a Jira-compatible format, resulting in a list of key-value pairs labeled as 'Metadata'. Only works with the new converter!")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.renderMetadata)
						.setDisabled(this.plugin.settings.useLegacyConverter)
						.onChange(async (value) => {
							this.plugin.settings.renderMetadata = value;
							await this.plugin.saveSettings();
							this.display();
						})
				);

		containerEl.createEl("h2", { text: "Task Lists" });

		new Setting(containerEl)
			.setName("Enable task list visualization")
			.setDesc(
				"Convert Markdown task list checkboxes (e.g., [ ], [x], [>]) to Jira emoticons in the output. " +
				"This makes task status visible in Jira comments and descriptions."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.taskListVisualization.enabled)
					.setDisabled(this.plugin.settings.useLegacyConverter)
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
					.addText((text: any) => {
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

		

		containerEl.createEl("h2", { text: "Callouts" });

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
				containerEl.createEl("h2", {
					text: `Callout-Config of ${val.identifier}:`,
				});

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

		containerEl.createEl("h2", { text: "Image Handling" });

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
			warningEl.createEl('h3', {
				text: '⚠️ Important Privacy Notice',
				attr: { style: 'color: #d97706; margin-top: 0;' }
			});
			warningEl.createEl('p', {
				text: 'Images uploaded to ImgBB are publicly accessible. Anyone with the URL can view your images.',
				attr: { style: 'margin: 0.5em 0;' }
			});
			warningEl.createEl('p', {
				text: 'By using ImgBB, you agree to their Terms of Service and Privacy Policy (available at imgbb.com). This plugin is not affiliated with or responsible for ImgBB\'s service.',
				attr: { style: 'margin: 0.5em 0; font-size: 0.9em;' }
			});
			warningEl.style.backgroundColor = 'transparent';
			warningEl.style.border = '1px solid #f59e0b';
			warningEl.style.borderRadius = '6px';
			warningEl.style.padding = '1em';
			warningEl.style.marginBottom = '1em';

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
				);
		}
	}

}
}
