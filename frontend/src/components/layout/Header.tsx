export default function Header() {
  return (
    <header className="bg-bg-secondary border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Kalshi Weather Trading Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 rounded bg-bg-tertiary hover:bg-gray-700 text-text-primary transition-colors"
            title="Settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
    </header>
  );
}
