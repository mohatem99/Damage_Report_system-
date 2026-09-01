import { getSession } from "next-auth/react";
import type {
  Agency,
  AgencyInput,
  AppSettings,
  Attachment,
  CodeItem,
  CreateCodeInput,
  CreateReportInput,
  CreateRepairRateInput,
  CreateRoleInput,
  CreateUserInput,
  DamageReport,
  EorBreakdown,
  Paginated,
  PermissionCatalog,
  Refs,
  RepairRate,
  Role,
  SendReportEmailInput,
  ShippingLine,
  ShippingLineInput,
  UpdateRoleInput,
  UpdateSettingsInput,
  UpdateUserInput,
  User,
} from "./types";

/** IICL code catalog kinds (the /iicl/:kind route segment). */
export type CodeKind =
  | "component-codes"
  | "damage-codes"
  | "repair-codes"
  | "location-codes";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Bearer header from the current NextAuth session (client-side). */
async function authHeader(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await authHeader();
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ReportListParams {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const api = {
  refs: () => http<Refs>("/refs"),

  listReports: (params: ReportListParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http<Paginated<DamageReport>>(`/reports${q ? `?${q}` : ""}`);
  },

  /**
   * Fetch every report by walking the paginated endpoint (the API caps
   * pageSize at 100 per request). Used by the client-side data grid.
   */
  listAllReports: async (): Promise<DamageReport[]> => {
    const pageSize = 100;
    const first = await api.listReports({ page: 1, pageSize });
    const all = [...first.data];
    for (let page = 2; page <= first.pages; page++) {
      const next = await api.listReports({ page, pageSize });
      all.push(...next.data);
    }
    return all;
  },

  getReport: (id: string) => http<DamageReport>(`/reports/${id}`),

  createReport: (input: CreateReportInput) =>
    http<DamageReport>("/reports", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteReport: (id: string) =>
    http<void>(`/reports/${id}`, { method: "DELETE" }),

  listAttachments: (reportId: string) =>
    http<Attachment[]>(`/reports/${reportId}/attachments`),

  uploadAttachment: async (reportId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${API_URL}/api/reports/${reportId}/attachments`,
      { method: "POST", body: form, headers: await authHeader() },
    );
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return res.json() as Promise<Attachment>;
  },

  deleteAttachment: (id: string) =>
    http<void>(`/attachments/${id}`, { method: "DELETE" }),

  /** IICL Estimate of Repair breakdown (the authoritative EOR). */
  getReportEor: (id: string) => http<EorBreakdown>(`/reports/${id}/eor`),

  /** Email the EIR or EOR PDF to the shipping line (or an override recipient). */
  sendReportEmail: (id: string, input: SendReportEmailInput) =>
    http<{ sent: boolean; to: string; cc: string | null; document: string }>(
      `/reports/${id}/email`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  // ---- IICL code catalogs ----
  listCodes: (kind: CodeKind) => http<CodeItem[]>(`/iicl/${kind}`),

  createCode: (kind: CodeKind, input: CreateCodeInput) =>
    http<CodeItem>(`/iicl/${kind}`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateCode: (kind: CodeKind, id: string, input: Partial<CreateCodeInput>) =>
    http<CodeItem>(`/iicl/${kind}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteCode: (kind: CodeKind, id: string) =>
    http<void>(`/iicl/${kind}/${id}`, { method: "DELETE" }),

  // ---- IICL repair rates ----
  listRepairRates: () => http<RepairRate[]>("/iicl/repair-rates"),

  createRepairRate: (input: CreateRepairRateInput) =>
    http<RepairRate>("/iicl/repair-rates", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateRepairRate: (id: string, input: Partial<CreateRepairRateInput>) =>
    http<RepairRate>(`/iicl/repair-rates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteRepairRate: (id: string) =>
    http<void>(`/iicl/repair-rates/${id}`, { method: "DELETE" }),

  // ---- Shipping lines ----
  listShippingLines: () => http<ShippingLine[]>("/shipping-lines"),

  createShippingLine: (input: ShippingLineInput) =>
    http<ShippingLine>("/shipping-lines", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateShippingLine: (id: string, input: Partial<ShippingLineInput>) =>
    http<ShippingLine>(`/shipping-lines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteShippingLine: (id: string) =>
    http<void>(`/shipping-lines/${id}`, { method: "DELETE" }),

  // ---- Agencies ----
  listAgencies: () => http<Agency[]>("/agencies"),

  createAgency: (input: AgencyInput) =>
    http<Agency>("/agencies", { method: "POST", body: JSON.stringify(input) }),

  updateAgency: (id: string, input: Partial<AgencyInput>) =>
    http<Agency>(`/agencies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteAgency: (id: string) =>
    http<void>(`/agencies/${id}`, { method: "DELETE" }),

  // ---- Settings (system-wide default depot) ----
  getSettings: () => http<AppSettings>("/settings"),

  updateSettings: (input: UpdateSettingsInput) =>
    http<AppSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  // ---- Users (admin-only) ----
  listUsers: () => http<User[]>("/users"),

  createUser: (input: CreateUserInput) =>
    http<User>("/users", { method: "POST", body: JSON.stringify(input) }),

  updateUser: (id: string, input: UpdateUserInput) =>
    http<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteUser: (id: string) =>
    http<void>(`/users/${id}`, { method: "DELETE" }),

  // ---- Roles & permissions (admin-only) ----
  listRoles: () => http<Role[]>("/roles"),

  permissionCatalog: () => http<PermissionCatalog>("/roles/permissions"),

  createRole: (input: CreateRoleInput) =>
    http<Role>("/roles", { method: "POST", body: JSON.stringify(input) }),

  updateRole: (id: string, input: UpdateRoleInput) =>
    http<Role>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteRole: (id: string) =>
    http<void>(`/roles/${id}`, { method: "DELETE" }),

  // ---- Downloads ----
  // These are opened via <a target="_blank">, so the JWT can't ride in a
  // header — it goes in the access_token query param (see JwtAuthGuard).
  reportPdfUrl: (id: string) => `${API_URL}/api/reports/${id}/pdf`,
  reportEorPdfUrl: (id: string) => `${API_URL}/api/reports/${id}/eor/pdf`,
  reportEorExcelUrl: (id: string) => `${API_URL}/api/reports/${id}/eor.xlsx`,
  uploadUrl: (fileName: string) => `${API_URL}/uploads/${fileName}`,

  /** Append the session access token to a download URL for browser-native GETs. */
  withToken: (url: string, token?: string | null) =>
    token
      ? `${url}${url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`
      : url,
};
