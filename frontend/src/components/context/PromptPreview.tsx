import { FileText } from "lucide-react";

import { PanelEmptyState } from "@/components/context/PanelEmptyState";

const PROMPT_SECTIONS = [
  "Requirements",
  "Current architecture",
  "Traffic & data flow",
  "Review dimensions",
];

export function PromptPreview() {
  return (
    <PanelEmptyState icon={FileText} tone="violet" title="No prompt yet">
      Once the prompt system ships in Phase&nbsp;P4, Cistem compiles your architecture into a
      structured system-design prompt. It will include:
      <div className="mt-4 w-full rounded-xl border border-border bg-surface-secondary/60 p-3 text-left">
        <ul className="space-y-2">
          {PROMPT_SECTIONS.map((section) => (
            <li key={section} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/60" aria-hidden />
              <span className="font-mono text-caption text-text-secondary">{section}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </PanelEmptyState>
  );
}
