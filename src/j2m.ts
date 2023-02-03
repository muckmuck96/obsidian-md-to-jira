import { App } from "obsidian";

export class J2M {
	/**
	 * Takes Jira markup and converts it to Markdown.
	 *
	 * https://jira.atlassian.com/secure/WikiRendererHelpAction.jspa?section=all
	 *
	 * @param {string} input - Jira markup text
	 * @returns {string} - Markdown formatted text
	 */
	public static toM(input: string): string {
		input = input.replace(
			/^bq\.(.*)$/gm,
			function (_, content: string): string {
				return "> " + content + "\n";
			}
		);

		input = input.replace(
			/([*_])(.*)\1/g,
			function (_, wrapper: string, content: string): string {
				const to = wrapper === "*" ? "**" : "*";
				return to + content + to;
			}
		);

		// multi-level numbered list
		input = input.replace(
			/^((?:#|-|\+|\*)+) (.*)$/gm,
			function (_, level: string, content: string) {
				let len = 2;
				let prefix = "1.";
				if (level.length > 1) {
					len = (level.length - 1) * 4 + 2;
				}

				// take the last character of the level to determine the replacement
				prefix = level[level.length - 1];
				if (prefix == "#") prefix = "1.";

				return (
					new Array(Math.floor(len)).join(" ") +
					prefix +
					" " +
					content
				);
			}
		);

		// headers, must be after numbered lists
		input = input.replace(
			/^h([0-6])\.(.*)$/gm,
			function (_, level: string, content: string): string {
				return new Array(level + 1).join("#") + content;
			}
		);

		input = input.replace(/\{\{([^}]+)\}\}/g, "`$1`");
		input = input.replace(/\?\?((?:.[^?]|[^?].)+)\?\?/g, "<cite>$1</cite>");
		input = input.replace(/\+([^+]*)\+/g, "<ins>$1</ins>");
		input = input.replace(/\^([^^]*)\^/g, "<sup>$1</sup>");
		input = input.replace(/~([^~]*)~/g, "<sub>$1</sub>");
		input = input.replace(/-([^-]*)-/g, "-$1-");

		input = input.replace(
			/\{code(:([a-z]+))?\}([^]*?)\{code\}/gm,
			"```$2$3```"
		);
		input = input.replace(
			/\{quote\}([^]*)\{quote\}/gm,
			function (_, content: string): string {
				const lines = content.split(/\r?\n/gm);

				for (let i = 0; i < lines.length; i++) {
					lines[i] = "> " + lines[i];
				}

				return lines.join("\n");
			}
		);

		// Images with alt= among their parameters
		input = input.replace(
			/!([^|\n\s]+)\|([^\n!]*)alt=([^\n!,]+?)(,([^\n!]*))?!/g,
			"![$3]($1)"
		);
		// Images with just other parameters (ignore them)
		input = input.replace(/!([^|\n\s]+)\|([^\n!]*)!/g, "![]($1)");
		// Images without any parameters or alt
		input = input.replace(/!([^\n\s!]+)!/g, "![]($1)");

		input = input.replace(/\[([^|]+)\|(.+?)\]/g, "[$1]($2)");
		input = input.replace(/\[(.+?)\]([^(]+)/g, "<$1>$2");

		input = input.replace(/{noformat}/g, "```");
		input = input.replace(
			/{color:([^}]+)}([^]*?){color}/gm,
			'<span style="color:$1">$2</span>'
		);

		// Convert header rows of tables by splitting input on lines
		const lines = input.split(/\r?\n/gm);
		for (let i = 0; i < lines.length; i++) {
			const line_content = lines[i];

			const seperators = line_content.match(/\|\|/g);
			if (seperators != null) {
				lines[i] = lines[i].replace(/\|\|/g, "|");
				console.log(seperators);

				// Add a new line to mark the header in Markdown,
				// we require that at least 3 -'s are between each |
				let header_line = "";
				for (let j = 0; j < seperators.length - 1; j++) {
					header_line += "|---";
				}

				header_line += "|";

				lines.splice(i + 1, 0, header_line);
			}
		}

		// Join the split lines back
		input = "";
		for (let i = 0; i < lines.length; i++) {
			input += lines[i] + "\n";
		}

		return input;
	}

	/**
	 * Takes Markdown and converts it to Jira formatted text
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	public static toJ(input: string, app: App): string | ClipboardItem[] {
		// remove sections that shouldn't be recursively processed
		const START = "J2MBLOCKPLACEHOLDER";
		const replacementsList: object[] = [];
		// const clipboardCache: ClipboardItem[] = [];
		let counter = 0;

		input = input.replace(
			/`{3,}(\w+)?((?:\n|.)+?)`{3,}/g,
			function (_, synt: string, content: string): string {
				let code = "{code";

				if (synt) {
					code += ":" + synt;
				}

				code += "}" + content + "{code}";
				const key = START + counter++ + "%%";
				replacementsList.push({ key: key, value: code });
				return key;
			}
		);

		input = input.replace(
			/`([^`]+)`/g,
			function (_, content: string): string {
				const code = "{{" + content + "}}";
				const key = START + counter++ + "%%";
				replacementsList.push({ key: key, value: code });
				return key;
			}
		);

		input = input.replace(/`([^`]+)`/g, "{{$1}}");

		input = input.replace(
			/^(.*?)\n([=-])+$/gm,
			function (_, content: string, level: string): string {
				return "h" + (level[0] === "=" ? 1 : 2) + ". " + content;
			}
		);

		input = input.replace(
			/^([#]+)(.*?)$/gm,
			function (_, level: string, content: string): string {
				return "h" + level.length + "." + content;
			}
		);

		input = input.replace(
			/([*_]+)(.*?)\1/g,
			function (_, wrapper: string, content: string): string {
				const to = wrapper.length === 1 ? "_" : "*";
				return to + content + to;
			}
		);

		// multi-level bulleted list
		input = input.replace(
			/^(\s*)- (.*)$/gm,
			function (_, level: string, content: string): string {
				let len = 2;
				if (level.length > 0) {
					len = level.length / 4.0 + 2;
				}
				return new Array(Math.floor(len)).join("-") + " " + content;
			}
		);

		// multi-level numbered list
		input = input.replace(
			/^(\s+)1. (.*)$/gm,
			function (_, level: string, content: string): string {
				let len = 2;
				if (level.length > 1) {
					len = level.length / 4 + 2;
				}
				return new Array(Math.floor(len)).join("#") + " " + content;
			}
		);

		const map: { [key: string]: any } = {
			cite: "??",
			del: "-",
			ins: "+",
			sup: "^",
			sub: "~",
		};

		input = input.replace(
			new RegExp(
				"<(" + Object.keys(map).join("|") + ")>(.*?)</\\1>",
				"g"
			),
			function (_, from: string, content: string): string {
				//console.log(from);
				const to: string = map[from];
				return to + content + to;
			}
		);

		input = input.replace(
			/<span style="color:(#[^"]+)">([^]*?)<\/span>/gm,
			"{color:$1}$2{color}"
		);

		input = input.replace(/~~(.*?)~~/g, "-$1-");

		// Images without alt
		input = input.replace(/!\[\[(.+)\]\]/g, function (_, filePath: string) {
			return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${filePath}*{color}
				{panel}
				
				!${filePath}|thumbnail!`;
		});
		// Images with alt
		input = input.replace(
			/!\[([^\]\n]+)\]\(([^)\n\s]+)\)/g,
			function (_, alt: string, filePath: string) {
				return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${filePath}*{color}
				{panel}
				
				!${filePath}|alt=${alt}!`;
			}
		);

		input = input.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			function (_, filePath: string, alt: string) {
				return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${filePath}*{color}
				{panel}
				
				[${filePath}|${alt}]`;
			}
		);
		input = input.replace(/<([^>]+)>/g, function (_, filePath: string) {
			return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${filePath}*{color}
				{panel}
				
				[${filePath}]`;
		});

		// restore extracted sections
		for (let i = 0; i < replacementsList.length; i++) {
			const sub: { [key: string]: any } = replacementsList[i];
			input = input.replace(sub["key"], sub["value"]);
		}

		// Convert header rows of tables by splitting input on lines
		const lines = input.split(/\r?\n/gm);
		for (let i = 0; i < lines.length; i++) {
			const line_content = lines[i];

			if (line_content.match(/\|---/g) != null) {
				lines[i - 1] = lines[i - 1].replace(/\|/g, "||");
				lines.splice(i, 1);
			}
		}

		// Join the split lines back
		input = "";
		for (let i = 0; i < lines.length; i++) {
			input += lines[i] + "\n";
		}
		return input;
	}
}
