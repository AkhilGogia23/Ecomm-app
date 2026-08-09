import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardBody } from "./Card";
import { cn } from "@/lib/cn";

interface StatsCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  change?: number;
}

export default function StatsCard({ label, value, icon, change }: StatsCardProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <Card>
      <CardBody className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-neutral-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {typeof change === "number" && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-gray-100 p-2.5 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
            {icon}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
