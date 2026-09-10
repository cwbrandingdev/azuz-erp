export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  clientId?: string | null;
  companyId?: string | null;
  mustChangePassword?: boolean;
  isActive?: boolean;
  permissions?: string[];
  hasCrmEnabled?: boolean;
}

export interface Organization {
  id: string;
  companyName: string;
  isActive: boolean;
  hasCrmEnabled: boolean;
}

export interface SdrAssignment {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface OrganizationWithSdrAssignments extends Organization {
  sdrAssignments: SdrAssignment[];
}

export type UserRole =
  | "master"
  | "admin"
  | "designer_master"
  | "designer_junior"
  | "crm"
  | "external_client_crm"
  | "client"
  | "content_creator"
  | "manager"
  | "user";

export interface TenantCompany {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export type TenantCheckResponse =
  | {
      exists: true;
      name: string;
      logoUrl: string | null;
    }
  | {
      exists: false;
    };

export type UserCategory = "member" | "client";

export type PortalAccessStatus = "active" | "pending" | "unlinked" | "inactive";

export interface UserGroupMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  category: UserCategory;
  assignedAt: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  userCount: number;
  members?: UserGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  category?: UserCategory;
  avatarUrl: string | null;
  monthlySalary: number | null;
  mustChangePassword: boolean;
  hasChangedPassword: boolean;
  isFirstLogin: boolean;
  temporaryPassword: string | null;
  clientId?: string | null;
  client?: { id: string; companyName: string } | null;
  userGroup: Pick<UserGroup, "id" | "name" | "description" | "color"> | null;
  userGroups: Array<Pick<UserGroup, "id" | "name" | "description" | "color">>;
  permissions?: string[];
  isActive?: boolean;
  activeTaskCount?: number;
  activeDeliverableCount?: number;
  portalAccess?: PortalAccessStatus;
  crmIncludeInternal?: boolean;
  crmScopeClientIds?: string[];
  createdAt: string;
}

export interface ProvisionUserInput {
  name: string;
  role:
    | "MASTER"
    | "ADMIN"
    | "DESIGNER_MASTER"
    | "DESIGNER_JUNIOR"
    | "CRM"
    | "EXTERNAL_CLIENT_CRM"
    | "CLIENT";
  userGroupId?: string;
  userGroupIds?: string[];
  password?: string;
  monthlySalary?: number;
  emailDomain?: string;
  clientId?: string;
  email?: string;
  avatarUrl?: string;
  crmScopeClientIds?: string[];
  crmIncludeInternal?: boolean;
}

export interface ProvisionUserResult {
  user: ManagedUser;
  credentials: {
    email: string;
    temporaryPassword: string;
  };
}

export interface CreateUserGroupInput {
  name: string;
  description?: string;
  color?: string;
  memberIds?: string[];
}

export interface UpdateUserGroupInput extends Partial<CreateUserGroupInput> {}

export interface ClientGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  clientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientGroupInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateClientGroupInput extends Partial<CreateClientGroupInput> {}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color?: string;
}

export interface CalendarEventClient {
  id: string;
  name?: string;
  companyName: string;
  avatarUrl: string | null;
  color: string;
}

export interface CalendarEventTask {
  id: string;
  status: KanbanTaskStatus;
  productionPhase: ProductionPhase | null;
  contentType?: KanbanTaskContentType;
  statusColor: string;
  statusLabel: string;
  publicationDate: string | null;
  deliveryDate: string | null;
  dueDate: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  publicationDate?: string | null;
  startAt: string;
  endAt: string;
  category: "meeting" | "deadline" | "publish" | "other";
  color: string;
  referenceUrl: string | null;
  isPending: boolean;
  kanbanTaskId: string | null;
  taskStatus: KanbanTaskStatus | null;
  taskStatusColor: string | null;
  productionPhase?: ProductionPhase | null;
  task?: CalendarEventTask | null;
  clientId: string | null;
  client: CalendarEventClient | null;
  createdBy: TeamMember;
  assignee: TeamMember | null;
  assignedGroupId?: string | null;
  assignedGroup?: { id: string; name: string; color: string } | null;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  category?: "meeting" | "deadline" | "publish" | "other";
  color?: string;
  isPending?: boolean;
  assigneeId?: string;
  assignedGroupId?: string;
  clientId?: string;
  referenceUrl?: string;
}

export interface UpdateCalendarEventInput
  extends Partial<
    Omit<
      CreateCalendarEventInput,
      "assigneeId" | "assignedGroupId" | "clientId" | "referenceUrl"
    >
  > {
  assigneeId?: string | null;
  assignedGroupId?: string | null;
  clientId?: string | null;
  referenceUrl?: string | null;
  status?: KanbanTaskStatus;
}

export type KanbanPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "planned";

export type KanbanColumnType =
  | "to_do"
  | "in_progress"
  | "done"
  | "custom";

export type KanbanTaskStatus =
  | "ok"
  | "producao"
  | "falta_gravar"
  | "jhonatan_reprova"
  | "cliente_reprovou"
  | "jhonatan_aprovou";

export type ProductionPhase = "roteiro" | "em_gravacao";

export type KanbanTaskContentType =
  | "video_with_script"
  | "static"
  | "carousel"
  | "stories_no_script";

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  color: string;
  type: KanbanColumnType | null;
  statusKey: KanbanTaskStatus | null;
}

export type InternalReviewStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected";

export type SlaUiStatus =
  | "not_tracked"
  | "ok"
  | "approaching_response"
  | "response_breached"
  | "approaching_resolution"
  | "resolution_breached"
  | "met";

export interface KanbanTaskAsset {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  caption?: string | null;
  uploadedAt: string;
  uploadedBy: TeamMember;
}

