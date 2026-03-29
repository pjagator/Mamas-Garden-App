export default function App() {
  return (
    <div className="min-h-screen bg-cream p-8">
      <h1 className="font-display text-3xl font-bold text-primary mb-4">
        Tampa Garden
      </h1>
      <p className="font-body text-ink-mid mb-4">
        The botanical journal aesthetic, now in React.
      </p>
      <div className="rounded-[--radius-card] bg-white p-4 shadow-md">
        <h2 className="font-display text-xl font-medium text-primary mb-2">Firebush</h2>
        <p className="text-sm text-ink-mid">Hamelia patens</p>
        <span className="mt-2 inline-block rounded-full bg-sage-light px-3 py-1 text-xs text-primary font-medium">
          Native
        </span>
      </div>
      <button className="mt-4 rounded-[--radius-sm] bg-primary px-6 py-3 text-white font-medium">
        Test Button
      </button>
      <button className="mt-4 ml-2 rounded-[--radius-sm] bg-terra px-6 py-3 text-white font-medium">
        Terracotta
      </button>
    </div>
  )
}
