import {
	App,
	PluginSettingTab,
	Setting,
	ToggleComponent,
	Notice,
	ButtonComponent,
	DropdownComponent,
	ColorComponent,
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
export interface MTJPluginSettings {
	imageEnableUploadToHost: boolean;
	temp: {
		createCalloutConfiguration: string;
	};
	calloutConfigurations: MTJCallout[];
}

export const DEFAULT_SETTINGS: MTJPluginSettings = {
	imageEnableUploadToHost: false,
	temp: {
		createCalloutConfiguration: "",
	},
	calloutConfigurations: [],
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

		containerEl.createEl("h2", { text: "Markdown to Jira - Settings" });


		containerEl.createEl("h1", { text: "Callouts" });

		new Setting(containerEl)
			.setName("Add callout configuration")
			.setDesc("This setting is mandatory if callouts should be converted. Choose one of the callout types and set the different color settings for each element of a callout.")
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown
					.addOptions(calloutTypes)
					.onChange(async (value) => {
						settings.temp.createCalloutConfiguration = value;
						await this.plugin.saveSettings();
					});
			})
			.addButton((button: ButtonComponent) => {
				button
					.setIcon("plus")
					.onClick(async () => {
						if (settings.temp.createCalloutConfiguration.length == 0) {
							return new Notice("First select a callout type to add!");
						}
						if (settings.calloutConfigurations.some(ccfg => ccfg.identifier == settings.temp.createCalloutConfiguration)) {
							return new Notice("This callout configuration already exists!");
						}
						settings.calloutConfigurations.push({
							identifier: settings.temp.createCalloutConfiguration,
							titleIcon: calloutIcons.empty.jiraTag,
							titleColor: calloutTypesDefaultColors[settings.temp.createCalloutConfiguration].titleColor,
							titleBgColor: calloutTypesDefaultColors[settings.temp.createCalloutConfiguration].titleBgColor,
							contentBgColor: calloutTypesDefaultColors[settings.temp.createCalloutConfiguration].contentBgColor,
							contentBorderColor: calloutTypesDefaultColors[settings.temp.createCalloutConfiguration].contentBorderColor,
							contentColor: calloutTypesDefaultColors[settings.temp.createCalloutConfiguration].contentColor,
						});
						await this.plugin.saveSettings();
						this.display();
					});
			});
		
		
		for (const [i, val] of settings.calloutConfigurations.entries()) {
			containerEl.createEl("h4", { text: `Callout-Config of ${val.identifier}:` });

			new Setting(containerEl)
			.setName("Choose title icon")
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown
					.addOptions(Object.entries(calloutIcons)
						.reduce((acc, [key, { jiraTag, displayName }]) => ({ ...acc, [jiraTag]: displayName }), {}))
					.setValue(val.titleIcon)
					.onChange(async (value) => {
						settings.calloutConfigurations[i].titleIcon = value;
						await this.plugin.saveSettings();
					});
			})

			new Setting(containerEl)
				.setName(`Choose title text color:`)
				.addColorPicker((colorPicker: ColorComponent) => {
					colorPicker
						.setValue(settings.calloutConfigurations[i].titleColor || calloutTypesDefaultColors[val.identifier].titleColor)
						.onChange(async (color) => {
							settings.calloutConfigurations[i].titleColor = color;
							await this.plugin.saveSettings();
						})
				})
				.addExtraButton((btn) => {
					btn.setIcon("reset")
						.onClick(async () => {
							settings.calloutConfigurations[i].titleColor = calloutTypesDefaultColors[val.identifier].titleColor;
							await this.plugin.saveSettings();
							this.display();
						})
						.setTooltip('restore default color');
				});
			
			new Setting(containerEl)
				.setName(`Choose title background color:`)
				.addColorPicker((colorPicker: ColorComponent) => {
					colorPicker
						.setValue(settings.calloutConfigurations[i].titleBgColor || calloutTypesDefaultColors[val.identifier].titleBgColor)
						.onChange(async (color) => {
							settings.calloutConfigurations[i].titleBgColor = color;
							await this.plugin.saveSettings();
						})
				})
				.addExtraButton((btn) => {
					btn.setIcon("reset")
						.onClick(async () => {
							settings.calloutConfigurations[i].titleBgColor = calloutTypesDefaultColors[val.identifier].titleBgColor;
							await this.plugin.saveSettings();
							this.display();
						})
						.setTooltip('restore default color');
				});
			
			new Setting(containerEl)
				.setName(`Choose content text color:`)
				.addColorPicker((colorPicker: ColorComponent) => {
					colorPicker
						.setValue(settings.calloutConfigurations[i].contentColor || calloutTypesDefaultColors[val.identifier].contentColor)
						.onChange(async (color) => {
							settings.calloutConfigurations[i].contentColor = color;
							await this.plugin.saveSettings();
						})
				})
				.addExtraButton((btn) => {
					btn.setIcon("reset")
						.onClick(async () => {
							settings.calloutConfigurations[i].contentColor = calloutTypesDefaultColors[val.identifier].contentColor;
							await this.plugin.saveSettings();
							this.display();
						})
						.setTooltip('restore default color');
				});
			
			new Setting(containerEl)
				.setName(`Choose content background color:`)
				.addColorPicker((colorPicker: ColorComponent) => {
					colorPicker
						.setValue(settings.calloutConfigurations[i].contentBgColor || calloutTypesDefaultColors[val.identifier].contentBgColor)
						.onChange(async (color) => {
							settings.calloutConfigurations[i].contentBgColor = color;
							await this.plugin.saveSettings();
						})
				})
				.addExtraButton((btn) => {
					btn.setIcon("reset")
						.onClick(async () => {
							settings.calloutConfigurations[i].contentBgColor = calloutTypesDefaultColors[val.identifier].contentBgColor;
							await this.plugin.saveSettings();
							this.display();
						})
						.setTooltip('restore default color');
				});
			
				new Setting(containerEl)
					.setName(`Choose content border color:`)
					.addColorPicker((colorPicker: ColorComponent) => {
						colorPicker
							.setValue(settings.calloutConfigurations[i].contentBorderColor || calloutTypesDefaultColors[val.identifier].contentBorderColor)
							.onChange(async (color) => {
								settings.calloutConfigurations[i].contentBorderColor = color;
								await this.plugin.saveSettings();
							})
					})
					.addExtraButton((btn) => {
						btn.setIcon("reset")
							.onClick(async () => {
								settings.calloutConfigurations[i].contentBorderColor = calloutTypesDefaultColors[val.identifier].contentBorderColor;
								await this.plugin.saveSettings();
								this.display();
							})
							.setTooltip('restore default color');
					});

			new Setting(containerEl)
				.setName("Remove configuration")
				.addButton((button: ButtonComponent) => {
					button
						.setIcon("minus")
						.onClick(async () => {
							settings.calloutConfigurations.splice(i, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				});
			
			containerEl.createEl("hr");
			
		}
		
		containerEl.createEl("h1", { text: "Images" });

		new Setting(containerEl)
			.setName(
				"Image Translation (This feature is still in development...)"
			)
			.setDesc("Should images be uploaded to one of the given hosts?")
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