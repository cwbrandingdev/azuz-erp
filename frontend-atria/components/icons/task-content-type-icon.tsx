import type { KanbanTaskContentType } from "@/services/types";
import { cn } from "@/lib/utils";

const ICON_COLOR = "#00A67E";

interface TaskContentTypeIconProps {
  type: KanbanTaskContentType;
  className?: string;
  size?: number;
}

export function TaskContentTypeIcon({
  type,
  className,
  size = 14,
}: TaskContentTypeIconProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {type === "static" && (
          <rect
            x="2"
            y="2"
            width="12"
            height="12"
            rx="2.5"
            fill={ICON_COLOR}
          />
        )}
        {type === "carousel" && (
          <>
            <rect
              x="1"
              y="4"
              width="3"
              height="8"
              rx="0.75"
              fill={ICON_COLOR}
              opacity="0.45"
            />
            <rect
              x="5.5"
              y="2"
              width="5"
              height="12"
              rx="1"
              fill={ICON_COLOR}
            />
            <rect
              x="12"
              y="4"
              width="3"
              height="8"
              rx="0.75"
              fill={ICON_COLOR}
              opacity="0.45"
            />
          </>
        )}
        {type === "video_with_script" && (
          <>
            <rect
              x="2"
              y="4.5"
              width="12"
              height="9"
              rx="2"
              fill={ICON_COLOR}
            />
            <path d="M7 7.5L10.5 9.5L7 11.5V7.5Z" fill="white" />
            <path
              d="M3 2.5H13V5H3V2.5Z"
              fill={ICON_COLOR}
            />
            <path
              d="M4.5 2.5L5.5 5M7 2.5L8 5M9.5 2.5L10.5 5"
              stroke="white"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          </>
        )}
        {type === "stories_no_script" && (
          <>
            <circle
              cx="8"
              cy="8"
              r="5.75"
              stroke={ICON_COLOR}
              strokeWidth="1.5"
              strokeDasharray="2.5 2"
              fill="none"
            />
            <rect
              x="6.25"
              y="4.5"
              width="3.5"
              height="7"
              rx="1.25"
              fill={ICON_COLOR}
            />
          </>
        )}
        {type === "presentation" && (
          <>
            <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" fill={ICON_COLOR} />
            <path d="M8 11.5V14" stroke={ICON_COLOR} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M5 14H11" stroke={ICON_COLOR} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M4 6.5H10" stroke="white" strokeWidth="1" strokeLinecap="round" />
            <path d="M4 8.5H8" stroke="white" strokeWidth="1" strokeLinecap="round" />
          </>
        )}
        {type === "document" && (
          <>
            <path
              d="M4 2.5H9.5L13 6V13.5C13 14.05 12.55 14.5 12 14.5H4C3.45 14.5 3 14.05 3 13.5V3.5C3 2.95 3.45 2.5 4 2.5Z"
              fill={ICON_COLOR}
            />
            <path d="M9.5 2.5V6H13" fill="white" opacity="0.85" />
            <path d="M5.5 8.5H10.5M5.5 11H9" stroke="white" strokeWidth="1" strokeLinecap="round" />
          </>
        )}
        {type === "mockup" && (
          <>
            <rect x="4" y="1.5" width="8" height="13" rx="2" fill={ICON_COLOR} />
            <rect x="5.25" y="3.25" width="5.5" height="8" rx="0.5" fill="white" />
            <circle cx="8" cy="12.75" r="0.7" fill="white" />
          </>
        )}
        {type === "print" && (
          <>
            <rect x="3" y="2" width="10" height="4" rx="0.75" fill={ICON_COLOR} />
            <rect x="2" y="6" width="12" height="5" rx="1" fill={ICON_COLOR} />
            <rect x="4.5" y="11" width="7" height="3" rx="0.5" fill={ICON_COLOR} />
            <circle cx="11.25" cy="8.5" r="0.7" fill="white" />
          </>
        )}
      </svg>
    </span>
  );
}
