export type BrandLogo = { src: string; alt: string; institution?: string; containsInstitutionName?: boolean };
export type Branding = { profile: "none"; logo?: never } | { profile: "zuel"; logo: BrandLogo };

// New projects explicitly persist this choice. Legacy projects keep their
// existing markup/assets and are not migrated by this resolver.
export function resolveBrandLogo(branding?: Branding): BrandLogo | undefined {
  if (!branding || branding.profile === "none") return undefined;
  return branding.logo;
}
