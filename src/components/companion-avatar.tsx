import clsx from "clsx";
import Image from "next/image";
import { companionSprite, getCompanion } from "@/domain/companions";

export function CompanionAvatar({
  id,
  size = 64,
  className,
  float = false,
  style,
}: {
  id: string;
  size?: number;
  className?: string;
  float?: boolean;
  style?: React.CSSProperties;
}) {
  const companion = getCompanion(id);
  return (
    <Image
      src={companionSprite(companion)}
      alt={companion.name}
      width={size}
      height={size}
      className={clsx("pixelated select-none", float && "animate-float", className)}
      style={style}
      unoptimized
    />
  );
}
