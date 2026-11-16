interface AtlasMarkProps {
  size?: number;
  /** Shows the ring turning around the logo (loading, Atlas is answering). */
  busy?: boolean;
  className?: string;
  label?: string;
}

/**
 * The Atlas logo as an avatar (Ask Atlas) and as the loading indicator: a
 * light ring turns around the logo while something is in progress. Static
 * ring under prefers-reduced-motion (rules in index.css, `.atlas-mark`).
 */
export function AtlasMark({ size = 32, busy = false, className = '', label }: AtlasMarkProps) {
  return (
    <span
      className={`atlas-mark ${busy ? 'is-busy' : ''} ${className}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="atlas-mark-ring" />
      <img src="/branding/atlas-logo.png" alt="" width={size} height={size} draggable={false} />
    </span>
  );
}
