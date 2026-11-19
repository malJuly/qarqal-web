// Shapes returned by the backend for the agent portal (qarqal-backend: services/partnerAuth.service.ts,
// controller/me.controller.ts). Same RBAC model as qarqalAngular (core/models/rbac.model.ts).

export type AgentAction = 'create' | 'read' | 'update' | 'delete';

/** One company the user belongs to. upr_is_active marks the company they are working for now. */
export interface PartnerMembership {
  upr_id: number;
  upr_is_active: boolean;
  upr_is_root_admin: boolean;
  partner_guid: string;
  partner_name: string | null;
  roles: string[];
}

export interface ModuleAccessGrant {
  mdl_id: number;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

/** Keyed by the backend module name, e.g. "partner-orders". */
export type ModuleAccessMap = Record<string, ModuleAccessGrant>;

export interface AgentUser {
  id: number;
  username: string;
  email: string;
}

/** POST /auth/partner-login → data */
export interface PartnerLoginData {
  access_token: string;
  user: AgentUser;
  memberships: PartnerMembership[];
  active_partner_role: PartnerMembership | null;
  module_access: ModuleAccessMap;
}

/** POST /me/active-assignment → data */
export interface ActiveAssignmentData {
  access_token: string;
  active_partner_role: PartnerMembership | null;
  module_access: ModuleAccessMap;
}

/** GET /me → data */
export interface MeData {
  is_superadmin: boolean;
  is_internal_staff?: boolean;
  active_partner_role: PartnerMembership | null;
  module_access?: ModuleAccessMap;
}

export interface Envelope<T> {
  status: boolean;
  message?: string;
  data: T;
}

/** What the portal keeps in localStorage between visits. */
export interface AgentSessionState {
  token: string;
  user: AgentUser;
  memberships: PartnerMembership[];
  active: PartnerMembership | null;
  moduleAccess: ModuleAccessMap;
}
