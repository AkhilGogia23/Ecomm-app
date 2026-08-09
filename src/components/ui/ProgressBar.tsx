import { cn } from "@/lib/cn";

export default function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  className,
}: {
  value: number;
  max?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-800"
      >
        <div
          className="h-full rounded-full bg-black transition-all duration-300 dark:bg-white"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">{Math.round(percent)}%</p>
      )}
    </div>
  );
}
