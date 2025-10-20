import { App, Notice, TFile } from 'obsidian';
import { MTJImageUploadSettings } from '../settings';
import { ImgbbUploader } from './ImgbbUploader';

export interface ImageHandlerResult {
	jiraMarkup: string;
	success: boolean;
	error?: string;
}

export class ImageHandler {
	private app: App;
	private settings: MTJImageUploadSettings;

	constructor(app: App, settings: MTJImageUploadSettings) {
		this.app = app;
		this.settings = settings;
	}

	async handleImage(src: string, alt: string): Promise<ImageHandlerResult> {
		if (this.isUrlOrBase64(src)) {
			return {
				jiraMarkup: `!${src}|alt=${alt}!`,
				success: true,
			};
		}

		if (!this.isImageFile(src)) {
			return {
				jiraMarkup: `!${src}|alt=${alt}!`,
				success: true,
			};
		}

		switch (this.settings.method) {
			case 'imgbb':
				return await this.uploadToImgbb(src, alt);

			case 'manual':
			default:
				return this.manualHandling(src, alt);
		}
	}

	private async uploadToImgbb(src: string, alt: string): Promise<ImageHandlerResult> {
		try {
			const file = this.app.metadataCache.getFirstLinkpathDest(src, '');
			if (!file || !(file instanceof TFile)) {
				return {
					jiraMarkup: this.manualHandling(src, alt).jiraMarkup,
					success: false,
					error: `File not found: ${src}`,
				};
			}

			const imageData = await this.app.vault.readBinary(file);
			const uploader = new ImgbbUploader(this.settings.imgbb.apiKey);
			const result = await uploader.uploadImage(imageData, file.name);

			if (result.success && result.url) {
				new Notice(`Image uploaded to ImgBB: ${file.name}`);
				return {
					jiraMarkup: `!${result.url}|alt=${alt}!`,
					success: true,
				};
			} else {
				new Notice(`Failed to upload ${file.name}: ${result.error}`);
				return {
					jiraMarkup: this.manualHandling(src, alt).jiraMarkup,
					success: false,
					error: result.error,
				};
			}
		} catch (error) {
			const errorMsg = `Error uploading to ImgBB: ${error.message}`;
			new Notice(errorMsg);
			return {
				jiraMarkup: this.manualHandling(src, alt).jiraMarkup,
				success: false,
				error: errorMsg,
			};
		}
	}

	private manualHandling(src: string, alt: string): ImageHandlerResult {
		return {
			jiraMarkup: `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
{panel}

!${src}|alt=${alt}!`,
			success: true,
		};
	}

	private isUrlOrBase64(src: string | null): boolean {
		if (!src) return false;
		return src.startsWith('http://') ||
			src.startsWith('https://') ||
			src.startsWith('data:image/');
	}

	private isImageFile(src: string): boolean {
		const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
		const lowerSrc = src.toLowerCase();
		return imageExtensions.some(ext => lowerSrc.endsWith(ext));
	}
}
