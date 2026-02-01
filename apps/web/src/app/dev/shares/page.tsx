'use client';

import { useState } from 'react';

// Direct imports from game apps
import { generateShareExample as dabbleShare } from '../../../../../dabble/src/lib/shareExample';
import { generateShareExample as jumbleShare } from '../../../../../jumble/src/lib/shareExample';
import { generateShareExample as caromShare } from '../../../../../carom/src/lib/shareExample';
import { generateShareExample as edgewiseShare } from '../../../../../edgewise/src/lib/shareExample';

interface ShareCardProps {
  gameName: string;
  shareText: string;
}

function ShareCard({ gameName, shareText }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{gameName}</h2>
        <button
          onClick={handleCopy}
          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-900 p-3 rounded">
        {shareText}
      </pre>
    </div>
  );
}

export default function DevSharesPage() {
  // Only accessible in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400">This page is only available in development.</p>
      </div>
    );
  }

  const shares = [
    { name: 'Dabble', text: dabbleShare() },
    { name: 'Jumble', text: jumbleShare() },
    { name: 'Carom', text: caromShare() },
    { name: 'Edgewise', text: edgewiseShare() },
  ];

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-purple-400">Share Format Preview</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Dev tool for previewing share text formats
          </p>
        </header>

        {shares.map((share) => (
          <ShareCard key={share.name} gameName={share.name} shareText={share.text} />
        ))}
      </div>
    </main>
  );
}
