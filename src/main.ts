import { Editor, Plugin } from "obsidian";

import { J2M } from "./j2m";

export default class MTJPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "mtj-convert-note-to-jira",
			name: "Note to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const markup = J2M.toJ(editor.getDoc().getValue());
				await navigator.clipboard.writeText(markup);
			},
		});

		this.addCommand({
			id: "mtj-convert-selection-to-jira",
			name: "Selection to Jira markup (clipboard)",
			editorCallback: async (editor: Editor) => {
				const markup = J2M.toJ(editor.getSelection());
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
	}

	onunload() {}
}
