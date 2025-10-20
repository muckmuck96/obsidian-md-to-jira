import * as markdownIt from 'markdown-it';

export interface TaskListMapping {
    enabled: boolean;
    mapping: Record<string, string>;
}

export function taskLists(md: markdownIt, options: TaskListMapping): void {
    if (!options.enabled) {
        return;
    }

    md.core.ruler.after('inline', 'task_lists', (state) => {
        const tokens = state.tokens;

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type !== 'inline') continue;

            const token = tokens[i];
            const content = token.content;

            // Check if this inline token is inside a list item
            let isListItem = false;
            for (let j = i - 1; j >= 0; j--) {
                if (tokens[j].type === 'list_item_open') {
                    isListItem = true;
                    break;
                }
                if (tokens[j].type === 'paragraph_open') {
                    continue;
                }
                break;
            }

            if (!isListItem) continue;

            // Match task list syntax at the beginning: [ ], [x], [X], [>], [-], etc.
            const match = content.match(/^\[(.)\]\s+(.*)$/);
            if (!match) continue;

            const checkboxState = match[1];
            const taskText = match[2];
            const checkboxKey = `[${checkboxState}]`;

            const icon = options.mapping[checkboxKey];

            if (icon) {
                token.content = `${icon} ${taskText}`;

                if (token.children && token.children.length > 0) {
                    const textToken = token.children[0];
                    if (textToken && textToken.type === 'text') {
                        textToken.content = `${icon} ${taskText}`;
                    }
                }
            }
        }

        return false;
    });
}
