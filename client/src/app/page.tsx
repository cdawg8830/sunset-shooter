'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the Game component with SSR disabled
const Game = dynamic(() => import('../components/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black text-white">
      <div className="text-2xl font-mono animate-pulse">Loading game...</div>
    </div>
  )
});

export default function Home() {
  return (
    <div className="w-full h-screen bg-black">
      <Suspense
        fallback={
          <div className="w-full h-screen flex items-center justify-center bg-black text-white">
            <div className="text-2xl font-mono">Loading game...</div>
          </div>
        }
      >
        <Game />
      </Suspense>
    </div>
  );
}
