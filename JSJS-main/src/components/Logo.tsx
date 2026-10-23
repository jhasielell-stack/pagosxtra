interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export function TomatoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tomato body */}
      <circle cx="24" cy="27" r="16" fill="#e91e63" />
      <circle cx="24" cy="27" r="16" fill="url(#tomatoGrad)" />
      {/* Highlight */}
      <ellipse cx="19" cy="22" rx="5" ry="4" fill="#fff" fillOpacity="0.2" />
      {/* Leaves/calyx */}
      <path d="M24 10 C20 10 18 12 18 14 C18 12 16 11 14 12 C16 13 16 15 18 15 C15 15 14 17 14 19 C17 18 19 19 20 21 C20 18 22 16 24 16 C26 16 28 18 28 21 C29 19 31 18 34 19 C34 17 33 15 30 15 C32 15 32 13 34 12 C32 11 30 12 30 14 C30 12 28 10 24 10 Z" fill="#2d6a2e" />
      <defs>
        <radialGradient id="tomatoGrad" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#ff4081" />
          <stop offset="60%" stopColor="#e91e63" />
          <stop offset="100%" stopColor="#ad1457" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function Logo({ size = 40, showText = true, variant = 'light' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-neutral-900';
  const subColor = variant === 'light' ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        <TomatoMark size={size} />
      </div>
      {showText && (
        <div className="min-w-0">
          <h1 className={`text-sm font-bold tracking-tight leading-tight ${textColor}`}>
            Colectivo Tomate
          </h1>
          <p className={`text-[11px] leading-tight ${subColor}`}>
            Pagos Extraordinarios
          </p>
        </div>
      )}
    </div>
  );
}
