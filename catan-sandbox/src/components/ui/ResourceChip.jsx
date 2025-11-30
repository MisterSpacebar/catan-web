import React from "react";
import PropTypes from "prop-types";
import { getResourceEmoji, getResourceLabel, getResourceColor } from "../../lib/colors";
import { cn } from "../../lib/utils";

/**
 * Resource chip with emoji and count
 */
export function ResourceChip({ resource, count, showLabel = false, size = "md", className }) {
  const emoji = getResourceEmoji(resource);
  const label = getResourceLabel(resource);
  
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-sm px-2 py-1 gap-1.5",
    lg: "text-base px-2.5 py-1.5 gap-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md bg-black/20",
        sizeClasses[size],
        className
      )}
    >
      <span className={size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base"}>
        {emoji}
      </span>
      <span className="font-medium text-slate-300">{count}</span>
      {showLabel && (
        <span className="text-slate-500 text-[0.85em]">{label}</span>
      )}
    </div>
  );
}

ResourceChip.propTypes = {
  resource: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

/**
 * Resource grid showing all resources for a player
 */
export function ResourceGrid({ resources, size = "sm", className }) {
  const resourceList = ["wood", "brick", "wheat", "sheep", "ore"];
  
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {resourceList.map((resource) => {
        const count = resources?.[resource] || 0;
        return (
          <ResourceChip
            key={resource}
            resource={resource}
            count={count}
            size={size}
          />
        );
      })}
    </div>
  );
}

ResourceGrid.propTypes = {
  resources: PropTypes.object,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

/**
 * Compact resource summary
 */
export function ResourceSummary({ resources, className }) {
  const total = Object.values(resources || {}).reduce((a, b) => a + b, 0);
  const entries = Object.entries(resources || {}).filter(([, v]) => v > 0);
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {entries.length === 0 ? (
        <span className="text-xs text-slate-600">No resources</span>
      ) : (
        entries.map(([resource, count]) => (
          <span key={resource} className="text-sm" title={`${getResourceLabel(resource)}: ${count}`}>
            {getResourceEmoji(resource)}
          </span>
        ))
      )}
      <span className="text-xs text-slate-500 ml-1">({total})</span>
    </div>
  );
}

ResourceSummary.propTypes = {
  resources: PropTypes.object,
  className: PropTypes.string,
};

export default { ResourceChip, ResourceGrid, ResourceSummary };

