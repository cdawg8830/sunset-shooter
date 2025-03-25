import dynamic from 'next/dynamic';

// Dynamically import the Game component with SSR disabled
const Game = dynamic(() => import('@/components/Game'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-2xl text-white">Loading game...</div>
        </div>
    ),
});

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-4xl">
                <h1 className="text-4xl font-bold text-center mb-8 text-white">Quick Draw Duel</h1>
                <div className="w-full h-[600px] bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
                    <Game />
                </div>
            </div>
        </main>
    );
}
