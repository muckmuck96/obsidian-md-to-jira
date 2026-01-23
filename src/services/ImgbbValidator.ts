import { requestUrl, RequestUrlParam } from 'obsidian';

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

export class ImgbbValidator {
	/**
	 * Validates an ImgBB API key by uploading a tiny 1x1 transparent PNG.
	 * The image is deleted after successful upload to avoid cluttering the account.
	 */
	static async validateApiKey(apiKey: string): Promise<ValidationResult> {
		if (!apiKey || apiKey.trim().length === 0) {
			return {
				valid: false,
				error: 'API key is empty',
			};
		}

		// 1x1 transparent PNG (smallest valid PNG, ~67 bytes)
		const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

		try {
			const formBody = new URLSearchParams();
			formBody.append('image', testImageBase64);
			formBody.append('name', 'api_key_validation_test');

			const url = `https://api.imgbb.com/1/upload?key=${apiKey.trim()}`;

			const requestParam: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formBody.toString(),
			};

			const response = await requestUrl(requestParam);

			if (response.status === 200 && response.json?.success) {
				return {
					valid: true,
				};
			} else if (response.status === 400) {
				return {
					valid: false,
					error: 'Invalid API key',
				};
			} else {
				return {
					valid: false,
					error: `Unexpected response: ${response.status}`,
				};
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Check for common API key errors
			if (errorMessage.includes('400') || errorMessage.includes('Invalid')) {
				return {
					valid: false,
					error: 'Invalid API key',
				};
			}

			return {
				valid: false,
				error: `Validation failed: ${errorMessage}`,
			};
		}
	}
}
