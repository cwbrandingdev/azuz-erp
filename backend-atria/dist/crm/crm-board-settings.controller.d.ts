import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CrmScopeService } from '../leads/crm-scope.service';
import { LeadsService } from '../leads/leads.service';
import { CrmBoardSettingsQueryDto, UpdateCrmBoardSettingsDto } from './dto/update-crm-board-settings.dto';
export declare class CrmBoardSettingsController {
    private readonly leadsService;
    private readonly crmScope;
    constructor(leadsService: LeadsService, crmScope: CrmScopeService);
    get(user: AuthenticatedUser, query: CrmBoardSettingsQueryDto): Promise<{
        showOrcamento: boolean;
    }>;
    update(user: AuthenticatedUser, dto: UpdateCrmBoardSettingsDto): Promise<{
        showOrcamento: boolean;
    }>;
    private assertOrganizationAccess;
}
