export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 nebula-glow" />
      <div className="absolute inset-0 stars-sm animate-twinkle-slow" />
      <div className="absolute inset-0 stars-lg animate-twinkle" />
      <div className="absolute -inset-x-[200px] -inset-y-[120px] stars-sm opacity-60 animate-drift" />
    </div>
  )
}
