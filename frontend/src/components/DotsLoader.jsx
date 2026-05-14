// Simple rotating border spinner — muted ring with one accent arc on top.
// Color comes from currentColor, so pass via className="text-[#bc8cff]" etc.
// Note: the original implementation was a 12-dot pulse ring; this is now a
// single circular border spinner used app-wide. Kept the file/component name
// to avoid churning every import.
export default function DotsLoader({ size = 16, className = '' }) {
  const thickness = Math.max(1.5, Math.round(size / 8));
  return (
    <span
      className={`inline-block rounded-full animate-spin ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.18)',
        borderTopColor: 'currentColor',
      }}
    />
  );
}
