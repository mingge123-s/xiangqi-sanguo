import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CaretDown, Info } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'framer-motion';
import { FACTION_COLOR } from '../game/types';
import type { GeneralRuntime, Piece, SkillRuntime } from '../game/types';
import { CHAR } from '../game/types';
import { QiMeter } from './QiMeter';
import './interaction-polish.css';

function portraitSrc(id: string): string {
  return `${import.meta.env.BASE_URL}generals/${id}.webp`;
}

const LONG_PRESS_MS = 420;

function SkillAction({
  general,
  skill,
  ready,
  selected,
  qi,
  onCast,
  onInspect,
}: {
  general: GeneralRuntime;
  skill: SkillRuntime;
  ready: boolean;
  selected: boolean;
  qi?: number;
  onCast?: () => void;
  onInspect?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const canceled = useRef(false);
  const passive = (skill.engineKind ?? skill.kind) === 'passive';

  const clearTimer = () => {
    if (timer.current == null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current);
  }, []);

  const startPress = (x: number, y: number) => {
    // A fresh gesture must not inherit cancellation from a dismissed long-press dialog.
    longPressed.current = false;
    canceled.current = false;
    pressStart.current = { x, y };
    clearTimer();
    if (!onInspect) return;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onInspect?.();
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    clearTimer();
    if (pressStart.current) canceled.current = true;
    pressStart.current = null;
  };

  const stateText = ready
    ? (skill.qiCost ? `${skill.qiCost} 气` : '可发动')
    : skill.nature === '锁定技'
      ? '锁定'
    : skill.id === 'xiahoudun-ganglie'
      ? '受俘虏时'
    : skill.engineKind === 'limited' && skill.uses >= skill.maxUses
      ? '已用尽'
    : skill.engineKind === 'start'
      ? '开局技'
    : passive
      ? '被动'
    : qi != null && (skill.qiCost ?? 0) > qi
      ? `差${(skill.qiCost ?? 0) - qi}气`
      : '蓄势中';

  return (
    <div className="command-skill-control">
    <motion.button
      type="button"
      className={`command-skill${ready ? ' command-skill-ready' : ''}${selected ? ' command-skill-selected' : ''}`}
      animate={selected && !reduceMotion ? { y: -2, scale: 1.015 } : { y: 0, scale: 1 }}
      whileTap={ready && !reduceMotion ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      aria-label={`${general.name}技能${skill.name}，${stateText}。${ready ? '点击发动，长按查看详情' : '点击查看详情'}`}
      onClick={(event) => {
        const suppressed = event.detail !== 0 && (longPressed.current || canceled.current);
        longPressed.current = false;
        canceled.current = false;
        if (suppressed) return;
        if (ready && onCast) onCast();
        else onInspect?.();
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        startPress(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (!pressStart.current) return;
        if (Math.hypot(event.clientX - pressStart.current.x, event.clientY - pressStart.current.y) > 10) cancelPress();
      }}
      onPointerUp={() => {
        clearTimer();
        pressStart.current = null;
      }}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onBlur={cancelPress}
      onContextMenu={(event) => {
        event.preventDefault();
        clearTimer();
        if (!longPressed.current) onInspect?.();
        longPressed.current = true;
      }}
    >
      <span className="command-skill-seal" aria-hidden>
        {skill.name.slice(0, 1)}
      </span>
      <span className="command-skill-copy">
        <strong>{skill.name}</strong>
        <small>{stateText}</small>
      </span>
    </motion.button>
    {onInspect && (
      <button
        type="button"
        className="command-skill-info"
        onClick={onInspect}
        aria-label={`查看${general.name}的${skill.name}技能说明`}
        title="技能说明"
      >
        <Info size={18} weight="duotone" aria-hidden />
      </button>
    )}
    </div>
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
  qi,
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
              qi={qi}
              onCast={onCastSkill ? () => onCastSkill(focused, skill) : undefined}
              onInspect={onInspectSkill ? () => onInspectSkill(focused, skill) : onPortrait ? () => onPortrait(focused) : undefined}
            />
          ))}
        </div>
      )}

      {mine && qi != null && (
        <div className="player-qi-band">
          <QiMeter side="red" qi={qi} label="我方战气" />
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
          {captured.length === 0 && <div className="revive-empty">无被俘虏棋子可复活</div>}
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
