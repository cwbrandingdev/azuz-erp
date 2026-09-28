import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InstagramPublishingService } from './instagram-publishing.service';

const SAO_PAULO_TZ = 'America/Sao_Paulo';

@Injectable()
export class InstagramPublishSchedulerService {
  private readonly logger = new Logger(InstagramPublishSchedulerService.name);

  constructor(private readonly publishing: InstagramPublishingService) {}

  @Cron('* * * * *', { timeZone: SAO_PAULO_TZ })
  async handleScheduledInstagramPosts() {
    try {
      await this.publishing.processDuePosts();
    } catch (error) {
      this.logger.warn(
        `Instagram publish scheduler error: ${String(error)}`,
      );
    }
  }
}
