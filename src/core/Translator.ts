import MarkdownIt from 'markdown-it';
import { callouts } from '../rules/callouts';
import { extractFrontmatter } from '../rules/frontmatter';
import { wikiLinks } from '../rules/wikiLinks';
import { basics } from '../rules/basics';
import { taskLists } from '../rules/taskLists';
import { mermaid } from '../rules/mermaid';
import { mentions } from '../rules/mentions';
import { issueLinks } from '../rules/issueLinks';
import MTJPlugin from '../main';
import { ImageHandler } from '../services/ImageHandler';

export class Translator {
	plugin: MTJPlugin;
	private imageHandler: ImageHandler;
	private imagesToProcess: Map<string, { src: string; alt: string; placeholder: string }>;

	constructor(plugin: MTJPlugin) {
		this.plugin = plugin;
		this.imageHandler = new ImageHandler(plugin.app, plugin.settings.imageUpload);
		this.imagesToProcess = new Map();
	}

	/**
	 * Check if the content contains images that need processing
	 */
	containsProcessableImages(markdown: string): boolean {
		// Check for wiki-style images
		if (/!\[\[[^\]]+\]\]/.test(markdown)) {
			return true;
		}

		// Check for markdown images that are local files (not URLs or base64)
		const imageMatches = markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
		for (const match of imageMatches) {
			const src = match[1];
			if (!src.startsWith('http://') &&
				!src.startsWith('https://') &&
				!src.startsWith('data:image/')) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Synchronous conversion for content without local images
	 */
	convertMarkdownToJiraSync(markdown: string): string {
		const frontmatter = extractFrontmatter(markdown);
		const contentWithoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---/, '');

		const md = this.createMarkdownIt();
		let renderedContent = md.render(contentWithoutFrontmatter);

		let frontmatterOutput = '';
		if (frontmatter && this.plugin.settings.renderMetadata) {
			frontmatterOutput += 'h1. Metadata\n';
			for (const [key, value] of Object.entries(frontmatter)) {
				frontmatterOutput += `* ${key}: ${value}\n`;
			}
			frontmatterOutput += '\n';
		}

		return frontmatterOutput + renderedContent;
	}

	/**
	 * Main async conversion method
	 */
	async convertMarkdownToJira(markdown: string): Promise<string> {
		// Use sync path if no local images need processing and method is manual
		if (this.plugin.settings.imageUpload.method === 'manual' &&
			!this.containsProcessableImages(markdown)) {
			return this.convertMarkdownToJiraSync(markdown);
		}

		this.imagesToProcess.clear();

		const frontmatter = extractFrontmatter(markdown);
		const contentWithoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---/, '');

		const md = this.createMarkdownIt();
		let renderedContent = md.render(contentWithoutFrontmatter);

		if (this.imagesToProcess.size > 0) {
			renderedContent = await this.processImages(renderedContent);
		}

		let frontmatterOutput = '';
		if (frontmatter && this.plugin.settings.renderMetadata) {
			frontmatterOutput += 'h1. Metadata\n';
			for (const [key, value] of Object.entries(frontmatter)) {
				frontmatterOutput += `* ${key}: ${value}\n`;
			}
			frontmatterOutput += '\n';
		}

		return frontmatterOutput + renderedContent;
	}

	/**
	 * Create and configure the markdown-it instance with all rules
	 */
	private createMarkdownIt(): MarkdownIt {
		const md = new MarkdownIt()
			.use(basics, { translator: this })
			.use(wikiLinks, { translator: this })
			.use(taskLists, this.plugin.settings.taskListVisualization)
			.use(callouts, this.plugin.settings.calloutConfigurations);

		// Add mermaid handling
		md.use(mermaid, this.plugin.settings.mermaidHandling);

		// Add mentions if enabled
		if (this.plugin.settings.convertMentions) {
			md.use(mentions);
		}

		// Add issue links if enabled
		if (this.plugin.settings.jiraIssueLink.enabled &&
			this.plugin.settings.jiraIssueLink.projectKeys) {
			const projectKeys = this.plugin.settings.jiraIssueLink.projectKeys
				.split(',')
				.map(k => k.trim())
				.filter(k => k.length > 0);

			if (projectKeys.length > 0) {
				md.use(issueLinks, {
					projectKeys,
					baseUrl: this.plugin.settings.jiraIssueLink.baseUrl,
				});
			}
		}

		return md;
	}

	registerImage(src: string, alt: string): string {
		const placeholder = `__IMAGE_PLACEHOLDER_${this.imagesToProcess.size}__`;
		this.imagesToProcess.set(placeholder, { src, alt, placeholder });
		return placeholder;
	}

	private async processImages(content: string): Promise<string> {
		let processedContent = content;

		for (const [placeholder, imageInfo] of this.imagesToProcess) {
			const result = await this.imageHandler.handleImage(imageInfo.src, imageInfo.alt);
			processedContent = processedContent.replace(placeholder, result.jiraMarkup);
		}

		return processedContent;
	}
}
