import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../ui/utils";
import { usePrefs } from "../../context/PrefsContext";

export function StarRating({
  value, onChange, size = 18, readOnly = true, showValue = false, count,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  showValue?: boolean;
  count?: number;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const { t } = usePrefs();

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = display >= i;
          const half = !filled && display >= i - 0.5;
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(i)}
              onMouseEnter={() => !readOnly && setHover(i)}
              className={cn("relative", !readOnly && "cursor-pointer transition-transform hover:scale-110")}
            >
              <Star style={{ width: size, height: size }} className="text-slate-200" fill="currentColor" strokeWidth={0} />
              {(filled || half) && (
                <Star
                  style={{ width: size, height: size, clipPath: half ? "inset(0 50% 0 0)" : undefined }}
                  className="absolute inset-0 text-amber-400" fill="currentColor" strokeWidth={0}
                />
              )}
            </button>
          );
        })}
      </div>
      {showValue && value > 0 && <span className="text-sm text-foreground">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-sm text-muted-foreground">({count === 1 ? t("car.reviewsCount_one", { count: 1 } as never) : t("car.reviewsCount_other", { count } as never)})</span>}
    </div>
  );
}
