import { BookOpen, Diamond } from '@phosphor-icons/react';
import { QI_MAX } from '../game/types';
import type { Side } from '../game/types';

export function BattleStatus({
  side,
  qi,
  onOpenLog,
}: {
  side: Side;
  qi: number;
  onOpenLog: () => void;
}) {
  const value = Math.min(QI_MAX, Math.max(0, qi));

  return (
    <header className="battle-status" aria-label="对局状态">
      <div className={`turn-marker turn-marker-${side}`}>
        <Diamond className="turn-marker-diamond" size={12} weight="fill" aria-hidden />
        <span>{side === 'red' ? '红方回合' : '黑方回合'}</span>
      </div>

      <div className="qi-status" aria-label={`战气 ${value}/${QI_MAX}`}>
        <div className="qi-status-label">
          <span>战气</span>
          <strong>
            {value}<small>/{QI_MAX}</small>
          </strong>
        </div>
        <div className="qi-status-track" aria-hidden>
          {Array.from({ length: QI_MAX }, (_, index) => (
            <span key={index} className={index < value ? 'qi-dot qi-dot-filled' : 'qi-dot'} />
          ))}
        </div>
      </div>

      <button type="button" className="battle-status-log" onClick={onOpenLog} aria-label="打开战斗记录">
        <BookOpen className="battle-status-log-seal" size={31} weight="duotone" aria-hidden />
        <span>记录</span>
      </button>
    </header>
  );
}
