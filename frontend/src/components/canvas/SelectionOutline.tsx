import { cn } from "@/lib/utils";

type SelectionOutlineProps = {
  selected: boolean;
  shape?: "rect" | "ellipse";
};

/** The single selection treatment shared by every canvas node. */
export function SelectionOutline({ selected, shape = "rect" }: SelectionOutlineProps) {
  if (!selected) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-1.5 border-2 border-accent",
        shape === "ellipse" ? "rounded-full" : "rounded-xl",
      )}
    />
  );
}
