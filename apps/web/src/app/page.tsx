import Image from 'next/image';
import Link from 'next/link';
import { GAMES, getIconUrl } from '@grid-games/config';

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-10 text-center">
          {/* Icon with subtle glow */}
          <div className="mb-3 flex justify-center">
            <Image
              src="/icon.png"
              alt="Nerdcube"
              width={56}
              height={56}
              className="drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]"
            />
          </div>

          {/* Title with subtle text glow */}
          <h1 className="text-4xl font-bold tracking-tight [text-shadow:0_0_20px_rgba(147,51,234,0.35)]">
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
            <Link
              key={game.id}
              href={game.href}
              className="flex items-center gap-4 py-5 group"
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={getIconUrl(game.id)}
                  alt={`${game.name} icon`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
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
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
