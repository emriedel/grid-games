'use client';

interface CenterButtonProps {
  onRotate: () => void;
  disabled?: boolean;
}

export function CenterButton({ onRotate, disabled }: CenterButtonProps) {
  return (
    <button
      onClick={onRotate}
      disabled={disabled}
      className={`
        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-12 h-12 sm:w-14 sm:h-14
        rounded-full
        bg-[var(--accent)] text-[var(--accent-foreground)]
        flex items-center justify-center
        shadow-lg
        transition-all duration-150
        z-10
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}
      `}
      aria-label="Rotate all squares clockwise"
    >
      {/* Clockwise rotation arrow icon */}
      <svg
        className="w-6 h-6 sm:w-7 sm:h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Arrowhead pointing right at top */}
        <path d="M21 2v6h-6" />
        {/* Arc curving around clockwise from top-right */}
        <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
      </svg>
    </button>
  );
}
