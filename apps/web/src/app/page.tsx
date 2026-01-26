import Link from 'next/link';

interface GameCard {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  emoji: string;
  href: string;
}

const games: GameCard[] = [
  {
    id: 'dabble',
    name: 'Dabble',
    description: 'Place tiles to form words and maximize your score on a unique daily board.',
    accentColor: '#f59e0b', // amber
    emoji: '🔤',
    href: '/dabble',
  },
  {
    id: 'jumble',
    name: 'Jumble',
    description: 'Find as many words as you can by connecting adjacent letters before time runs out.',
    accentColor: '#e94560', // red/pink
    emoji: '⏱️',
    href: '/jumble',
  },
  {
    id: 'edgewise',
    name: 'Edgewise',
    description: 'Rotate tiles to match word pairs with categories in this daily puzzle.',
    accentColor: '#a855f7', // purple
    emoji: '🔄',
    href: '/edgewise',
  },
];

export default function Home() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">The Grid</h1>
          <p className="text-[var(--muted)] text-lg">Daily Word Games</p>
          <p className="text-[var(--muted)] text-sm mt-4">{today}</p>
        </header>

        {/* Game Cards */}
        <div className="grid gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="
                block p-6 rounded-xl
                bg-[var(--card-bg)] hover:bg-[var(--card-hover)]
                border border-[var(--border)]
                transition-colors
                group
              "
            >
              <div className="flex items-start gap-4">
                <div
                  className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: game.accentColor + '20' }}
                >
                  {game.emoji}
                </div>
                <div className="flex-1">
                  <h2
                    className="text-xl font-bold mb-1 group-hover:underline"
                    style={{ color: game.accentColor }}
                  >
                    {game.name}
                  </h2>
                  <p className="text-[var(--muted)] text-sm leading-relaxed">
                    {game.description}
                  </p>
                </div>
                <div className="text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-[var(--muted)] text-sm">
          <p>New puzzles every day at midnight</p>
        </footer>
      </div>
    </main>
  );
}
