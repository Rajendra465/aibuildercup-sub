/** Fixed, animated brand backdrop: drifting amber / violet / azure light over deep navy, plus a faint grid. */
export function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div className="absolute -top-[20vh] -left-[10vw] size-[70vmax] rounded-full bg-azure/25 blur-[140px] animate-aurora-a" />
      <div className="absolute -right-[15vw] top-[30vh] size-[60vmax] rounded-full bg-violet/25 blur-[150px] animate-aurora-b" />
      <div className="absolute bottom-[-30vh] left-[20vw] size-[55vmax] rounded-full bg-amber/15 blur-[160px] animate-aurora-c" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(0_0_0/0.55)_100%)]" />
    </div>
  );
}
