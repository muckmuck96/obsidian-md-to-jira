import { App, normalizePath, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import MTJPlugin from "src/main";

export class ClipboardUtils {
    public static getImagePath(app: App, plugin: MTJPlugin, imageString: string) {
        const rootFolderPath = normalizePath(plugin.settings.imageDirectoryPath);
        const rootFolder = app.vault.getAbstractFileByPath(rootFolderPath);
        let imagePath = "";
        if (rootFolder && rootFolder instanceof TFolder) {
            Vault.recurseChildren(rootFolder, (file: TAbstractFile) => {
                if (file instanceof TFile && file.path.includes(imageString)) {
                    imagePath = file.path;
                }
            });
        }
        return imagePath;
    }

    public static parseText(text: string, clipboardCache: ClipboardItem[]): ClipboardItem[] {
        const type = "text/plain";
        const blob = new Blob([text], { type });
        clipboardCache.push(new ClipboardItem({ [type]: blob }));
        return clipboardCache;
    }

    public static parseImage(imgEle: HTMLImageElement, clipboardCache: ClipboardItem[]): ClipboardItem[] {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imgEle.src;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const canvasContext = canvas.getContext('2d');
            if (canvasContext) {
                canvasContext.fillStyle = '#fff';
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                canvasContext.drawImage(image, 0, 0);
                try {
                    canvas.toBlob(async (blob: any) => {
                        clipboardCache.push(new ClipboardItem({ "image/png": blob }))
                    });
                } catch (error) {
                    console.error(error);
                }
            }
        };
        image.onerror = (error) => {
            console.error(error);
        }
        return clipboardCache;
    }
}