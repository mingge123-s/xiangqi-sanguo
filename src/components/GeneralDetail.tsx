import { X } from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { FACTION_COLOR } from '../game/types';
import type { GeneralRuntime } from '../game/types';
import { skillPhaseOf, skillTypeLabel } from '../game/generals';
import { useDialogFocus } from './useDialogFocus';
import './interaction-polish.css';

const FACTION_NAME = {
  shu: '蜀',
  wei: '魏',
  wu: '吴',
  qun: '群',
} as const;

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
  const factionName = FACTION_NAME[general.faction];
  const dialogRef = useDialogFocus(true, onClose);

  return (
    <div className="general-detail-layer" onClick={onClose}>
      <div className="general-detail-backdrop" />
      <div
        ref={dialogRef}
        className="general-detail-sheet"
        style={{ '--faction-color': color } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="general-detail-title"
        tabIndex={-1}
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
            <div className="general-detail-kicker">武将志 · {factionName}</div>
            <div id="general-detail-title" className="general-detail-name">{general.name}</div>
            <div className="general-detail-title">{general.title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="general-detail-close"
            aria-label="关闭武将详情"
            title="关闭"
            data-dialog-initial-focus
          >
            <X size={21} weight="bold" aria-hidden />
          </button>
        </div>
        <div className="general-detail-summary" aria-label={`${general.skills.length}项技能`}>
          <span>{general.skills.length} 项技能</span>
          <i aria-hidden />
          <span>当前状态以对局为准</span>
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
                  <span className="general-detail-skill-seal" aria-hidden>{sk.name.slice(0, 1)}</span>
                  <div className="general-detail-skill-heading">
                    <h3>{sk.name}</h3>
                    <div className="general-detail-skill-badges">
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
                    </div>
                  </div>
                </div>
                {sk.qiCost != null && sk.qiCost > 0 && (
                  <div className="general-detail-cost">
                    <span>发动消耗</span>
                    <strong>{sk.qiCost} 战气</strong>
                  </div>
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
