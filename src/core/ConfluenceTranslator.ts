import MarkdownIt from 'markdown-it';
import { extractFrontmatter } from '../rules/frontmatter';
import { wikiLinks } from '../rules/wikiLinks';
import { confluenceBasics } from '../rules/confluenceBasics';
import { taskLists } from '../rules/taskLists';
import { confluenceCallouts } from '../rules/confluenceCallouts';
import MTJPlugin from '../main';
import { ImageHandler } from '../services/ImageHandler';

/**
 * Translator for converting Markdown to Confluence markup
 */
export class ConfluenceTranslator {
	plugin: MTJPlugin;
	private imageHandler: ImageHandler;
	private imagesToProcess: Map<string, { src: string; alt: string; placeholder: string }>;

	constructor(plugin: MTJPlugin) {
		this.plugin = plugin;
		this.imageHandler = new ImageHandler(plugin.app, plugin.settings.imageUpload);
		this.imagesToProcess = new Map();
	}

	async convertMarkdownToConfluence(markdown: string): Promise<string> {
		this.imagesToProcess.clear();

		const frontmatter = extractFrontmatter(markdown);
		const contentWithoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---/, '');

		const md = new MarkdownIt()
			.use(confluenceBasics, { translator: this })
			.use(wikiLinks, { translator: this })
			.use(taskLists, this.plugin.settings.taskListVisualization)
			.use(confluenceCallouts, this.plugin.settings.calloutConfigurations);

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

	registerImage(src: string, alt: string): string {
		const placeholder = `__IMAGE_PLACEHOLDER_${this.imagesToProcess.size}__`;
		this.imagesToProcess.set(placeholder, { src, alt, placeholder });
		return placeholder;
	}

	private async processImages(content: string): Promise<string> {
		let processedContent = content;

		for (const [placeholder, imageInfo] of this.imagesToProcess) {
			const result = await this.imageHandler.handleImage(imageInfo.src, imageInfo.alt);
			// For Confluence, we use the same Jira markup as it's compatible
			processedContent = processedContent.replace(placeholder, result.jiraMarkup);
		}

		return processedContent;
	}
}
