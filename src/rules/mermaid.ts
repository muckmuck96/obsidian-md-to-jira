import * as MarkdownIt from "markdown-it";
import { MermaidHandling } from "../settings";
import { JIRA_MARKUP } from "../constants";

/**
 * Handle Mermaid diagram code blocks
 */
export function mermaid(md: MarkdownIt, handling: MermaidHandling): void {
	// Store the original fence renderer
	const originalFence = md.renderer.rules.fence;

	md.renderer.rules.fence = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const lang = token.info.trim().toLowerCase();

		// Only intercept mermaid blocks
		if (lang !== 'mermaid') {
			if (originalFence) {
				return originalFence(tokens, idx, options, env, self);
			}
			// Default fence rendering for Jira
			const code = token.content.trim();
			const language = token.info.trim() || 'none';
			return `{code:${language}}\n${code}\n{code}\n`;
		}

		const content = token.content.trim();

		switch (handling) {
			case 'code-block':
				// Keep as a code block with mermaid language
				return `{code:mermaid}\n${content}\n{code}\n`;

			case 'plantuml':
				// Attempt basic conversion to PlantUML
				return convertToPlantUML(content);

			case 'warning':
				// Show a warning that Mermaid is not supported
				return `{panel:borderColor=${JIRA_MARKUP.WARNING_PANEL.BORDER_COLOR}|bgColor=${JIRA_MARKUP.WARNING_PANEL.BG_COLOR}}
{color:${JIRA_MARKUP.WARNING_PANEL.TEXT_COLOR}}+*Warning:*+ Mermaid diagrams are not natively supported in Jira/Confluence. The diagram source code is included below:{color}
{panel}

{code:mermaid}
${content}
{code}
`;

			default:
				return `{code:mermaid}\n${content}\n{code}\n`;
		}
	};
}

/**
 * Basic Mermaid to PlantUML conversion
 * This handles simple cases; complex diagrams may not convert perfectly
 */
function convertToPlantUML(mermaidCode: string): string {
	const lines = mermaidCode.split('\n');
	const plantUmlLines: string[] = ['@startuml'];

	let diagramType = '';

	for (const line of lines) {
		const trimmed = line.trim();

		// Detect diagram type
		if (trimmed.startsWith('graph ') || trimmed.startsWith('flowchart ')) {
			diagramType = 'flowchart';
			continue;
		}
		if (trimmed.startsWith('sequenceDiagram')) {
			diagramType = 'sequence';
			continue;
		}
		if (trimmed.startsWith('classDiagram')) {
			diagramType = 'class';
			continue;
		}
		if (trimmed.startsWith('stateDiagram')) {
			diagramType = 'state';
			continue;
		}
		if (trimmed.startsWith('erDiagram')) {
			diagramType = 'er';
			continue;
		}
		if (trimmed.startsWith('gantt')) {
			diagramType = 'gantt';
			continue;
		}
		if (trimmed.startsWith('pie')) {
			diagramType = 'pie';
			continue;
		}

		// Skip empty lines and comments
		if (!trimmed || trimmed.startsWith('%%')) {
			continue;
		}

		// Convert based on diagram type
		if (diagramType === 'flowchart') {
			plantUmlLines.push(convertFlowchartLine(trimmed));
		} else if (diagramType === 'sequence') {
			plantUmlLines.push(convertSequenceLine(trimmed));
		} else {
			// For unsupported types, include as comment
			plantUmlLines.push(`' ${trimmed}`);
		}
	}

	plantUmlLines.push('@enduml');

	return `{code:plantuml}
${plantUmlLines.join('\n')}
{code}
`;
}

function convertFlowchartLine(line: string): string {
	// Arrow conversion: --> to ->
	let converted = line.replace(/-->/g, '->');
	converted = converted.replace(/---/g, '--');

	// Node definitions: A[Text] to (Text) as A
	const nodeMatch = converted.match(/^(\w+)\[(.*?)\]$/);
	if (nodeMatch) {
		return `(${nodeMatch[2]}) as ${nodeMatch[1]}`;
	}

	// Arrow with label: A -->|label| B to A -> B : label
	const arrowLabelMatch = converted.match(/^(\w+)\s*->\|([^|]*)\|\s*(\w+)$/);
	if (arrowLabelMatch) {
		return `${arrowLabelMatch[1]} -> ${arrowLabelMatch[3]} : ${arrowLabelMatch[2]}`;
	}

	// Simple arrow: A --> B to A -> B
	const simpleArrowMatch = converted.match(/^(\w+)\s*->\s*(\w+)$/);
	if (simpleArrowMatch) {
		return `${simpleArrowMatch[1]} -> ${simpleArrowMatch[2]}`;
	}

	return `' ${line}`;
}

function convertSequenceLine(line: string): string {
	// participant A to participant A
	if (line.startsWith('participant ')) {
		return line;
	}

	// A->>B: message to A -> B : message
	const messageMatch = line.match(/^(\w+)->>(\w+):\s*(.*)$/);
	if (messageMatch) {
		return `${messageMatch[1]} -> ${messageMatch[2]} : ${messageMatch[3]}`;
	}

	// A-->>B: message (dashed) to A --> B : message
	const dashedMatch = line.match(/^(\w+)-->>(\w+):\s*(.*)$/);
	if (dashedMatch) {
		return `${dashedMatch[1]} --> ${dashedMatch[2]} : ${dashedMatch[3]}`;
	}

	// Note over/right/left
	if (line.startsWith('Note ')) {
		return line.replace('Note over ', 'note over ')
			.replace('Note right of ', 'note right of ')
			.replace('Note left of ', 'note left of ');
	}

	return `' ${line}`;
}