export interface KanbanAssignedGroup {
  id: string;
  name: string;
  color: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  postCaption?: string | null;
  referenceUrl: string | null;
  columnId: string;
  column: KanbanColumn;
  clientId: string | null;
  client: { id: string; companyName: string; avatarUrl: string | null } | null;
  contentPostId: string | null;
  calendarEventId: string | null;
  assignedGroupId?: string | null;
  assignedGroup?: KanbanAssignedGroup | null;
  internalReviewStatus: InternalReviewStatus;
  internalReviewNote: string | null;
  isBypassingInternalReview?: boolean;
  status: KanbanTaskStatus;
  productionPhase: ProductionPhase | null;
  contentType: KanbanTaskContentType;
  statusColor: string;
  statusLabel: string;
  priority: KanbanPriority;
  order: number;
  dueDate: string | null;
  deliveryDate?: string | null;
  publicationDate?: string | null;
  slaResponseDueAt: string | null;
  slaResolutionDueAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  slaStatus: SlaUiStatus;
  assignees: TeamMember[];
  assets: KanbanTaskAsset[];
  createdBy: TeamMember;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: TeamMember;
}

export interface TaskHistoryEntry {
  id: string;
  action: string;
  createdAt: string;
  user: TeamMember;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  postCaption?: string;
  referenceUrl?: string | null;
  columnId?: string;
  contentType?: KanbanTaskContentType;
  status?: KanbanTaskStatus;
  productionPhase?: ProductionPhase;
  priority?: KanbanPriority;
  dueDate?: string;
  deliveryDate?: string;
  publicationDate?: string;
  assigneeIds?: string[];
  assignedGroupId?: string | null;
  clientId?: string;
}

export type DeletionEntityType = "KANBAN_TASK" | "LEAD";

export interface DeletionHistoryEntry {
  id: string;
  entityType: DeletionEntityType;
  entityId: string;
  title: string | null;
  metadata: {
    status?: string;
    columnId?: string | null;
    clientId?: string | null;
    city?: string | null;
    category?: string | null;
  } | null;
  deletedAt: string;
  deletedBy: Pick<TeamMember, "id" | "name" | "avatarUrl">;
}

export interface DeletionHistoryPage {
  items: DeletionHistoryEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClearBoardResult {
  deletedCount: number;
}

export interface CreateColumnInput {
  title: string;
  color?: string;
}

export interface UpdateColumnInput {
  title?: string;
  color?: string;
}

/** @deprecated Use KanbanTask */
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  order: number;
}

/** @deprecated Use KanbanColumn + KanbanTask */
export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export interface FinanceOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  pendingReceivables: number;
  pendingPayables: number;
  monthlyCashFlow: { month: string; income: number; expense: number }[];
  expenseByCategory: {
    categoryId: string;
    categoryName: string;
    amount: number;
    color: string;
  }[];
  recentTransactions: FinanceTransaction[];
  period?: {
    month: number | null;
    year: number;
  };
}

export interface FinanceTransaction {
  id: string;
  title?: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "paid" | "pending" | "overdue";
  date: string;
  dueDate: string | null;
  categoryId: string;
  category: string;
  categoryColor?: string;
  clientId?: string | null;
  contractId?: string | null;
  createdAt?: string;
  client?: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
  } | null;
}

export interface FinanceCategoryChartItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  color: string;
}

export interface FinanceDueTodayAlerts {
  dueToday: FinanceTransaction[];
  overdue: FinanceTransaction[];
  alerts: FinanceTransaction[];
  totals: {
    dueTodayCount: number;
    overdueCount: number;
    dueTodayAmount: number;
    overdueAmount: number;
  };
}

export interface FinanceMonthlyCashflow {
  income: FinanceCategoryChartItem[];
  expense: FinanceCategoryChartItem[];
  expenseByCategory: FinanceCategoryChartItem[];
  monthlyCashFlow: { month: string; income: number; expense: number }[];
  period: {
    month: number | null;
    year: number;
  };
}

export interface ClientPortalFinances {
  clientId: string;
  pending: FinanceTransaction[];
  paid: FinanceTransaction[];
  overdue: FinanceTransaction[];
  invoices: FinanceTransaction[];
  totals: {
    totalDue: number;
    totalPaid: number;
    totalOverdue: number;
    pendingCount: number;
    paidCount: number;
    overdueCount: number;
  };
}

export interface PortalFinanceDocument {
  id: string;
  clientId: string;
  organizationId: string;
  fileUrl: string;
  fileType: "invoice" | "receipt";
  description: string | null;
  uploadedAt: string;
}

export type TransactionSortField = "date" | "amount" | "description" | "status";
export type SortOrder = "asc" | "desc";

export interface TransactionFilters {
  search: string;
  categoryIds: string[];
  status: "" | "paid" | "pending" | "overdue";
  type: "" | "income" | "expense";
  startDate: string;
  endDate: string;
  sortBy: TransactionSortField;
  sortOrder: SortOrder;
}

export interface CreateCategoryInput {
  name: string;
  type: "income" | "expense";
  color?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export interface PaginatedTransactions {
  data: FinanceTransaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: "income" | "expense";
  status?: "paid" | "pending" | "overdue";
  date: string;
  dueDate?: string;
  categoryId: string;
  recurrenceDay?: number;
  recurrenceMonths?: number;
}

export interface ImportFinanceTransactionInput {
  categoryName: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  status?: "paid" | "pending" | "overdue";
  type?: "expense" | "income";
  companyName?: string;
  managerName?: string;
  serviceName?: string;
  reference?: string;
}

export interface BulkImportTransactionsResult {
  created: number;
  errors: Array<{ index: number; message: string }>;
  transactions: FinanceTransaction[];
}

export interface ContentAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
}

export type ContentPlatform = "instagram" | "tiktok" | "youtube" | "linkedin";
export type ContentPostFormat = "carousel" | "reels" | "static" | "story";
export type ContentPostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published";

export type PostFeedbackType = "rejection_reason" | "general_note";

