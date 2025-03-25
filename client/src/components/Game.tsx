import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { DuelScene } from '../game/scenes/DuelScene';
import { PreloadScene } from '../game/scenes/PreloadScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  scene: [PreloadScene, DuelScene],
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};

export default function Game() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Make sure we're in the browser and the container exists
    if (typeof window === 'undefined' || !containerRef.current) {
      return;
    }

    try {
      // Only create a new game if one doesn't exist
      if (!gameRef.current) {
        gameRef.current = new Phaser.Game({
          ...config,
          parent: containerRef.current
        });
      }

      // Cleanup function
      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      id="game-container" 
      className="w-full h-full flex items-center justify-center"
      style={{ minHeight: '600px' }}
    />
  );
} 