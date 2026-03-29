import ScreenHeader from '@/components/layout/ScreenHeader'

export default function Garden() {
  return (
    <>
      <ScreenHeader title="My Garden" subtitle="3 species cataloged" />
      <div className="p-4">
        <p className="text-ink-mid">Garden inventory will go here.</p>
      </div>
    </>
  )
}