export interface Client {
  id: string;
  companyName: string;
  contactName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  instagramUserId?: string | null;
  hasMetaAccessToken?: boolean;
  website: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  address: string | null;
  notes: string | null;
  avatarUrl: string | null;
  clientGroup: Pick<ClientGroup, "id" | "name" | "description" | "color"> | null;
  postCount: number;
  requestCount: number;
  pendingRequestCount: number;
  activeRequestCount: number;
  isActive?: boolean;
  hasCrmEnabled?: boolean;
  hasCrmModuleEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
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
}

export interface UpdateClientInput extends Partial<CreateClientInput> {}

export type ClientHealthStatus = "healthy" | "attention" | "at_risk";

export type Client360Section =
  | "summary"
  | "pipeline"
  | "financial"
  | "calendar"
  | "assets"
  | "tasks";

export interface Client360Summary {
  section: "summary";
  client: Client & { assetCount: number; contractCount: number };
  metrics: {
    mrr: number;
    activeContractsCount: number;
    signedContractsCount: number;
    openTasks: number;
    pendingApprovals: number;
    scheduledPosts: number;
    overdueTasks: number;
  };
  health: ClientHealthStatus;
  activeContracts: Array<{
    id: string;
    title: string;
    status: ContractStatus;
    recurringValue: number;
    paymentFrequency: PaymentFrequency;
    startDate: string;
    endDate: string | null;
  }>;
  insights?: ClientInsights;
}

export interface Client360Pipeline {
  section: "pipeline";
  overview: {
    drafts: number;
    pendingApproval: number;
    approved: number;
    scheduled: number;
    published: number;
    rejected: number;
    total: number;
  };
  posts: Array<{
    id: string;
    title: string;
    platform: ContentPlatform;
    format: ContentPostFormat;
    status: ContentPostStatus;
    scheduledDate: string | null;
    copy: string;
    attachmentCount: number;
    previewUrl: string | null;
    previewMimeType: string | null;
    author: { id: string; name: string; avatarUrl: string | null };
    assignee: { id: string; name: string; avatarUrl: string | null } | null;
    updatedAt: string;
    platformColor: string;
  }>;
  versionHistory: Array<{
    id: string;
    postId: string;
    postTitle: string;
    versionNumber: number;
    title: string;
    copyPreview: string;
    mediaUrls: string[];
    createdBy: { id: string; name: string; avatarUrl: string | null };
    createdAt: string;
  }>;
}

export interface Client360Financial {
  section: "financial";
  mrr: number;
  contracts: Array<{
    id: string;
    title: string;
    status: ContractStatus;
    recurringValue: number;
    paymentFrequency: PaymentFrequency;
    startDate: string;
    endDate: string | null;
    pdfUrl: string | null;
    receivablesCount: number;
    updatedAt: string;
  }>;
  monthlyInvoicing: {
    month: number;
    year: number;
    total: number;
    paid: number;
    pending: number;
    items: Array<{
      id: string;
      description: string;
      amount: number;
      status: string;
      date: string;
      dueDate: string | null;
      contractId: string | null;
    }>;
  };
}

export interface Client360CalendarItem {
  id: string;
  type: "event" | "post";
  title: string;
  category: string;
  startAt: string;
  endAt: string;
  referenceUrl: string | null;
  isPending: boolean;
  color: string;
  platform?: ContentPlatform;
  format?: ContentPostFormat;
  status?: ContentPostStatus | string;
  assignee?: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface Client360Calendar {
  section: "calendar";
  items: Client360CalendarItem[];
  meetings: Client360CalendarItem[];
  releases: Client360CalendarItem[];
}

export interface Client360AssetItem {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface Client360Assets {
  section: "assets";
  referenceLinks: Array<{ label: string; url: string; type: string }>;
  assets: Client360AssetItem[];
  grouped: {
    logo: Client360AssetItem[];
    brand_guide: Client360AssetItem[];
    image: Client360AssetItem[];
    document: Client360AssetItem[];
  };
  totals: {
    all: number;
    logos: number;
    brandGuides: number;
    images: number;
    documents: number;
  };
}

export interface Client360Tasks {
  section: "tasks";
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    referenceUrl: string | null;
    priority: string;
    dueDate: string | null;
    column: {
      id: string;
      title: string;
      type: string;
      color: string;
    };
    assignees: { id: string; name: string; avatarUrl: string | null }[];
    isOverdue: boolean;
    updatedAt: string;
  }>;
}

export type Client360Data =
  | Client360Summary
  | Client360Pipeline
  | Client360Financial
  | Client360Calendar
  | Client360Assets
  | Client360Tasks;

export type ContractStatus =
  | "draft"
  | "sent"
  | "signed"
  | "expired"
  | "cancelled";

export type PaymentFrequency = "monthly" | "one_time";

export interface Contract {
  id: string;
  clientId: string;
  client: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    avatarUrl: string | null;
  };
  title: string;
  status: ContractStatus;
  recurringValue: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate: string | null;
  termsContent: string;
  pdfUrl: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  };
  receivablesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractInput {
  clientId: string;
  title: string;
  status?: ContractStatus;
  recurringValue: number;
  paymentFrequency?: PaymentFrequency;
  startDate: string;
  endDate?: string;
  termsContent: string;
  pdfUrl?: string;
}

export interface UpdateContractInput extends Partial<CreateContractInput> {}

export interface SignContractResult {
  contract: Contract;
  receivablesGenerated: number;
  receivables: unknown[];
}

export type ProposalStatus = "draft" | "published" | "expired" | "archived";

export interface ProposalItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  subtotal: number;
}

export interface ProposalProject {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  projectUrl: string | null;
  sortOrder: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  client: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
  };
  title: string;
  status: ProposalStatus;
  validUntil: string | null;
  totalValue: number;
  structureContent: string | null;
  structureImageUrls: string[];
  coverVideoUrl: string | null;
  coverImageUrl: string | null;
  schedulingUrl: string | null;
  publishedAt: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  };
  items: ProposalItem[];
  projects: ProposalProject[];
  createdAt: string;
  updatedAt: string;
  publicPath?: string;
  expired?: boolean;
}

export interface ProposalItemInput {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  sortOrder?: number;
}

