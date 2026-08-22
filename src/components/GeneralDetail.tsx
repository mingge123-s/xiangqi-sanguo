import { useEffect } from 'react';
import { FACTION_COLOR } from '../game/types';
import type { GeneralRuntime } from '../game/types';
import { skillPhaseOf, skillTypeLabel } from '../game/generals';

function portraitSrc(id: string): string {
  return `${import.meta.env.BASE_URL}generals/${id}.webp`;
}

export function GeneralDetail({
  general,
  onClose,
  onCast,
  canCast,
  liveState,
}: {
  general: GeneralRuntime;
  onClose: () => void;
  onCast?: (skillId: string) => void;
  canCast?: (skillId: string) => boolean;
  liveState?: (skillId: string) => string | null;
}) {
  const color = FACTION_COLOR[general.faction];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="general-detail-layer" onClick={onClose}>
      <div className="general-detail-backdrop" />
      <div
        className="general-detail-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="general-detail-title"
      >
        <div className="general-detail-header">
          <div
            className="general-detail-portrait"
            style={{ borderColor: color, backgroundColor: color }}
          >
            <img
              src={portraitSrc(general.id)}
              alt={general.name}
              className="general-detail-portrait-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="general-detail-heading">
            <div id="general-detail-title" className="general-detail-name">{general.name}</div>
            <div className="general-detail-title">{general.title}</div>
          </div>
          <button type="button" onClick={onClose} className="general-detail-close" autoFocus>关闭</button>
        </div>
        <div className="general-detail-skills">
          {general.skills.map((sk) => {
            const nature = skillTypeLabel(sk);
            const phase = skillPhaseOf(sk);
            const live = liveState?.(sk.id) ?? null;
            const natureColor =
              nature === '限定技' ? '#a67c2a' : nature === '主动技' ? '#2a2218' : '#8a7349';
            return (
              <article key={sk.id} className="general-detail-skill">
                <div className="general-detail-skill-head">
                  {nature && (
                    <span
                      className="skill-badge"
                      style={{ color: natureColor }}
                    >
                      {nature}
                    </span>
                  )}
                  {phase && (
                    <span
                      className="skill-badge skill-badge-phase"
                      style={{ color: '#2c4a7c' }}
                    >
                      {phase}
                    </span>
                  )}
                  <h3>{sk.name}</h3>
                </div>
                {sk.qiCost != null && sk.qiCost > 0 && (
                  <div className="general-detail-cost">消耗 {sk.qiCost} 战气</div>
                )}
                <p className="general-detail-desc">{sk.desc}</p>
                {live && (
                  <p className="general-detail-live">{live}</p>
                )}
                {canCast?.(sk.id) && (
                  <button
                    type="button"
                    onClick={() => onCast?.(sk.id)}
                    className="general-detail-cast"
                  >
                    发动
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
