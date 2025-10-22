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
	<a href="https://www.codefactor.io/repository/github/muckmuck96/obsidian-md-to-jira"><img src="https://www.codefactor.io/repository/github/muckmuck96/obsidian-md-to-jira/badge" alt="CodeFactor" /></a>
</p>

<div align="center">
  Convert your note/selection into jira markup and vice versa!
</div>


---

## Install
You can find **Markdown to Jira** in the list of community plugins! 

To use the plugin, be sure to enable it from the 'Community Plugins' section under 'Installed Plugins'.

If the plugin is not yet on the community list:
- download the latest release files **main.js** & **manifest.json** [here](https://github.com/muckmuck96/obsidian-md-to-jira/releases/latest)
- create a folder called `obsidian-md-to-jira` in the `.obsidian/plugins` folder of the vault to be installed
- place the **main.js** & **manifest.json** from the release there
- now you should be able to enable the plugin in the plugins tab of obsidian

## Usage
There are two ways to convert your markdown into jira markup. In both ways, the note has to be in **editor view**.

1. Focus the note you want to convert and use the command: `Note to Jira markup (clipboard) command`
2. Select some markdown you want to convert and use the command: `Selection to Jira markup (clipboard)`

Vice versa, you can convert jira markup into markdown using the command: `Jira markup (clipboard) to markdown note`

## Credits
The legacy converter is based on [this project](https://github.com/FokkeZB/J2M)

## Releases

## 0.3.0: Finished fully functional new converter
- polished new converter (legacy converter will be removed within the next update)
- added requested feature [#7](https://github.com/muckmuck96/obsidian-md-to-jira/issues/7) in new converter
- added image translation [#2](https://github.com/muckmuck96/obsidian-md-to-jira/issues/2) in new converter

## 0.2.1: Improved line break handling
- fixed reported issue [#6](https://github.com/muckmuck96/obsidian-md-to-jira/issues/6) in new converter

## 0.2.0: New converter coming
- fixed reported issue [#5](https://github.com/muckmuck96/obsidian-md-to-jira/issues/5) in legacy converter
- added new converter (beta)

## 0.1.2: Security Update
- fixed cve vulnerabilities

## 0.1.1: Hotfix
- fixed empty convert result bug after callout feature implementation

## 0.1.0: Convert Callouts
- added callout configurations (look into the plugin settings)
- callouts are now getting converted too
- fixed multi-line bullet list bug [#3](https://github.com/muckmuck96/obsidian-md-to-jira/issues/3)

## 0.0.3: Image not transferred notification
- added notifications to converted selection at all image positions

## 0.0.2: Image translation
- added image translation to !path|thumbnail! to get an image with easy accessability

## 0.0.1: Initial release
- The first release of Markdown to Jira
