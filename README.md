<h1 align="center">Obsidian Markdown to Jira (and backwards)</h1>

<p align="center">
    <a href="https://github.com/muckmuck96/obsidian-md-to-jira/releases/latest">
		<img src="https://img.shields.io/github/manifest-json/v/muckmuck96/obsidian-md-to-jira?color=blue">
	</a>
    <img src="https://img.shields.io/github/release-date/muckmuck96/obsidian-md-to-jira">
	<a href="https://github.com/muckmuck96/obsidian-md-to-jira/blob/master/LICENSE">
		<img src="https://img.shields.io/github/license/muckmuck96/obsidian-md-to-jira">
	</a>
	<img src="https://img.shields.io/github/downloads/muckmuck96/obsidian-md-to-jira/total">
	<br>
	<a href="https://github.com/muckmuck96/obsidian-md-to-jira/issues">
		<img src="https://img.shields.io/github/issues/muckmuck96/obsidian-md-to-jira">
	</a>
	<a href="https://www.codefactor.io/repository/github/muckmuck96/obsidian-md-to-jira/stats">
		<img src="https://img.shields.io/codefactor/grade/github/muckmuck96/obsidian-md-to-jira/master">
	</a>
</p>

<div align="center">
  Convert your note/selection into jira markup and vice versa!
</div>


---

## Install
You can find Markdown to Jira in the list of community plugins!

If the plugin is not yet on the community list, the latest release (main.js & manifest.json) can be downloaded.
Then create a folder called obsidian-md-to-jira in the .obsidian/plugins folder of the Vault to be installed.
Then place the main.js & manifest.json from the release there. Now you should be able to enable the plugin in the plugins tab of obsidian.

## Usage
There are two ways to convert your markdown into jira markup. In both ways, the note has to be in editor view.

1. Focus the note you want to convert and use the command: `Note to Jira markup (clipboard) command`
2. Select some markdown you want to convert and use the command: `Selection to Jira markup (clipboard)`

Vice versa, you can convert jira markup into markdown using the command: `Jira markup (clipboard) to markdown note`

## Credits
The converter is based on [this project](https://github.com/FokkeZB/J2M)

## Releases

## 0.0.2: Image translation
- added image translation to !path|thumbnail! to get an image with easy accessability

## 0.0.1: Initial release
- The first release of Markdown to Jira
