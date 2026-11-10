import { OnModuleInit } from '@nestjs/common';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
export declare class WahaSessionBootstrap implements OnModuleInit {
    private readonly gateway;
    private readonly logger;
    constructor(gateway: WhatsAppGraphGateway);
    onModuleInit(): Promise<void>;
}
