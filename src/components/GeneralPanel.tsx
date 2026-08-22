import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { FACTION_COLOR } from '../game/types';
import type { GeneralRuntime, Piece, SkillRuntime } from '../game/types';
import { CHAR } from '../game/types';

function portraitSrc(id: string): string {
  return `${import.meta.env.BASE_URL}generals/${id}.webp`;
}

const LONG_PRESS_MS = 420;

function SkillAction({
  general,
  skill,
  ready,
  selected,
  onCast,
  onInspect,
}: {
  general: GeneralRuntime;
  skill: SkillRuntime;
  ready: boolean;
  selected: boolean;
  onCast?: () => void;
  onInspect?: () => void;
}) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const passive = skill.kind === 'passive' || skill.engineKind === 'passive';

  const clearTimer = () => {
    if (timer.current == null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  };

  const startPress = () => {
    longPressed.current = false;
    clearTimer();
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onInspect?.();
    }, LONG_PRESS_MS);
  };

  const endPress = (fireClick: boolean) => {
    clearTimer();
    if (fireClick && !longPressed.current && ready) onCast?.();
  };

  const stateText = passive
    ? '被动'
    : ready
      ? (skill.qiCost ? `${skill.qiCost} 气` : '可发动')
      : skill.engineKind === 'start'
        ? '开局技'
        : '蓄势中';

  return (
    <button
      type="button"
      className={`command-skill${ready ? ' command-skill-ready' : ''}${selected ? ' command-skill-selected' : ''}`}
      aria-disabled={!ready}
      aria-label={`${general.name}技能${skill.name}，${stateText}。长按查看详情`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        startPress();
      }}
      onPointerUp={() => endPress(true)}
      onPointerLeave={() => endPress(false)}
      onPointerCancel={() => endPress(false)}
      onContextMenu={(event) => {
        event.preventDefault();
        clearTimer();
        longPressed.current = true;
        onInspect?.();
      }}
    >
      <span className="command-skill-seal" aria-hidden>
        {skill.name.slice(0, 1)}
      </span>
      <span className="command-skill-copy">
        <strong>{skill.name}</strong>
        <small>{stateText}</small>
      </span>
    </button>
  );
}

function GeneralPortrait({
  general,
  mine,
  focused,
  ready,
  onClick,
}: {
  general: GeneralRuntime;
  mine: boolean;
  focused: boolean;
  ready: boolean;
  onClick: () => void;
}) {
  const color = FACTION_COLOR[general.faction];
  return (
    <div className={`general-portrait-wrap${focused ? ' general-portrait-focused' : ''}`}>
      {focused && mine && <CaretDown className="general-focus-caret" size={22} weight="fill" aria-hidden />}
      <button
        type="button"
        className="general-portrait"
        style={{ '--faction-color': color } as CSSProperties}
        onClick={onClick}
        aria-label={
          mine
            ? `${general.name}${focused ? '，再次点击查看详情' : '，选择将星'}`
            : `查看${general.name}详情`
        }
      >
        <img
          src={portraitSrc(general.id)}
          alt=""
          className="general-portrait-image"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <span className={`general-state general-state-${mine && ready ? 'ready' : 'rest'}`} aria-hidden>
          {mine && ready ? '可' : mine ? '休' : '敌'}
        </span>
      </button>
      <span className="general-name">{general.name}</span>
    </div>
  );
}

export function GeneralPanel({
  generals,
  mine,
  selectedSkillId,
  onPortrait,
  onCastSkill,
  onInspectSkill,
  canCastSkill,
  captured,
  showCaptured,
  onPickCaptured,
}: {
  generals: GeneralRuntime[];
  mine: boolean;
  selectedSkillId?: string | null;
  onPortrait?: (g: GeneralRuntime) => void;
  onCastSkill?: (g: GeneralRuntime, skill: SkillRuntime) => void;
  onInspectSkill?: (g: GeneralRuntime, skill: SkillRuntime) => void;
  canCastSkill?: (skillId: string) => boolean;
  captured?: Piece[];
  showCaptured?: boolean;
  onPickCaptured?: (id: string) => void;
  showFactionFog?: boolean;
  qi?: number;
}) {
  const [focusedId, setFocusedId] = useState(() => generals[Math.floor(generals.length / 2)]?.id ?? '');

  useEffect(() => {
    const owner = selectedSkillId
      ? generals.find((general) => general.skills.some((skill) => skill.id === selectedSkillId))
      : null;
    if (owner) {
      setFocusedId(owner.id);
      return;
    }
    if (!generals.some((general) => general.id === focusedId)) {
      setFocusedId(generals[Math.floor(generals.length / 2)]?.id ?? '');
    }
  }, [focusedId, generals, selectedSkillId]);

  const focused = generals.find((general) => general.id === focusedId) ?? generals[0];

  return (
    <section className={mine ? 'general-command-panel' : 'enemy-command-panel'} aria-label={mine ? '我方将星' : '敌方将星'}>
      {mine && focused && (
        <div className="command-skills" aria-label={`${focused.name}技能`}>
          {focused.skills.map((skill) => (
            <SkillAction
              key={skill.id}
              general={focused}
              skill={skill}
              ready={!!canCastSkill?.(skill.id)}
              selected={selectedSkillId === skill.id}
              onCast={onCastSkill ? () => onCastSkill(focused, skill) : undefined}
              onInspect={onInspectSkill ? () => onInspectSkill(focused, skill) : undefined}
            />
          ))}
        </div>
      )}

      <div className="general-ribbon">
        {generals.map((general) => {
          const isFocused = mine && general.id === focused?.id;
          const ready = general.skills.some((skill) => !!canCastSkill?.(skill.id));
          return (
            <GeneralPortrait
              key={general.id}
              general={general}
              mine={mine}
              focused={isFocused}
              ready={ready}
              onClick={() => {
                if (!mine) {
                  onPortrait?.(general);
                  return;
                }
                if (isFocused) onPortrait?.(general);
                else setFocusedId(general.id);
              }}
            />
          );
        })}
      </div>

      {showCaptured && captured && (
        <div className="revive-list">
          {captured.length === 0 && <div className="revive-empty">无被吃子可复活</div>}
          {captured.map((piece) => (
            <button
              key={piece.id}
              type="button"
              onClick={() => onPickCaptured?.(piece.id)}
              className="wood-token revive-piece"
              style={{ color: piece.side === 'red' ? '#a7332b' : '#27231f' }}
            >
              {CHAR[piece.side][piece.type]}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
