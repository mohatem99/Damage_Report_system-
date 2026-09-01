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

export interface Agency {
  id: string;
  name: string;
  code?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyInput {
  name: string;
  code?: string | null;
}

export interface ShippingLine {
  id: string;
  name: string;
  code?: string | null;
  agencyId?: string | null;
  agency?: Agency | null;
  /** Email defaults used to pre-fill the "email this report" dialog. */
  contactEmail?: string | null;
  contactName?: string | null;
  emailCc?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingLineInput {
  name: string;
  code?: string | null;
  agencyId?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  emailCc?: string | null;
  address?: string | null;
}

/** Payload to email a report's EIR/EOR PDF. */
export interface SendReportEmailInput {
  document: "eir" | "eor";
  to?: string;
  cc?: string;
  subject?: string;
  message?: string;
}

export interface DamageItem {
  id?: string;
  /** Legacy EIR damage type; items are now coded via the IICL fields below. */
  damageType?: string | null;
  /** Legacy diagram A–Z code; the IICL location code is the location now. */
  locationCode?: string | null;
  /** Repair in place (default) or replace the component. */
  repairMode?: RepairMode;
  /** Units of this repair; defaults to 1. */
  quantity?: number;
  /**
   * Numbered panel/board on the located face — e.g. left side, panel 3 (with
   * iiclLocationCode = LXXX), or plywood floor board 5. Optional.
   */
  panelPosition?: number | null;
  note?: string;
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

/** System-wide settings (single row). The default depot pre-fills each EOR. */
export interface AppSettings {
  depotCode?: string | null;
  depotName?: string | null;
  updatedAt?: string;
}

export interface UpdateSettingsInput {
  depotCode?: string | null;
  depotName?: string | null;
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
  agencyId?: string | null;
  agency?: Agency | null;
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
  agencyId?: string | null;
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
  /** Public URL to load the image (S3 object URL or local /uploads URL). */
  url?: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface DamageReport {
  id: string;
  reportNo: number;
  /** Display form of reportNo, e.g. "2026-0000215" — used in filenames/PDFs/UI. */
  reportNoFormatted?: string;
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
  bookingNumber?: string;
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
  bookingNumber?: string;
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

/** A permission string, e.g. "reports:create". */
export type Resource =
  | "reports"
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

/** Standard count of a numbered series (panels/boards/members) on a face. */
export interface FaceCount {
  /** IICL TB-002 location face the number qualifies (LXXX / RXXX / IXXX / UXXX). */
  code: string;
  label: string;
  /** How many numbered panels/boards/members that face has. */
  max: number;
}

export interface Refs {
  damageTypes: { value: string; label: string }[];
  locationCodes: { code: string; label: string }[];
  /** Diagram A–Z location code → IICL TB-002 location code (e.g. "F" → "LXXX"). */
  locationToIicl: Record<string, string>;
  /** Standard numbered-series counts per container size and face. */
  faceCounts: Record<ContainerSize, FaceCount[]>;
  containerSizes: ContainerSize[];
  containerStatuses: ContainerStatus[];
  containerTypes: ContainerType[];
  responsibilities: { value: Responsibility; label: string }[];
  componentCodes: CodeItem[];
  damageCodes: CodeItem[];
  repairCodes: CodeItem[];
  iiclLocationCodes: CodeItem[];
}
