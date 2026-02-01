'use client';

interface DebugButtonProps {
  onClick: () => void;
  label?: string;
}

/**
 * Debug button for triggering dev-only actions
 * Purple styling to indicate debug functionality
 */
export function DebugButton({ onClick, label = 'New Puzzle' }: DebugButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
    >
      {label}
    </button>
  );
}
