// PremiumPhotoPlaceholder.tsx
// Shared photo helper for premium templates.
// Shows the user's photo if present; falls back to a person silhouette SVG.

interface Props {
  src: string | undefined;
  size: number;
  shape: 'circle' | 'rect';
  border?: string;
}

export function PremiumPhotoPlaceholder({ src, size, shape, border }: Props) {
  const radius = shape === 'circle' ? '50%' : '4px';
  const style: React.CSSProperties = {
    width: size,
    height: shape === 'rect' ? Math.round(size * 1.25) : size,
    borderRadius: radius,
    objectFit: 'cover',
    display: 'block',
    flexShrink: 0,
    border: border ?? 'none',
    background: '#e2e8f0',
  };

  if (src) {
    return <img src={src} alt="" style={style} />;
  }

  // Fallback silhouette
  const h = shape === 'rect' ? Math.round(size * 1.25) : size;
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#cbd5e1',
      }}
    >
      <svg
        width={size * 0.55}
        height={h * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" fill="#94a3b8" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" fill="#94a3b8" />
      </svg>
    </div>
  );
}
