import { Modal, App, Notice, requestUrl } from "obsidian";
import { marked } from "marked";

export class UpdateModal extends Modal {
	version: string;
	releaseNotes: string | null = null;

	constructor(app: App, version: string) {
		super(app);
		this.version = version;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: `Markdown to Jira Converter updated to v${this.version}`,
		});

		const loadingEl = contentEl.createDiv({
			text: "Loading release notes...",
			cls: "update-modal-loading"
		});

		try {
			await this.fetchReleaseNotes();
			loadingEl.remove();

			if (this.releaseNotes) {
				const htmlContent = marked.parse(this.releaseNotes, { async: false }) as string;

				const notesContainer = contentEl.createDiv({
					cls: "update-modal-content"
				});
				notesContainer.innerHTML = htmlContent;

				notesContainer.style.maxHeight = "400px";
				notesContainer.style.overflowY = "auto";
				notesContainer.style.padding = "1em";
				notesContainer.style.border = "1px solid var(--background-modifier-border)";
				notesContainer.style.borderRadius = "4px";
				notesContainer.style.marginTop = "1em";
			} else {
				loadingEl.setText("Could not load release notes. Please visit the GitHub releases page for details.");
			}
		} catch (error) {
			loadingEl.setText("Error loading release notes. Please check your internet connection or visit the GitHub releases page.");
			console.error("[UpdateModal] Failed to fetch release notes:", error);
		}

		const linkContainer = contentEl.createDiv({
			cls: "update-modal-link",
		});
		linkContainer.style.marginTop = "1em";
		linkContainer.style.textAlign = "center";

		const link = linkContainer.createEl("a", {
			text: "View all releases on GitHub",
			href: "https://github.com/muckmuck96/obsidian-md-to-jira/releases",
		});
		link.style.color = "var(--text-accent)";
	}

	async fetchReleaseNotes(): Promise<void> {
		try {
			console.log(`[UpdateModal] Fetching release notes for v${this.version}`);

			const response = await requestUrl({
				url: `https://api.github.com/repos/muckmuck96/obsidian-md-to-jira/releases/tags/${this.version}`,
				method: 'GET',
				headers: {
					'Accept': 'application/vnd.github.v3+json',
					'User-Agent': 'Obsidian-MD-To-Jira-Plugin'
				}
			});

			if (response.status === 200 && response.json?.body) {
				this.releaseNotes = response.json.body;
				console.log("[UpdateModal] Successfully fetched release notes");
			} else {
				console.warn("[UpdateModal] Release notes not found for this version");
				this.releaseNotes = null;
			}
		} catch (error) {
			console.error("[UpdateModal] Error fetching release notes:", error);
			this.releaseNotes = null;
		}
	}
}
