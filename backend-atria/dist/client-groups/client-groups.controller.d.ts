import { UpdateClientGroupDto } from './dto/client-group.dto';
import { ClientGroupsService } from './client-groups.service';
export declare class ClientGroupsController {
    private readonly clientGroupsService;
    constructor(clientGroupsService: ClientGroupsService);
    findAll(): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        clientCount: number;
        createdAt: string;
        updatedAt: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        clientCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    update(id: string, dto: UpdateClientGroupDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        clientCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(id: string): Promise<void>;
}
