'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from '@/game/config';

export default function Game() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initGame = async () => {
            if (typeof window === 'undefined') {
                return;
            }

            if (!containerRef.current) {
                setError('Game container not found');
                return;
            }

            if (gameRef.current) {
                return;
            }

            try {
                const config = {
                    ...gameConfig,
                    parent: containerRef.current,
                };

                console.log('Initializing Phaser with config:', config);
                gameRef.current = new Phaser.Game(config);
            } catch (error) {
                console.error('Failed to initialize game:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize game');
            }
        };

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(initGame, 100);

        return () => {
            clearTimeout(timeoutId);
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-red-900">
                <div className="text-white text-center">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full flex items-center justify-center bg-slate-800"
        />
    );
} 