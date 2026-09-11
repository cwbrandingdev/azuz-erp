import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto, QueryContractsDto, UpdateContractDto } from './dto/contract.dto';
export declare class ContractsController {
    private readonly contractsService;
    constructor(contractsService: ContractsService);
    findAll(query: QueryContractsDto): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
        };
        title: string;
        status: "draft" | "sent" | "signed" | "expired" | "cancelled";
        recurringValue: number;
        paymentFrequency: "monthly" | "one_time";
        startDate: string;
        endDate: string | null;
        termsContent: string;
        pdfUrl: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        receivablesCount: number;
        createdAt: string;
        updatedAt: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
        };
        title: string;
        status: "draft" | "sent" | "signed" | "expired" | "cancelled";
        recurringValue: number;
        paymentFrequency: "monthly" | "one_time";
        startDate: string;
        endDate: string | null;
        termsContent: string;
        pdfUrl: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        receivablesCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    create(user: AuthenticatedUser, dto: CreateContractDto): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
        };
        title: string;
        status: "draft" | "sent" | "signed" | "expired" | "cancelled";
        recurringValue: number;
        paymentFrequency: "monthly" | "one_time";
        startDate: string;
        endDate: string | null;
        termsContent: string;
        pdfUrl: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        receivablesCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    update(id: string, dto: UpdateContractDto): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
        };
        title: string;
        status: "draft" | "sent" | "signed" | "expired" | "cancelled";
        recurringValue: number;
        paymentFrequency: "monthly" | "one_time";
        startDate: string;
        endDate: string | null;
        termsContent: string;
        pdfUrl: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        receivablesCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    sign(user: AuthenticatedUser, id: string): Promise<{
        contract: {
            id: string;
            clientId: string;
            client: {
                number: string | null;
                id: string;
                email: string | null;
                avatarUrl: string | null;
                companyName: string;
                contactName: string | null;
                phone: string | null;
                street: string | null;
                city: string | null;
                state: string | null;
                zipCode: string | null;
            };
            title: string;
            status: "draft" | "sent" | "signed" | "expired" | "cancelled";
            recurringValue: number;
            paymentFrequency: "monthly" | "one_time";
            startDate: string;
            endDate: string | null;
            termsContent: string;
            pdfUrl: string | null;
            createdBy: {
                id: string;
                name: string;
                email: string;
                avatarUrl: string | null;
            };
            receivablesCount: number;
            createdAt: string;
            updatedAt: string;
        };
        receivablesGenerated: number;
        receivables: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
    }>;
    remove(id: string): Promise<void>;
}
