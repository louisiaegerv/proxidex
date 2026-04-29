export function PrismaticOverlay() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          background: `repeating-linear-gradient(
            120deg,
            hsl(0, 100%, 65%) 0%,
            hsl(40, 100%, 65%) 5%,
            hsl(80, 100%, 65%) 10%,
            hsl(140, 100%, 65%) 16%,
            hsl(195, 100%, 65%) 22%,
            hsl(250, 100%, 65%) 28%,
            hsl(300, 100%, 65%) 34%,
            hsl(350, 100%, 65%) 40%,
            hsl(0, 100%, 65%) 46%
          )`,
          backgroundSize: "280% 280%",
          mixBlendMode: "screen",
          opacity: 0.42,
          animation: "prismatic-sweep 3.8s linear infinite",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          background: `linear-gradient(
            132deg,
            transparent 10%,
            rgba(255,255,255,.30) 47%,
            rgba(255,255,255,.06) 56%,
            transparent 92%
          )`,
          backgroundSize: "260% 260%",
          mixBlendMode: "overlay",
          animation: "prismatic-sheen 2.4s ease-in-out infinite alternate",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{
          mixBlendMode: "overlay",
          background: `
            repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0, rgba(255,255,255,.045) 1px, transparent 1px, transparent 5px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0, rgba(255,255,255,.045) 1px, transparent 1px, transparent 5px)
          `,
        }}
      />
    </>
  )
}
