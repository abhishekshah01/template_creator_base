export default function DotsLoader({ size = 16, dotSize = 2, className = '' }) {
  const radius = (size - dotSize) / 2;
  return (
    <span className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
        animation: 'dotsLoaderPulse 1.2s ease-in-out infinite',
      }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i}
          className="absolute top-0 left-1/2 rounded-full bg-current"
          style={{
            width: dotSize,
            height: dotSize,
            marginLeft: -dotSize / 2,
            transformOrigin: `50% ${radius + dotSize / 2}px`,
            transform: `rotate(${i * 30}deg)`,
          }} />
      ))}
      <style>{`@keyframes dotsLoaderPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.4); } }`}</style>
    </span>
  );
}
