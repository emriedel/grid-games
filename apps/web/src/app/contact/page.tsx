'use client';

import { useState } from 'react';
import { HamburgerMenu, useGameCompletion, useBugReporter } from '@grid-games/ui';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const completionStatus = useGameCompletion();
  const bugReporter = useBugReporter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setErrorMessage('Please enter a message');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('error');
      setErrorMessage('Failed to send. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative">
      {/* Menu button */}
      <div className="absolute top-4 left-4 z-10">
        <HamburgerMenu completionStatus={completionStatus} onReportBug={bugReporter.open} />
      </div>

      <div className="max-w-md mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <img
              src="https://nerdcube.games/icon.png"
              alt="Nerdcube"
              className="w-14 h-14"
            />
          </div>
          <h1 className="text-2xl font-bold">Contact</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Feedback, suggestions, or questions
          </p>
        </header>

        {status === 'success' ? (
          <div className="bg-[var(--card-bg,#18181b)] rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">&#10003;</div>
            <h2 className="text-lg font-semibold mb-2">Message Sent</h2>
            <p className="text-[var(--muted)] text-sm mb-4">
              Thanks for reaching out! I&apos;ll get back to you soon.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
                Name <span className="text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[var(--card-bg,#18181b)] border border-[var(--border,#27272a)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--foreground)]"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
                Email <span className="text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-[var(--card-bg,#18181b)] border border-[var(--border,#27272a)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--foreground)]"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                className="w-full bg-[var(--card-bg,#18181b)] border border-[var(--border,#27272a)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--foreground)] resize-none"
              />
            </div>

            {/* Error message */}
            {status === 'error' && errorMessage && (
              <p className="text-red-400 text-sm">{errorMessage}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-[var(--foreground)] text-[var(--background)] font-semibold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
          >
            &larr; Back to games
          </a>
        </div>
      </div>
    </main>
  );
}