export interface ProposalProjectInput {
  id?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  projectUrl?: string;
  sortOrder?: number;
}

export interface CreateProposalInput {
  clientId: string;
  title: string;
  status?: ProposalStatus;
  validUntil?: string;
  totalValue?: number;
  structureContent?: string;
  structureImageUrls?: string[];
  coverVideoUrl?: string;
  coverImageUrl?: string;
  schedulingUrl?: string;
  items?: ProposalItemInput[];
  projects?: ProposalProjectInput[];
}

export interface UpdateProposalInput {
  clientId?: string;
  title?: string;
  status?: ProposalStatus;
  validUntil?: string | null;
  totalValue?: number;
  structureContent?: string | null;
  structureImageUrls?: string[];
  coverVideoUrl?: string | null;
  coverImageUrl?: string | null;
  schedulingUrl?: string | null;
  items?: ProposalItemInput[];
  projects?: ProposalProjectInput[];
}

export interface ContentPostClient {
  id: string;
  companyName: string;
  avatarUrl: string | null;
  instagram: string | null;
}

export interface ContentPost {
  id: string;
  title: string;
  clientId: string;
  client: ContentPostClient;
  platform: ContentPlatform;
  format: ContentPostFormat;
  scheduledDate: string | null;
  status: ContentPostStatus;
  referenceUrl: string | null;
  copy: string;
  attachments: ContentAttachment[];
  author: { id: string; name: string; avatarUrl: string | null };
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  platformColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentOverview {
  drafts: number;
  pendingApproval: number;
  scheduled: number;
  published: number;
  total: number;
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  scheduledDate: string;
  status: ContentPostStatus;
  clientName?: string;
  color: string;
}

export type CreationDeliverableType = "post" | "task";
export type BlockerSeverity = "red" | "amber";
export type BlockerType =
  | "overdue_task"
  | "missing_assets"
  | "unsigned_contract";

export interface CreationDeliverableItem {
  id: string;
  type: CreationDeliverableType;
  title: string;
  clientId: string | null;
  clientName: string;
  clientAvatarUrl: string | null;
  format: ContentPostFormat | null;
  status: string;
  platform: ContentPlatform | null;
  scheduledDate: string | null;
  dueDate: string | null;
  columnTitle?: string;
  priority?: string;
  assignee?: { id: string; name: string; avatarUrl: string | null } | null;
  assignees?: { id: string; name: string; avatarUrl: string | null }[];
  updatedAt: string;
}

export interface CreationDeliverableGroup {
  clientId: string;
  clientName: string;
  avatarUrl: string | null;
  items: CreationDeliverableItem[];
}

export interface CreationApprovalItem {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl: string | null;
  platform: ContentPlatform;
  format: ContentPostFormat;
  status: ContentPostStatus;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  updatedAt: string;
  scheduledDate: string | null;
  previewAttachment?: ContentAttachment | null;
}

export interface CreationScheduleItem {
  id: string;
  type: "post" | "event";
  title: string;
  clientId: string | null;
  clientName: string;
  platform: ContentPlatform | null;
  format: ContentPostFormat | null;
  status: string;
  scheduledAt: string;
  color: string;
  referenceUrl?: string | null;
}

export interface CreationBlocker {
  id: string;
  severity: BlockerSeverity;
  type: BlockerType;
  title: string;
  description: string;
  clientId: string | null;
  clientName: string;
  dueDate: string | null;
  href: string;
}

export interface CreationCommandCenter {
  weekRange: { start: string; end: string };
  deliverables: {
    groups: CreationDeliverableGroup[];
    summary: {
      total: number;
      byFormat: Record<string, number>;
      byStatus: Record<string, number>;
    };
  };
  approvalsQueue: CreationApprovalItem[];
  publishingSchedule: CreationScheduleItem[];
  blockers: CreationBlocker[];
  stats: {
    deliverablesThisWeek: number;
    pendingApprovals: number;
    scheduledReleases: number;
    activeBlockers: number;
  };
}

export interface BriefContentIdea {
  title: string;
  copy: string;
  format: ContentPostFormat;
  mediaConcept: string;
  suggestedDate: string;
}

export interface BriefContentPlan {
  clientId: string;
  clientName: string;
  summary: string;
  platform: ContentPlatform;
  ideas: BriefContentIdea[];
  provider: "openai" | "gemini" | "fallback";
}

export interface CreateBriefPlanInput {
  clientId: string;
  platform: ContentPlatform;
  ideas: BriefContentIdea[];
  createKanbanTasks?: boolean;
}

export interface BriefPlanCreateResult {
  created: { posts: number; tasks: number };
  posts: unknown[];
  tasks: unknown[];
}

export type CreationPipelineStatus = "draft" | "pending" | "approved";

export type CreationDeliverableTypeKey =
  | "post_instagram"
  | "post_reels"
  | "post_carousel"
  | "post_static"
  | "post_story"
  | "reuniao"
  | "entrega";

export type CreationDeliverableStatusInput = "draft" | "pending" | "approved";

export interface CreationPipelineItem {
  id: string;
  source: "post" | "event";
  postId: string | null;
  eventId: string | null;
  title: string;
  type: string;
  typeKey: string;
  scheduledAt: string;
  status: CreationPipelineStatus;
  statusLabel: string;
  referenceUrl: string | null;
  clientId: string;
  clientName: string;
  href: string;
  kanbanTaskId: string | null;
  taskStatus: KanbanTaskStatus | null;
  taskStatusColor: string | null;
  productionPhase?: ProductionPhase | null;
  taskStatusLabel: string | null;
  internalReviewStatus: InternalReviewStatus;
}

export interface CreationPipelineGroup {
  date: string;
  dateLabel: string;
  items: CreationPipelineItem[];
}

export interface CreationClientPipeline {
  client: {
    id: string;
    companyName: string;
    avatarUrl: string | null;
  };
  items: CreationPipelineItem[];
  groups: CreationPipelineGroup[];
}

export interface CreateDeliverableInput {
  clientId: string;
  title: string;
  type: CreationDeliverableTypeKey;
  scheduledAt: string;
  referenceUrl?: string;
  status: CreationDeliverableStatusInput;
}

export interface CreateContentPostInput {
  title: string;
  clientId: string;
  platform: ContentPlatform;
  format?: ContentPostFormat;
  scheduledDate?: string;
  status?: ContentPostStatus;
  referenceUrl?: string | null;
  copy: string;
  assigneeId?: string;
  attachments?: { name: string; url: string; mimeType?: string }[];
}

export interface PostInsights {
  postId: string;
  clientId: string;
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
  platform: ContentPlatform;
  isEstimated: boolean;
}

export interface ClientInsights {
  reach: number;
  impressions: number;
  spend: number;
  engagement: number;
  engagementRate: number;
  conversions: number;
  roas: number;
  activeCampaigns: number;
}

export interface IntegrationSettings {
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  notifyOnPostRejected: boolean;
  notifyOnContractSigned: boolean;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  subdomain: string;
  hasCrmModuleEnabled: boolean;
  metaAdAccountId: string | null;
  metaAppId: string | null;
  metaPageAccessToken: string | null;
  metaAppSecret: string | null;
  hasMetaPageAccessToken: boolean;
  hasMetaAppSecret: boolean;
  updatedAt: string;
}

export interface CompanyIntegrations {
  metaAdAccountId: string | null;
  metaAppId: string | null;
  metaPageAccessToken: string | null;
  metaAppSecret: string | null;
  apifyApiToken: string | null;
  whatsappApiToken: string | null;
  hasMetaPageAccessToken: boolean;
  hasMetaAppSecret: boolean;
  hasApifyApiToken: boolean;
  hasWhatsappApiToken: boolean;
  updatedAt: string;
}

export interface PostVersion {
  id: string;
  postId: string;
  versionNumber: number;
  versionLabel: string;
  title: string;
  copyText: string;
  mediaUrls: string[];
  createdBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface PostFeedback {
  id: string;
  postId: string;
  versionId: string | null;
  versionLabel: string | null;
  comment: string;
  type: PostFeedbackType;
  user: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface PostHistoryTimelineItem {
  kind: "version" | "feedback";
  id: string;
  createdAt: string;
  data: PostVersion | PostFeedback;
}

export interface PostHistory {
  versions: PostVersion[];
  feedback: PostFeedback[];
  timeline: PostHistoryTimelineItem[];
}

export interface CreatePostVersionInput {
  title: string;
  copyText: string;
  mediaUrls?: string[];
}

export interface RejectContentPostInput {
  rejectionReason: string;
}

/** @deprecated Use ContentPost */
export interface ContentItem {
  id: string;
  title: string;
  client: string;
  type: "post" | "video" | "story" | "reels" | "campaign";
  status: "briefing" | "production" | "review" | "approved" | "published";
  dueDate: string;
  assignee?: string;
}

export interface CreationOverview {
  inProduction: number;
  inReview: number;
  approved: number;
  published: number;
  items: ContentItem[];
}

export type Platform = "all" | "tiktok" | "instagram" | "facebook";

export interface PerformanceSummary {
  id: string;
  platform: "tiktok" | "instagram" | "facebook";
  title: string;
  description: string;
  views: number;
  newFollowers: number;
  engagementRate: string;
  totalComments: number;
  sharesCount: number;
  date: string;
  viewsTrend: { time: string; views: number }[];
  followerGrowth: { date: string; followers: number }[];
}

export interface PerformanceOverview {
  totalViews: number;
  totalFollowers: number;
  avgEngagement: string;
  topPlatform: string;
  summaries: PerformanceSummary[];
}

export interface DashboardOverview {
  user: {
    name: string;
    notificationCount: number;
  };
  finance: {
    revenue: number;
    expenses: number;
    netProfit: number;
    monthlyTrend: { month: string; income: number; expense: number }[];
  };
  contentAndMeta: {
    topCampaign: {
      id: string;
      name: string;
      roas: number;
      spend: number;
      ctr: number;
      status: string;
    } | null;
    scheduledPosts: {
      id: string;
      title: string;
      platform: string;
      scheduledDate: string;
    }[];
  };
  calendar: {
    todayMeetings: {
      id: string;
      title: string;
      startAt: string;
      endAt: string;
      category: string;
      color: string;
      isPending: boolean;
    }[];
  };
  kanban: {
    myTasks: {
      id: string;
      title: string;
      column: string;
      priority: string;
    }[];
  };
}

export type TvTaskDeliveryBucket =
  | "taskCreated"
  | "awaitingJhonatan"
  | "awaitingClient";

export type TvTaskUrgency =
  | "critical"
  | "sla_breach"
  | "overdue"
  | "due_today"
  | "attention";

export interface TvDeliveryTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  clientName: string | null;
}

export interface TvMonitoringOverview {
  generatedAt: string;
  tasks: {
    delivery: Record<TvTaskDeliveryBucket, number> & {
      total: number;
      tasks: Record<TvTaskDeliveryBucket, TvDeliveryTask[]>;
    };
    urgent: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: string | null;
      slaResolutionDueAt: string | null;
      clientName: string | null;
      urgency: TvTaskUrgency;
    }>;
  };
  leads: {
    stages: Array<{
      status: string;
      label: string;
      color: string;
      count: number;
    }>;
    totalActive: number;
  };
  finance: {
    period: { month: number; year: number };
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    pendingReceivables: number;
    pendingPayables: number;
    pendingReceivablesCount: number;
    pendingPayablesCount: number;
    overdueReceivables: number;
    overduePayables: number;
    overdueReceivablesCount: number;
    overduePayablesCount: number;
  };
}

export type MetaCampaignStatus =
  | "active"
  | "paused"
  | "completed"
  | "learning"
  | "unknown";

export type MetaDatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "last_year"
  | "maximum"
  | "custom";

export interface MetaAnalyticsSummary {
  totalSpend: number;
  totalRevenue: number;
  netProfit: number;
  roas: number;
  cpc: number;
  cpm: number;
  ctr: number;
  clicks: number;
  impressions: number;
  messagingConversations: number;
  linkClicks: number;
  postEngagement: number;
  datePreset: MetaDatePreset;
  periodStart: string | null;
  periodEnd: string | null;
  source: "meta";
}

export interface MetaAdAccountClient {
  id: string;
  accountId: string;
  name: string;
  accountStatus: number;
  currency: string;
  amountSpent: number;
  isActive: boolean;
}

export interface MetaAdAccountsResponse {
  clients: MetaAdAccountClient[];
  source: "meta";
}

export interface MetaClientPerformancePoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  revenue: number;
  ctr: number;
  messagingConversations: number;
}

