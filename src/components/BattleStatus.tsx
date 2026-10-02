import { BookOpen, Diamond } from '@phosphor-icons/react';
import type { Side } from '../game/types';
import { QiMeter } from './QiMeter';

export function BattleStatus({
  side,
  finished = false,
  enemyQi,
  onOpenLog,
}: {
  side: Side;
  finished?: boolean;
  enemyQi: number;
  onOpenLog: () => void;
}) {
  return (
    <header className="battle-status" aria-label="对局状态">
      <div className={`turn-marker turn-marker-${side}`}>
        <Diamond className="turn-marker-diamond" size={12} weight="fill" aria-hidden />
        <span>{finished ? '对局结束' : side === 'red' ? '红方回合' : '黑方回合'}</span>
      </div>

      <div className="battle-status-enemy-qi">
        <QiMeter side="black" qi={enemyQi} label="敌方战气" />
      </div>

      <button type="button" className="battle-status-log" onClick={onOpenLog} aria-label="打开战斗记录">
        <BookOpen className="battle-status-log-seal" size={31} weight="duotone" aria-hidden />
        <span>记录</span>
      </button>
    </header>
  );
}
