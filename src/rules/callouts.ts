import * as markdownIt from 'markdown-it';
import { MTJCallout } from 'src/settings';


export function callouts(md: markdownIt, options: MTJCallout[]): void {
    md.block.ruler.before('blockquote', 'callout', (state, startLine, endLine, silent) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const max = state.eMarks[startLine];

        // Check for callout marker `> [!NOTE]`
        if (state.src.charCodeAt(start) !== 0x3E /* > */ || state.src.charCodeAt(start + 1) !== 0x20 /* space */) {
            return false;
        }

        const marker = state.src.slice(start + 2, max).match(/^\[!(.+?)\]\s*(.*)/);
        if (!marker) {
            return false;
        }

        if (silent) {
            return true;
        }

        const tokenOpen = state.push('callout_open', '', 1);
        tokenOpen.markup = marker[0];
        tokenOpen.content = marker[1].toLowerCase(); // Callout type
        tokenOpen.info = marker[2]; // Callout title
        tokenOpen.block = true;

        let nextLine = startLine + 1;

        // Capture the callout content
        const content = [];

        while (nextLine < endLine) {
            const pos = state.bMarks[nextLine] + state.tShift[nextLine];
            const maxPos = state.eMarks[nextLine];

            if (state.sCount[nextLine] < state.blkIndent) {
                break;
            }

            const lineContent = state.src.slice(pos, maxPos);
            if (lineContent.startsWith('> ')) {
                content.push(lineContent.slice(2)); // Remove '> ' from each line
            } else {
                break;
            }

            nextLine++;
        }

        // Update the state line
        state.line = nextLine;

        // Push the content token
        const contentToken = state.push('callout_content', '', 0);
        contentToken.content = content.join('\n');

        // Push the closing token
        state.push('callout_close', '', -1);

        return true;
    });

    // Renderer for callout open
    md.renderer.rules.callout_open = (tokens, idx) => {
        const type = tokens[idx].content.toUpperCase();
        let title = tokens[idx].info || type;
        let panelColor = '';
        const calloutConfiguration = options.find(ccfg => ccfg.identifier == type);
        if (calloutConfiguration) {
            panelColor = `bgColor=${calloutConfiguration.contentBgColor}|titleBGColor=${calloutConfiguration.titleBgColor}|titleColor=${calloutConfiguration.titleColor}`
            if (calloutConfiguration.titleIcon != "none") {
                title = `${calloutConfiguration.titleIcon} ${title}`;
            }
        }
        return `{panel:${panelColor}|title=${title}}\n`;
    };

    // Renderer for callout content
    md.renderer.rules.callout_content = (tokens, idx) => {
        const type = tokens[idx - 1].content.toUpperCase();
        const calloutConfiguration = options.find(ccfg => ccfg.identifier == type);
        let panelContent = '';
        if (calloutConfiguration) {
            panelContent = `{color:${calloutConfiguration.contentColor}}${tokens[idx].content}{color}`;
        }
        return `${panelContent}\n`;
    };

    // Renderer for callout close
    md.renderer.rules.callout_close = () => {
        return `{panel}\n`;
    };
}