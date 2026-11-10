import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';

@Injectable()
export class WahaSessionBootstrap implements OnModuleInit {
  private readonly logger = new Logger(WahaSessionBootstrap.name);

  constructor(private readonly gateway: WhatsAppGraphGateway) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.gateway.ensureSession();
    } catch (error) {
      this.logger.warn(
        `WAHA session bootstrap failed: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
