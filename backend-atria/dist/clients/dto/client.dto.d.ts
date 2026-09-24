export declare class CreateClientInitialAccessDto {
    email: string;
    password: string;
    name?: string;
}
export declare class CreateClientDto {
    companyName: string;
    contactName?: string;
    document?: string;
    email?: string;
    phone?: string;
    instagram?: string;
    instagramUserId?: string;
    metaAccessToken?: string;
    website?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
    avatarUrl?: string;
    clientGroupId?: string;
    initialAccess?: CreateClientInitialAccessDto;
}
export declare class UpdateClientDto {
    companyName?: string;
    contactName?: string;
    document?: string;
    email?: string;
    phone?: string;
    instagram?: string;
    instagramUserId?: string;
    metaAccessToken?: string;
    website?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
    avatarUrl?: string;
    clientGroupId?: string;
}
