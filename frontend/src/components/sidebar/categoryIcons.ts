import {
  Activity,
  Boxes,
  Cpu,
  Database,
  MessagesSquare,
  Network,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { ComponentCategory } from "@/types/architecture";

export const CATEGORY_ICONS: Record<ComponentCategory, LucideIcon> = {
  networking: Network,
  compute: Cpu,
  storage: Database,
  messaging: MessagesSquare,
  services: Boxes,
  observability: Activity,
  security: ShieldCheck,
  unknown: Boxes,
};
