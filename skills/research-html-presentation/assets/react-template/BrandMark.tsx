import { resolveBrandLogo, type Branding } from "./branding";

export function BrandMark({ branding, role, className }: {
  branding?: Branding;
  role: "cover" | "content" | "closing" | "report-hero" | "report-header" | "report-closing";
  className?: string;
}) {
  const logo = resolveBrandLogo(branding);
  if (!logo) return null;
  return <img className={className} src={logo.src} alt={logo.alt}
    data-brand-profile={branding!.profile} data-brand-role={role} data-brand-audit="true"
    data-logo-contains-institution-name={(logo.containsInstitutionName ?? true) ? "true" : "false"}
    data-editor-lock="true" />;
}
