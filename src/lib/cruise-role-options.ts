// cruise-role-options.ts
// Client-safe list of cruise role options derived from cruise-roles.json.
// Import this instead of cruise-cv-check.ts (which contains server functions)
// when you need the role list in client components.

// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

interface RoleOption {
  slug: string;
  label: string;
}

const rolesData = cruiseRolesRaw as { roles: { slug: string; role: string }[] };

export const CRUISE_ROLE_OPTIONS: RoleOption[] = rolesData.roles.map((r) => ({
  slug: r.slug,
  label: r.role,
}));
