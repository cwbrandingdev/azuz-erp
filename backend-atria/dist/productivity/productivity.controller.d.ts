import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { QueryProductivityDto } from './dto/query-productivity.dto';
import { ProductivityService } from './productivity.service';
export declare class ProductivityController {
    private readonly productivityService;
    constructor(productivityService: ProductivityService);
    getReport(user: AuthenticatedUser, query: QueryProductivityDto): Promise<import("./productivity.service").ProductivityReport>;
}
