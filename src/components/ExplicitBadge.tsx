/**
 * Компонент для отображения значка Explicit (E) для треков с ненормативной лексикой
 * Дизайн основан на Spotify/Apple Music
 */

interface ExplicitBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ExplicitBadge({ className = '', size = 'md' }: ExplicitBadgeProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizes = {
    sm: 'text-[4px]',
    md: 'text-[4.5px]',
    lg: 'text-[5px]'
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-[#6a6a6a] text-[#1a1a1a] font-normal leading-none ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: '#6a6a6a',
        color: '#1a1a1a',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Explicit Content"
      aria-label="Explicit Content"
    >
      <span
        style={{
          fontWeight: 600,
          lineHeight: 1,
          transform: 'scale(0.65, 0.55)',
          display: 'inline-block',
          letterSpacing: '-0.02em',
        }}
        className={textSizes[size]}
      >
        E
      </span>
    </span>
  );
}

