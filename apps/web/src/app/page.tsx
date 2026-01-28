import Image from 'next/image';
import Link from 'next/link';

interface GameCard {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  icon: string;
  href: string;
}

const games: GameCard[] = [
  {
    id: 'dabble',
    name: 'Dabble',
    description: 'Place tiles to form words and maximize your score on a unique daily board.',
    accentColor: '#c41e3a', // red
    icon: '/icons/dabble.png',
    href: '/dabble',
  },
  {
    id: 'jumble',
    name: 'Jumble',
    description: 'Find as many words as you can by connecting adjacent letters before time runs out.',
    accentColor: '#4a5d7a', // blue
    icon: '/icons/jumble.png',
    href: '/jumble',
  },
  {
    id: 'edgewise',
    name: 'Edgewise',
    description: 'Rotate tiles to match word pairs with categories in this daily puzzle.',
    accentColor: '#a855f7', // purple
    icon: '/icons/edgewise.png',
    href: '/edgewise',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold">The Grid</h1>
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
                <Image
                  src={game.icon}
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
