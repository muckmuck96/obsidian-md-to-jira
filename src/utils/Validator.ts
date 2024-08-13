export class Validator {
    static isUrlOrBase64(src: string | null): boolean {
        if (src == null) {
            return false;
        }
    
        const base64Pattern = /^data:image\/(png|jpeg|gif|bmp);base64,/;
    
        return src.includes('http') || base64Pattern.test(src);
    }
}