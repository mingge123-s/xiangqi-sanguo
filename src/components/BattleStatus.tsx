import { BookOpen, Diamond } from '@phosphor-icons/react';
import { QI_MAX } from '../game/types';
import type { Side } from '../game/types';

function QiLine({
  side,
  qi,
  active,
}: {
  side: Side;
  qi: number;
  active: boolean;
}) {
  const value = Math.min(QI_MAX, Math.max(0, qi));
  const label = side === 'red' ? '红方' : '黑方';

  return (
    <div
      className={`qi-line qi-line-${side}${active ? ' qi-line-active' : ''}`}
      aria-label={`${label}战气 ${value}/${QI_MAX}`}
    >
      <span className="qi-line-side">{side === 'red' ? '红' : '黑'}</span>
      <strong className="qi-line-value">
        {value}<small>/{QI_MAX}</small>
      </strong>
      <span className="qi-line-track" aria-hidden>
        {Array.from({ length: QI_MAX }, (_, index) => (
          <span key={index} className={index < value ? 'qi-dot qi-dot-filled' : 'qi-dot'} />
        ))}
      </span>
    </div>
  );
}

export function BattleStatus({
  side,
  redQi,
  blackQi,
  onOpenLog,
}: {
  side: Side;
  redQi: number;
  blackQi: number;
  onOpenLog: () => void;
}) {
  return (
    <header className="battle-status" aria-label="对局状态">
      <div className={`turn-marker turn-marker-${side}`}>
        <Diamond className="turn-marker-diamond" size={12} weight="fill" aria-hidden />
        <span>{side === 'red' ? '红方回合' : '黑方回合'}</span>
      </div>

      <div className="qi-dual" aria-label="双方战气">
        <QiLine side="red" qi={redQi} active={side === 'red'} />
        <QiLine side="black" qi={blackQi} active={side === 'black'} />
      </div>

      <button type="button" className="battle-status-log" onClick={onOpenLog} aria-label="打开战斗记录">
        <BookOpen className="battle-status-log-seal" size={31} weight="duotone" aria-hidden />
        <span>记录</span>
      </button>
    </header>
  );
}
