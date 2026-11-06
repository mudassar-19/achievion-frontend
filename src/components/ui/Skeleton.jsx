export default function Skeleton({ className = "", style }) {
  return (
    <div
      className={`shimmer-bg rounded-xl ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonLine({ width = "100%", height = 14, className = "" }) {
  return (
    <div
      className={`shimmer-bg rounded-md ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`shimmer-bg rounded-2xl ${className}`}
      style={{ minHeight: 120 }}
      aria-hidden="true"
    />
  );
}