export interface MetaCampaignInsight {
  id: string;
  name: string;
  status: MetaCampaignStatus;
  effectiveStatus: string;
  budget: number;
  budgetType: "daily" | "lifetime" | null;
  spend: number;
  reach: number;
  frequency: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roas: number;
  messagingConversations: number;
  linkClicks: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface MetaCampaignsResponse {
  campaigns: MetaCampaignInsight[];
  source: "meta";
  empty: boolean;
}

export interface MetaClientInsightsResponse {
  client: MetaAdAccountClient;
  overview: MetaAnalyticsSummary;
  performance: MetaClientPerformancePoint[];
  campaigns: MetaCampaignInsight[];
  source: "meta";
  empty: boolean;
}

export interface MetaAgencyAccountRow {
  client: MetaAdAccountClient;
  overview: MetaAnalyticsSummary;
  empty: boolean;
}

export interface MetaAgencyOverviewResponse {
  accounts: MetaAgencyAccountRow[];
  totals: MetaAnalyticsSummary;
  source: "meta";
  empty: boolean;
}

export interface MetaAnalyticsQuery {
  datePreset?: MetaDatePreset;
  month?: number;
  year?: number;
  search?: string;
  clientId?: string;
  adAccountId?: string;
}

export type InstagramContentType =
  | "VIDEO_WITH_SCRIPT"
  | "STATIC"
  | "CAROUSEL"
  | "STORIES_NO_SCRIPT";

export interface InstagramInsightClient {
  id: string;
  companyName: string;
  avatarUrl: string | null;
  instagram: string | null;
  instagramUserId: string | null;
  hasMetaAccessToken: boolean;
}

export interface InstagramAudienceMetrics {
  newFollowers: number;
  unfollows: number;
  profileVisits: number;
  bioClicks: number;
  reach: number;
  engagement: number;
  netFollowers: number;
  postsCount: number;
  conversationsStarted: number;
  comments: number;
}

export interface InstagramMediaInsight {
  id: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  contentType: InstagramContentType;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
}

export interface InstagramInsightClientsResponse {
  clients: InstagramInsightClient[];
}

export interface InstagramConversationRow {
  id: string;
  companyName: string;
  avatarUrl: string | null;
  instagram: string | null;
  conversationsStarted: number;
  comments: number;
}

export interface InstagramConversationsResponse {
  period: {
    month: number;
    year: number;
    label: string;
    partial?: boolean;
    accountMetricsAvailable?: boolean;
  };
  clients: InstagramConversationRow[];
}

export interface InstagramClientMetricsResponse {
  client: InstagramInsightClient;
  audience: InstagramAudienceMetrics;
  media: InstagramMediaInsight[];
  period: {
    month: number;
    year: number;
    label: string;
    partial?: boolean;
    accountMetricsAvailable?: boolean;
  };
  empty: boolean;
}

export interface MetaInsightsOverview {
  reach: number;
  impressions: number;
  totalSpend: number;
  roas: number;
  engagementRate: number;
  activeCampaigns: number;
  totalConversions: number;
}

export interface MetaPerformancePoint {
  date: string;
  spend: number;
  conversions: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: MetaCampaignStatus;
  budget: number;
  budgetType: "daily" | "lifetime";
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
  startDate: string;
  endDate: string | null;
}

export interface ReportMetaMetrics {
  reach: number;
  impressions: number;
  spend: number;
  engagement: number;
  engagementRate: number;
  conversions: number;
  roas: number;
  activeCampaigns: number;
  performanceChart: {
    date: string;
    spend: number;
    reach: number;
    engagement: number;
  }[];
}

export interface ReportContentPost {
  id: string;
  title: string;
  platform: ContentPlatform;
  format: ContentPostFormat;
  scheduledDate: string | null;
  status: ContentPostStatus;
  copy?: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string | null;
  }>;
}

