import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from '@phosphor-icons/react';
import type { Side } from '../game/types';
import { useDialogFocus } from './useDialogFocus';
import './interaction-polish.css';

export function BattleLogPanel({
  open,
  onClose,
  log,
}: {
  open: boolean;
  onClose: () => void;
  log: { text: string; side: Side }[];
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useDialogFocus(open, onClose);
  const followLatest = useRef(true);
  const wasOpen = useRef(false);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [hasNewEntries, setHasNewEntries] = useState(false);

  const scrollToLatest = () => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    followLatest.current = true;
    setAwayFromLatest(false);
    setHasNewEntries(false);
  };

  useLayoutEffect(() => {
    if (open) {
      if (!wasOpen.current || followLatest.current) scrollToLatest();
      else setHasNewEntries(true);
    }
    wasOpen.current = open;
  }, [open, log.length]);

  return (
    <div className={`battle-log${open ? ' battle-log-open' : ''}`}>
      {open && (
        <>
          <button
            type="button"
            className="battle-log-backdrop"
            aria-label="关闭战报"
            onClick={onClose}
            tabIndex={-1}
          />
          <div
            id="battle-log-panel"
            ref={dialogRef}
            className="battle-log-panel"
            role="dialog"
            aria-modal="true"
            aria-label="战斗记录"
            tabIndex={-1}
          >
            <div className="battle-log-header">
              <div className="battle-log-heading">
                <span className="battle-log-kicker">行军纪要</span>
                <span className="battle-log-title">战报</span>
              </div>
              <span className="battle-log-count" aria-label={`共 ${log.length} 条记录`}>
                {String(log.length).padStart(2, '0')}
              </span>
              <button type="button" className="battle-log-close" onClick={onClose} data-dialog-initial-focus>
                收起
              </button>
            </div>
            <div
              className="battle-log-list"
              ref={listRef}
              tabIndex={0}
              role="region"
              aria-label="战报内容，可上下滚动查看"
              onScroll={(event) => {
                const list = event.currentTarget;
                const nearBottom = list.scrollHeight - list.clientHeight - list.scrollTop < 32;
                followLatest.current = nearBottom;
                setAwayFromLatest(!nearBottom);
                if (nearBottom) setHasNewEntries(false);
              }}
            >
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
            </div>
            {awayFromLatest && (
              <button
                type="button"
                className="battle-log-latest"
                onClick={() => {
                  scrollToLatest();
                  listRef.current?.focus({ preventScroll: true });
                }}
              >
                {hasNewEntries && <span className="battle-log-latest-notice" role="status">有新战报</span>}
                回到最新 <ArrowDown size={14} weight="bold" aria-hidden />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
