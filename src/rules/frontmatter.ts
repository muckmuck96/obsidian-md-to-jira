import * as yaml from 'js-yaml';

export function extractFrontmatter(markdown: string): Record<string, any> | null {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = markdown.match(frontmatterRegex);

    if (match) {
        return yaml.load(match[1]) as Record<string, any>;
    }

    return null;
}