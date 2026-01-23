import { requestUrl, RequestUrlParam } from 'obsidian';
import { MESSAGES } from '../constants';

export interface ImgbbUploadResult {
	success: boolean;
	url?: string;
	error?: string;
}

export class ImgbbUploader {
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async uploadImage(imageData: ArrayBuffer, filename: string): Promise<ImgbbUploadResult> {
		if (!this.apiKey) {
			return {
				success: false,
				error: MESSAGES.ERRORS.NO_API_KEY,
			};
		}

		try {
			const base64 = this.arrayBufferToBase64(imageData);

			// ImgBB expects URL-encoded form data
			const formBody = new URLSearchParams();
			formBody.append('image', base64);
			formBody.append('name', filename);

			const url = `https://api.imgbb.com/1/upload?key=${this.apiKey}`;

			const requestParam: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formBody.toString(),
			};

			const response = await requestUrl(requestParam);

			if (response.status === 200 && response.json?.data?.url) {
				return {
					success: true,
					url: response.json.data.url,
				};
			} else {
				return {
					success: false,
					error: `${MESSAGES.ERRORS.UPLOAD_FAILED}: ${response.status}`,
				};
			}
		} catch (error) {
			console.error(`[ImgbbUploader] Upload error:`, error);

			return {
				success: false,
				error: `ImgBB upload error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}
