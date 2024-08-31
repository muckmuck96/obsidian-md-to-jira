import MarkdownIt from 'markdown-it';
import { callouts } from '../rules/callouts';
import { extractFrontmatter } from '../rules/frontmatter';
import { wikiLinks } from '../rules/wikiLinks';
import { basics } from 'src/rules/basics';
import MTJPlugin from 'src/main';

export class Translator {
    plugin: MTJPlugin;

    constructor(plugin: MTJPlugin) {
        this.plugin = plugin;
    }

    preserveLineBreaks(markdown: string) {
        return markdown.replace(/\n/g, '<LINEBREAK>');
    }
      
    postProcessOutput(renered: string) {
        return renered.replace(/\<LINEBREAK\>/g, '\n');
    }

    convertMarkdownToJira(markdown: string): string {
        const frontmatter = extractFrontmatter(markdown);
        const contentWithoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---/, '');
    
        const md = new MarkdownIt()
            .use(basics)
            .use(wikiLinks)
            .use(callouts, this.plugin.settings.calloutConfigurations);

        const preprocessedContent = this.preserveLineBreaks(contentWithoutFrontmatter);

        let renderedContent = md.render(preprocessedContent);
    
        let frontmatterOutput = '';
        if (frontmatter && this.plugin.settings.renderMetadata) {
            frontmatterOutput += 'h1. Metadata\n';
            for (const [key, value] of Object.entries(frontmatter)) {
                frontmatterOutput += `* ${key}: ${value}\n`;
            }
            frontmatterOutput += '\n';
        }

        renderedContent = this.postProcessOutput(renderedContent);
    
        return frontmatterOutput + renderedContent;
    }
}