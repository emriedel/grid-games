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
      {/* Clockwise arrow icon */}
      <svg
        className="w-6 h-6 sm:w-7 sm:h-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 4v5h-5M4 20v-5h5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 9a9 9 0 0 0-15.36-5.36L4 4M4 15a9 9 0 0 0 15.36 5.36L20 20"
        />
      </svg>
    </button>
  );
}
