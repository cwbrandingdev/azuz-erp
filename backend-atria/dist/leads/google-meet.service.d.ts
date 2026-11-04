import { ConfigService } from '@nestjs/config';
export interface GoogleMeetInput {
    title: string;
    description: string;
    guestName: string;
    guestEmail?: string;
    startAt: Date;
    endAt: Date;
}
export declare class GoogleMeetService {
    private readonly configService;
    private readonly logger;
    private accessToken;
    private accessTokenExpiresAt;
    constructor(configService: ConfigService);
    isConfigured(): boolean;
    createMeeting(input: GoogleMeetInput): Promise<string>;
    private createOpenSpace;
    private getAccessToken;
    private read;
}
