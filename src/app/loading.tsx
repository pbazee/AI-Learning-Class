export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#02040a]">
      <div className="relative h-20 w-20 sm:h-24 sm:w-24">
        {[0, 0.7, 1.4, 2.1].map((delay, index) => (
          <span
            key={delay}
            className="loading-ripple-ring absolute left-1/2 top-1/2 block rounded-full border border-cyan-400/70"
            style={{
              animationDelay: `${delay}s`,
              width: index === 0 ? "2.5rem" : "3rem",
              height: index === 0 ? "2.5rem" : "3rem",
            }}
          />
        ))}
      </div>
    </div>
  );
}
