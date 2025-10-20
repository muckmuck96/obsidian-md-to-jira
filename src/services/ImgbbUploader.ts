import { requestUrl, RequestUrlParam } from 'obsidian';

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
				error: 'ImgBB API key not configured',
			};
		}

		console.log(`[ImgbbUploader] Starting upload for: ${filename}`);
		console.log(`[ImgbbUploader] Image size: ${imageData.byteLength} bytes`);
		console.log(`[ImgbbUploader] API key length: ${this.apiKey.length}`);

		try {
			const base64 = this.arrayBufferToBase64(imageData);
			console.log(`[ImgbbUploader] Base64 length: ${base64.length}`);
			console.log(`[ImgbbUploader] Base64 preview: ${base64.substring(0, 50)}...`);

			// ImgBB expects URL-encoded form data
			const formBody = new URLSearchParams();
			formBody.append('image', base64);
			formBody.append('name', filename);

			const url = `https://api.imgbb.com/1/upload?key=${this.apiKey}`;
			console.log(`[ImgbbUploader] Request URL: ${url.replace(this.apiKey, 'HIDDEN')}`);
			console.log(`[ImgbbUploader] Form body length: ${formBody.toString().length}`);

			const requestParam: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formBody.toString(),
			};

			const response = await requestUrl(requestParam);

			console.log(`[ImgbbUploader] Response status: ${response.status}`);
			console.log(`[ImgbbUploader] Response body:`, response.text);

			if (response.json) {
				console.log(`[ImgbbUploader] Response JSON:`, response.json);
			}

			if (response.status === 200 && response.json?.data?.url) {
				console.log(`[ImgbbUploader] Upload successful! URL: ${response.json.data.url}`);
				return {
					success: true,
					url: response.json.data.url,
				};
			} else {
				return {
					success: false,
					error: `ImgBB upload failed: ${response.status} - ${response.text}`,
				};
			}
		} catch (error) {
			console.error(`[ImgbbUploader] Upload error:`, error);
			console.error(`[ImgbbUploader] Error details:`, {
				message: error.message,
				name: error.name,
				stack: error.stack
			});

			return {
				success: false,
				error: `ImgBB upload error: ${error.message}`,
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
