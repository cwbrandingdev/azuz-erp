export declare class WhatsAppMediaStore {
    private readonly dir;
    constructor();
    save(buffer: Buffer, filename?: string | null, mimeType?: string | null): {
        url: string;
        absolutePath: string;
        filename: string;
        mimeType: string | null;
    };
    resolvePath(url: string): string | null;
}
