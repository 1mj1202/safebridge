// 위험·날씨 아이콘 (Lucide 선 아이콘 — 다른 화면 아이콘과 같은 스타일)
import { ArrowDownFromLine, ArrowDownToLine, CloudRain, Cog, Layers, Snowflake, SquareDashed, Wind, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  fall: ArrowDownToLine,
  opening: SquareDashed,
  drop: ArrowDownFromLine,
  collapse: Layers,
  caught: Cog,
  wind: Wind,
  rain: CloudRain,
  cold: Snowflake,
};

export default function Pictogram({ name, className = "" }: { name: string | null; className?: string }) {
  const Icon = name ? ICONS[name] : undefined;
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