export interface ContentManagementPost extends ContentPost {
  latestFeedback: PostFeedback | null;
}

export interface ContentManagementBoard {
  overview: ContentOverview;
  posts: ContentManagementPost[];
}

export interface PortalContentPipelineItem extends ReportContentPost {
  updatedAt: string;
  latestFeedback: {
    comment: string;
    createdAt: string;
  } | null;
}

export interface ReportActiveProject {
  id: string;
  title: string;
  status: ContractStatus;
  recurringValue: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate: string | null;
  pdfUrl?: string | null;
  hasTerms?: boolean;
}

export interface PortalBrief {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface PortalContractDetail {
  id: string;
  clientId: string;
  client: Contract["client"];
  title: string;
  status: ContractStatus;
  recurringValue: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate: string | null;
  termsContent: string;
  pdfUrl: string | null;
  createdBy: Contract["createdBy"];
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  client: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    avatarUrl: string | null;
    instagram: string | null;
  };
  period: { month: number; year: number; label: string };
  content: {
    completedPosts: ReportContentPost[];
    byPlatform: Record<string, number>;
    byFormat: Record<string, number>;
    publishedCount: number;
  };
  meta: ReportMetaMetrics;
  projects: { activeContracts: ReportActiveProject[] };
  summary: {
    totalPostsPublished: number;
    activeProjectsCount: number;
    metaReach: number;
    metaSpend: number;
    metaEngagement: number;
  };
}

