import { useEffect, useRef } from 'react';
import type { Side } from '../game/types';

export function BattleLogPanel({
  open,
  onToggle,
  onClose,
  log,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  log: { text: string; side: Side }[];
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, log.length]);

  return (
    <div className={`battle-log${open ? ' battle-log-open' : ''}`}>
      <button
        type="button"
        className="battle-log-tab"
        aria-expanded={open}
        aria-controls="battle-log-panel"
        onClick={onToggle}
      >
        记录
      </button>

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
            <button type="button" className="battle-log-header" onClick={onClose}>
              <span className="battle-log-title">战报</span>
              <span className="battle-log-close" aria-hidden>
                收起
              </span>
            </button>
            <div className="battle-log-list">
              {log.length === 0 ? (
                <div className="battle-log-empty">暂无记录</div>
              ) : (
                log.map((line, i) => (
                  <div
                    key={`${i}-${line.side}-${line.text}`}
                    className={`battle-log-entry battle-log-entry-${line.side}`}
                  >
                    {line.text}
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
