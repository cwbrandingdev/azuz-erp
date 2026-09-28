import { InstagramPublishingService } from './instagram-publishing.service';
export declare class InstagramPublishSchedulerService {
    private readonly publishing;
    private readonly logger;
    constructor(publishing: InstagramPublishingService);
    handleScheduledInstagramPosts(): Promise<void>;
}
