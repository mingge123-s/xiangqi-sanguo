import { useEffect, useRef } from 'react';
import type { Side } from '../game/types';

export function BattleLogPanel({
  open,
  onClose,
  log,
}: {
  open: boolean;
  onClose: () => void;
  log: { text: string; side: Side }[];
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, log.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  return (
    <div className={`battle-log${open ? ' battle-log-open' : ''}`}>
      {open && (
        <>
          <button
            type="button"
            className="battle-log-backdrop"
            aria-label="关闭战报"
            onClick={onClose}
          />
          <div
            id="battle-log-panel"
            className="battle-log-panel"
            role="dialog"
            aria-label="战斗记录"
          >
            <div className="battle-log-header">
              <div className="battle-log-heading">
                <span className="battle-log-kicker">行军纪要</span>
                <span className="battle-log-title">战报</span>
              </div>
              <span className="battle-log-count" aria-label={`共 ${log.length} 条记录`}>
                {String(log.length).padStart(2, '0')}
              </span>
              <button type="button" className="battle-log-close" onClick={onClose} autoFocus>
                收起
              </button>
            </div>
            <div className="battle-log-list">
              {log.length === 0 ? (
                <div className="battle-log-empty">暂无记录</div>
              ) : (
                log.map((line, i) => (
                  <div
                    key={`${i}-${line.side}-${line.text}`}
                    className={`battle-log-entry battle-log-entry-${line.side}`}
                  >
                    <span className="battle-log-index" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                    <span className="battle-log-entry-copy">
                      <span className="battle-log-side">{line.side === 'red' ? '我方' : '敌方'}</span>
                      <span>{line.text}</span>
                    </span>
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