export interface ClientReport {
  id: string;
  clientId: string;
  client: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    avatarUrl: string | null;
    instagram: string | null;
  };
  month: number;
  year: number;
  title: string;
  data: ReportData;
  generatedBy: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

export interface GenerateReportInput {
  month: number;
  year: number;
}

export interface PortalTokenResult {
  clientId: string;
  companyName: string;
  token: string;
  portalUrl: string;
}

export interface PortalReportSummary {
  id: string;
  title: string;
  month: number;
  year: number;
  periodLabel: string;
  createdAt: string;
}

export interface PortalData {
  client: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    avatarUrl: string | null;
    instagram: string | null;
    hasCrmEnabled?: boolean;
  } | null;
  accountStatus: {
    activeContracts: number;
    pendingApprovals: number;
    scheduledPosts: number;
    publishedPosts: number;
    status: "active" | "onboarding";
  };
  pendingApprovalPosts: ReportContentPost[];
  scheduledPosts: ReportContentPost[];
  contentPipeline: PortalContentPipelineItem[];
  recentReports: PortalReportSummary[];
  contracts: ReportActiveProject[];
  recentBriefs: PortalBrief[];
}

export type AssetFileType = "image" | "logo" | "brand_guide" | "document";

export interface Asset {
  id: string;
  clientId: string;
  client: { id: string; companyName: string; avatarUrl: string | null };
  fileName: string;
  fileType: AssetFileType;
  fileUrl: string;
  fileSize: number;
  uploadedBy: { id: string; name: string; avatarUrl: string | null } | null;
  uploadedAt: string;
}

export interface ClientAssetGroup {
  client: { id: string; companyName: string; avatarUrl: string | null };
  assets: Asset[];
}

export type NotificationType =
  | "task_assigned"
  | "contract_signed"
  | "post_pending"
  | "post_rejected"
  | "due_date_warning"
  | "new_request"
  | "system"
  | "app_update";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  taskId?: string | null;
  appUpdateId?: string | null;
  createdAt: string;
}

