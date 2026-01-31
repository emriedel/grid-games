import Image from 'next/image';
import Link from 'next/link';

interface GameCard {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  icon?: string;
  href: string;
}

const games: GameCard[] = [
  {
    id: 'dabble',
    name: 'Dabble',
    description: 'Place tiles to form words and get a high score on a unique daily board',
    accentColor: '#c41e3a', // red
    icon: '/icons/dabble.png',
    href: '/dabble',
  },
  {
    id: 'jumble',
    name: 'Jumble',
    description: 'Find as many words as you can before time runs out',
    accentColor: '#4a5d7a', // blue
    icon: '/icons/jumble.png',
    href: '/jumble',
  },
  {
    id: 'edgewise',
    name: 'Edgewise',
    description: 'Rotate tiles to match words with their categories',
    accentColor: '#a855f7', // purple
    icon: '/icons/edgewise.png',
    href: '/edgewise',
  },
  {
    id: 'carom',
    name: 'Carom',
    description: 'Navigate pieces across the board to reach the goal in the fewest moves',
    accentColor: '#f59e0b', // amber
    icon: '/icons/carom.png',
    href: '/carom',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Image src="/icon.png" alt="Nerdcube" width={48} height={48} />
            <h1 className="text-3xl font-bold">Nerdcube Games</h1>
          </div>
          <p className="text-[var(--muted)]">Daily Games by Eric Riedel</p>
        </header>

        {/* Game List */}
        <div className="divide-y divide-[var(--border)]">
          {games.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="flex items-center gap-4 py-5 group"
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                {game.icon ? (
                  <Image
                    src={game.icon}
                    alt={`${game.name} icon`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-bold text-black"
                    style={{ backgroundColor: game.accentColor }}
                  >
                    {game.name[0]}
                  </div>
                )}
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
