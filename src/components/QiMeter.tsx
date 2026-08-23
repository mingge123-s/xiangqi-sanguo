import { QI_MAX } from '../game/types';
import type { Side } from '../game/types';

export function QiMeter({
  side,
  qi,
  label,
  className = '',
}: {
  side: Side;
  qi: number;
  label: string;
  className?: string;
}) {
  const value = Math.min(QI_MAX, Math.max(0, qi));

  return (
    <div
      className={`qi-meter qi-meter-${side}${className ? ` ${className}` : ''}`}
      aria-label={`${label} ${value}/${QI_MAX}`}
    >
      <div className="qi-meter-summary">
        <span className="qi-meter-label">{label}</span>
        <strong className="qi-meter-value">
          {value}<small>/{QI_MAX}</small>
        </strong>
      </div>
      <span className="qi-meter-track" aria-hidden>
        {Array.from({ length: QI_MAX }, (_, index) => (
          <span key={index} className={index < value ? 'qi-dot qi-dot-filled' : 'qi-dot'} />
        ))}
      </span>
    </div>
  );
}