export interface ArtTypePricing {
  id: string;
  artType: string;
  pricePerPiece: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArtTypePricingInput {
  artType: string;
  pricePerPiece: number;
  description?: string;
}

export interface UpdateArtTypePricingInput
  extends Partial<CreateArtTypePricingInput> {}

export interface CalendarEntry {
  id: string;
  month: number;
  year: number;
  clientId: string;
  artType: string;
  plannedDate: string;
  designerId: string;
  title: string;
  description: string | null;
  taskId: string | null;
  productionDeadline: string | null;
  storyQuantity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEntryInput {
  month: number;
  year: number;
  clientId: string;
  artType: string;
  plannedDate: string;
  designerId: string;
  title: string;
  description?: string;
  taskId?: string;
  productionDeadline?: string;
  storyQuantity?: number;
}

export interface UpdateCalendarEntryInput
  extends Partial<CreateCalendarEntryInput> {}

export interface AgendaConfirmation {
  id: string;
  eventId: string;
  userId: string;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  eventType: string;
  recurrence: string;
  participants: string[];
  meetingLink: string | null;
  location: string | null;
  priority: string;
  status: string;
  createdBy: string;
  confirmations?: AgendaConfirmation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgendaEventInput {
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  eventType: string;
  recurrence?: string;
  participants?: string[];
  meetingLink?: string;
  location?: string;
  priority?: string;
  status?: string;
}

export interface UpdateAgendaEventInput
  extends Partial<CreateAgendaEventInput> {}

export type PortalRequestContentType =
  | "rede_social"
  | "flyer"
  | "panfleto"
  | "banner"
  | "ensaio_fotografico"
  | "outro";

export type PortalRequestStatus =
  | "pending"
  | "converted_to_task"
  | "rejected";

export interface PortalRequestComment {
  id: string;
  requestId: string;
  body: string;
  parentId: string | null;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalClientRequest {
  id: string;
  tenantId: string;
  companyId: string;
  clientId: string;
  client: { id: string; companyName: string } | null;
  title: string;
  description: string | null;
  contentType: PortalRequestContentType;
  referenceLinks: string[];
  attachments: Array<{
    name?: string;
    url: string;
    mimeType?: string;
    fileSize?: number;
  }> | unknown;
  status: PortalRequestStatus;
  relatedTaskId: string | null;
  comments: PortalRequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortalClientRequestInput {
  title: string;
  description?: string;
  contentType?: PortalRequestContentType;
  referenceLinks?: string[];
  attachments?: unknown;
}

export interface ClientRequest {
  id: string;
  tenantId?: string;
  companyId?: string;
  clientId: string;
  client?: { id: string; companyName: string } | null;
  title: string;
  description: string | null;
  contentType?: PortalRequestContentType;
  referenceLinks?: string[];
  attachments: Array<{
    name?: string;
    url: string;
    mimeType?: string;
    fileSize?: number;
  }> | unknown;
  status: PortalRequestStatus | string;
  rejectionReason?: string | null;
  relatedTaskId: string | null;
  comments?: PortalRequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ConvertClientRequestToTaskInput {
  assigneeId?: string;
  assignedGroupId?: string;
  deliveryDate: string;
  publicationDate: string;
}

export interface ConvertClientRequestToTaskResult {
  request: ClientRequest;
  task: KanbanTask;
  alreadyConverted: boolean;
}

export interface CreateClientRequestInput {
  clientId: string;
  title: string;
  description?: string;
  attachments?: unknown;
  status?: string;
  relatedTaskId?: string;
}

export interface UpdateClientRequestInput
  extends Partial<CreateClientRequestInput> {}

export interface ClientReportFile {
  id: string;
  clientId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  status: string;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientReportFileInput {
  clientId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  status?: string;
}

export interface UpdateClientReportFileInput
  extends Partial<CreateClientReportFileInput> {}

export type LeadStatus =
  | "PRE_VENDA"
  | "APRESENTACAO"
  | "REUNIAO_AGENDADA"
  | "VENDA_FINALIZADA"
  | "AGUARDANDO_ENTREGA"
  | "POS_VENDA"
  | "NAO_TEM_INTERESSE"
  | "AGUARDANDO_RESPOSTA";

export type CrmLeadStatus = "ACTIVE" | "FINISHED" | "NO_INTEREST";

export interface Lead {
  id: string;
  companyId: string;
  organizationId?: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  category: string | null;
  placeId: string | null;
  rating: number | null;
  reviewsCount: number | null;
  latitude: number | null;
  longitude: number | null;
  status: LeadStatus;
  stageId?: string | null;
  statusLabel?: string;
  statusColor?: string;
  crmStatus?: CrmLeadStatus;
  isMinimized?: boolean;
  kanbanTracked: boolean;
  kanbanOrder: number;
  aiScore: number | null;
  aiNotes: string | null;
  source: string;
  rawData?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface LeadKanbanColumn {
  id?: string;
  stageId?: string;
  status: string;
  title: string;
  color: string;
  order?: number;
  leads: Lead[];
}

export interface LeadKanbanBoard {
  columns: LeadKanbanColumn[];
  total: number;
  crmMoveZone?: "all" | "sdr" | "client" | "none";
}

export interface AddLeadToKanbanInput {
  leadId?: string;
  name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  category?: string;
  placeId?: string;
  source?: string;
  organizationId?: string | null;
}

export interface UpdateLeadStatusInput {
  status?: string;
  stageId?: string;
  order?: number;
}

export interface LeadStage {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  order: number;
  color: string;
  key: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadStageInput {
  name: string;
  color?: string;
  order?: number;
}

export interface UpdateLeadStageInput {
  name?: string;
  color?: string;
  order?: number;
}

export type CrmReminderTaskStatus = "PENDING" | "DONE" | "CANCELLED";

export interface CrmReminderTask {
  id: string;
  companyId: string;
  leadId: string;
  title: string;
  dueDate: string;
  status: CrmReminderTaskStatus;
  completedAt: string | null;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmReminderColumn {
  status: CrmReminderTaskStatus;
  title: string;
  tasks: CrmReminderTask[];
}

export interface CrmReminderBoard {
  columns: CrmReminderColumn[];
  total: number;
}

export interface FetchMapsLeadsInput {
  city: string;
  category: string;
  neighborhood: string;
}

export interface LeadComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    email?: string;
  };
}

export type DeliverableItemStatus =
  | "pending"
  | "approved"
  | "requires_adjustment";

export type DeliverableMediaType = "image" | "video" | "other";

export type DeliverableApprovalStatus =
  | "draft"
  | "pending_approval"
  | "waiting_client_approval"
  | "approved"
  | "requires_adjustment";

export type ClientPortalDeliverableStatus =
  | "APPROVED"
  | "REJECTED"
  | "REQUIRES_ADJUSTMENT";

export interface ClientPortalDeliverable {
  id: string;
  title: string;
  approvalStatus: DeliverableApprovalStatus;
  deliveryDate: string;
  updatedAt: string;
  createdAt: string;
  links: {
    kanbanTaskId: string | null;
    contentPostId: string | null;
  };
  revisionSummary: {
    total: number;
    pending: number;
    approved: number;
    requiresAdjustment: number;
  };
}

export interface DeliverableItem {
  id: string;
  deliverableId: string;
  mediaUrl: string;
  mediaType: DeliverableMediaType;
  status: DeliverableItemStatus;
  adjustmentNotes?: string | null;
  feedbackNotes: string | null;
  fileName: string | null;
  fileSize: number | null;
  sourceAssetId?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverableFullView {
  id: string;
  title: string;
  copy?: string | null;
  approval: {
    status: DeliverableApprovalStatus;
    approvedAt: string | null;
    approvedBy: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
  };
  workflow?: {
    isBypassingInternalReview: boolean;
    kanbanStatus: string | null;
    internalReviewStatus: string | null;
    internalReviewNote?: string | null;
    rejectionReason?: string | null;
  };
  client: { id: string; companyName: string } | null;
  links: {
    kanbanTaskId: string | null;
    contentPostId: string | null;
  };
  media: {
    images: DeliverableItem[];
    videos: DeliverableItem[];
    other: DeliverableItem[];
    all: DeliverableItem[];
  };
  revisionSummary: {
    total: number;
    pending: number;
    approved: number;
    requiresAdjustment: number;
  };
  updatedAt: string;
  createdAt: string;
}

export interface DeliverableDownloadPayload {
  itemId: string;
  fileName: string;
  mediaType: string;
  downloadUrl: string;
  expiresAt: string | null;
  contentDisposition: string;
  source: "supabase" | "local" | "external";
}

export interface InternalApprovalItem {
  id: string;
  title: string;
  description: string | null;
  postCaption?: string | null;
  kanbanTaskId: string;
  contentPostId: string | null;
  approvalStatus: string | null;
  internalReviewStatus: string;
  internalReviewNote: string | null;
  kanbanStatus: string;
  publicationDate: string | null;
  deliveryDate: string | null;
  dueDate: string | null;
  assetCount: number;
  client: {
    id: string;
    companyName: string;
    avatarUrl: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  assignees: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
  }>;
  revisionSummary: {
    total: number;
    pending: number;
    approved: number;
    requiresAdjustment: number;
  };
  updatedAt: string;
  createdAt: string;
}

export type {
  SystemSuggestion,
  SystemSuggestionType,
  SystemSuggestionStatus,
  CreateSuggestionInput,
  UpdateSuggestionStatusInput,
} from "./suggestions";

export type {
  AppUpdate,
  AppUpdateAuthor,
  AppUpdateVisibleRole,
  AppUpdatesAccess,
  CreateAppUpdateInput,
  UpdateAppUpdateInput,
} from "./app-updates";

