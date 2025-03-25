'use client';

import dynamic from 'next/dynamic';

const Game = dynamic(() => import('./Game'), {
  ssr: false,
});

export default function GameWrapper() {
  return (
    <div className="aspect-video w-full">
      <Game />
    </div>
  );
} 