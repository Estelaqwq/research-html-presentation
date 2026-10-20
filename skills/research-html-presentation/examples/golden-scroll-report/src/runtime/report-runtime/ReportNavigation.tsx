import type { ReportSection } from "./ReportRuntime";

export function ReportNavigation({ id, label, sections, activeId, open, onNavigate, onClose }: {
  id: string;
  label: string;
  sections: ReportSection[];
  activeId: string;
  open: boolean;
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className={`report-navigation-shell ${open ? "is-open" : ""}`} data-report-navigation="true" data-editor-lock="true">
      <nav id={id} className="report-navigation" aria-label={label}>
        <div className="report-navigation-head"><b>{label}</b><button type="button" onClick={onClose} aria-label="关闭报告目录">×</button></div>
        <ol>
          {sections.map((section, index) => (
            <li key={section.id}>
              <button type="button" data-report-nav-item={section.id} aria-current={activeId === section.id ? "location" : undefined} onClick={() => onNavigate(section.id)}>
                <span>{String(index + 1).padStart(2, "0")}</span><b>{section.chapter}</b><small>{section.title}</small>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
