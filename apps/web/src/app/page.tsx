'use client';

import Image from 'next/image';
import { GAMES, getIconUrl } from '@grid-games/config';
import { HamburgerMenu, CompletionBadge, useGameCompletion } from '@grid-games/ui';

export default function Home() {
  const completionStatus = useGameCompletion();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative">
      {/* Menu button */}
      <div className="absolute top-4 left-4 z-10">
        <HamburgerMenu completionStatus={completionStatus} />
      </div>

      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-10 text-center">
          {/* Icon */}
          <div className="mb-3 flex justify-center">
            <Image
              src="/icon.png"
              alt="Nerdcube"
              width={56}
              height={56}
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight">
            Nerdcube Games
          </h1>

          {/* Styled subtitle */}
          <p className="text-[var(--muted)] text-sm italic mt-1">
            Daily Games by Eric Riedel
          </p>
        </header>

        {/* Game List */}
        <div className="divide-y divide-[var(--border)]">
          {GAMES.map((game) => (
            <a
              key={game.id}
              href={game.href}
              className="flex items-center gap-4 py-5 group"
            >
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={getIconUrl(game.id)}
                  alt={`${game.name} icon`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover rounded-lg"
                />
                <CompletionBadge
                  show={completionStatus.get(game.id) ?? false}
                  size="lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold mb-1 group-hover:underline">
                  {game.name}
                </h2>
                <p className="text-[var(--muted)] text-sm leading-relaxed">
                  {game.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
