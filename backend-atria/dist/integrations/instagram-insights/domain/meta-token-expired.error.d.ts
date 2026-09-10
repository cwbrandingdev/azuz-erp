export declare class MetaTokenExpiredError extends Error {
    constructor(message?: string);
}
export declare function isMetaTokenExpired(error: {
    code?: number;
    type?: string;
    message?: string;
}): boolean;
