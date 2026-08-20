export type ContainerSize = "20" | "40" | "45";
export type ContainerStatus = "EMPTY" | "LADEN";
export type RepairMode = "REPAIR" | "REPLACE";
export type Responsibility = "OWNER" | "USER";
export type ContainerType =
  | "STANDARD"
  | "HIGH_CUBE"
  | "REEFER"
  | "OPEN_TOP"
  | "TANK"
  | "FLAT_RACK";

export interface Part {
  id: string;
  name: string;
  unitPrice: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartInput {
  name: string;
  unitPrice: number;
  currency?: string;
}

export interface ShippingLine {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** A part attached to a damage item, as sent to / received from the API. */
export interface DamageItemPart {
  id?: string;
  partId: string;
  quantity: number;
  /** Present on reads (eager-loaded catalog part); omitted on writes. */
  part?: Part | null;
}

export interface DamageItem {
  id?: string;
  damageType: string;
  locationCode: string;
  /** Repair in place (default) or replace the component. */
  repairMode?: RepairMode;
  /** Units of this repair; defaults to 1. */
  quantity?: number;
  note?: string;
  parts?: DamageItemPart[];
  // ---- IICL repair coding (drives the EOR) ----
  componentCode?: string | null;
  iiclDamageCode?: string | null;
  repairCode?: string | null;
  iiclLocationCode?: string | null;
  responsibility?: Responsibility | null;
  grade?: string | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  hoursOverride?: number | null;
  laborCostOverride?: number | null;
  materialCostOverride?: number | null;
}

/** A code catalog row (component / damage / repair / location). */
export interface CodeItem {
  id: string;
  code: string;
  description: string;
  group?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCodeInput {
  code: string;
  description: string;
  group?: string;
}

/** IICL component/repair-code repair rate — the EOR pricing catalog. */
export interface RepairRate {
  id: string;
  componentCode: string;
  repairCode: string;
  damageCode?: string | null;
  grade?: string | null;
  containerSize?: ContainerSize | null;
  shippingLineId?: string | null;
  shippingLine?: ShippingLine | null;
  laborHours: number;
  laborRate?: number | null;
  materialCost: number;
  /** Full component size the material price covers; enables area proration. */
  fullLengthMm?: number | null;
  fullWidthMm?: number | null;
  currency: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRepairRateInput {
  componentCode: string;
  repairCode: string;
  damageCode?: string | null;
  grade?: string | null;
  containerSize?: ContainerSize | null;
  shippingLineId?: string | null;
  laborHours?: number;
  laborRate?: number | null;
  materialCost: number;
  fullLengthMm?: number | null;
  fullWidthMm?: number | null;
  currency?: string;
  description?: string;
}

/** A priced EOR repair line (mirrors the API EorLine). */
export interface EorLine {
  no: number;
  componentCode: string;
  locationCode: string;
  damageCode: string;
  repairCode: string;
  description: string;
  prty: string;
  responsibility: Responsibility | null;
  length: number | null;
  width: number | null;
  /** Damaged-area ÷ full-component-area (0–1); material is scaled by this. */
  areaFactor: number;
  quantity: number;
  hours: number;
  laborRate: number;
  laborCost: number;
  materialCost: number;
  total: number;
  priced: boolean;
}

export interface EorBreakdown {
  currency: string;
  laborRate: number;
  lines: EorLine[];
  laborTotal: number;
  materialTotal: number;
  total: number;
  ownerTotal: number;
  userTotal: number;
  unassignedTotal: number;
  pricedCount: number;
  unpricedCount: number;
}

export interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface DamageReport {
  id: string;
  reportNo: number;
  reportDate: string;
  containerNumber: string;
  truckCompany?: string;
  truckNumber?: string;
  containerSize: ContainerSize;
  containerStatus: ContainerStatus;
  containerType: ContainerType;
  shippingLineId?: string | null;
  shippingLine?: ShippingLine | null;
  inspectionNotes?: string;
  supervisorName?: string;
  truckerName?: string;
  truckCoName?: string;
  shipperName?: string;
  // ---- EOR header (all optional) ----
  eorNo?: string;
  eorDate?: string;
  estimateDate?: string;
  approveDate?: string;
  turnInDate?: string;
  onHireDate?: string;
  blNo?: string;
  depotCode?: string;
  depotName?: string;
  opsCode?: string;
  criteria?: string;
  laborRate?: number | null;
  exchangeRate?: number | null;
  estCurrency?: string;
  tareWeight?: number | null;
  grossWeight?: number | null;
  cscPlate?: string;
  yearBuild?: string;
  sizeType?: string;
  unitMeasure?: string;
  customer?: string;
  address?: string;
  eorNote?: string;
  items: DamageItem[];
  attachments: Attachment[];
  itemCount?: number;
  attachmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** EOR header fields accepted when creating a report (all optional). */
export interface EorHeaderInput {
  eorNo?: string;
  eorDate?: string;
  estimateDate?: string;
  approveDate?: string;
  turnInDate?: string;
  onHireDate?: string;
  blNo?: string;
  depotCode?: string;
  depotName?: string;
  opsCode?: string;
  criteria?: string;
  laborRate?: number;
  exchangeRate?: number;
  estCurrency?: string;
  tareWeight?: number;
  grossWeight?: number;
  cscPlate?: string;
  yearBuild?: string;
  sizeType?: string;
  unitMeasure?: string;
  customer?: string;
  address?: string;
  eorNote?: string;
}

export interface CreateReportInput extends EorHeaderInput {
  reportDate: string;
  containerNumber: string;
  truckCompany?: string;
  truckNumber?: string;
  containerSize: ContainerSize;
  containerStatus: ContainerStatus;
  containerType: ContainerType;
  shippingLineId?: string | null;
  inspectionNotes?: string;
  supervisorName?: string;
  truckerName?: string;
  truckCoName?: string;
  shipperName?: string;
  items: DamageItem[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface Tariff {
  id: string;
  damageType: string;
  containerSize: ContainerSize | null;
  shippingLineId?: string | null;
  shippingLine?: ShippingLine | null;
  /** Labour rate per man-hour. */
  laborRate: number;
  /** Standard man-hours to repair in place. */
  repairHours: number;
  /** Material allowance for a repair. */
  repairMaterial: number;
  /** Standard man-hours to fit a replacement. */
  replaceHours: number;
  /** Cost of the replacement component. */
  replaceMaterial: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTariffInput {
  damageType: string;
  containerSize?: ContainerSize | null;
  shippingLineId?: string | null;
  laborRate: number;
  repairHours: number;
  repairMaterial: number;
  replaceHours: number;
  replaceMaterial: number;
  currency?: string;
}

export interface CostPartLine {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CostLine {
  damageType: string;
  locationCode: string;
  mode: RepairMode;
  quantity: number;
  hours: number;
  laborRate: number;
  laborPriced: boolean;
  labor: number;
  material: number;
  parts: CostPartLine[];
  amount: number;
}

export interface CostBreakdown {
  currency: string;
  total: number;
  laborTotal: number;
  materialTotal: number;
  partsTotal: number;
  lines: CostLine[];
  unpriced: { damageType: string; locationCode: string }[];
  pricedCount: number;
  unpricedCount: number;
}

/** A permission string, e.g. "reports:create". */
export type Resource =
  | "reports"
  | "tariffs"
  | "parts"
  | "shipping-lines"
  | "iicl"
  | "users";
export type PermissionAction = "view" | "create" | "edit" | "delete";
export type Permission = `${Resource}:${PermissionAction}`;

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Permission[];
}

export type UpdateRoleInput = Partial<CreateRoleInput>;

export interface PermissionCatalog {
  permissions: Permission[];
  actions: PermissionAction[];
  resourceLabels: Record<Resource, string>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roleId: string | null;
  roleName: string | null;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  roleId?: string;
  isActive?: boolean;
}

export type UpdateUserInput = Partial<CreateUserInput>;

export interface Refs {
  damageTypes: { value: string; label: string }[];
  locationCodes: { code: string; label: string }[];
  containerSizes: ContainerSize[];
  containerStatuses: ContainerStatus[];
  containerTypes: ContainerType[];
  responsibilities: { value: Responsibility; label: string }[];
  componentCodes: CodeItem[];
  damageCodes: CodeItem[];
  repairCodes: CodeItem[];
  iiclLocationCodes: CodeItem[];
}
