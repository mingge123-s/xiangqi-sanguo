import { useRef } from 'react';
import { FACTION_COLOR, QI_MAX } from '../game/types';
import type { GeneralRuntime, Piece, SkillRuntime } from '../game/types';
import { CHAR } from '../game/types';

function portraitSrc(id: string): string {
  return `${import.meta.env.BASE_URL}generals/${id}.webp`;
}

const LONG_PRESS_MS = 400;

function QiMeter({ value, compact }: { value: number; compact?: boolean }) {
  const n = Math.min(QI_MAX, Math.max(0, value));
  return (
    <div className={`flex items-center justify-center gap-1.5 ${compact ? 'mb-0.5' : 'mb-1'}`}>
      <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} tracking-widest text-aged`}>
        战气 {n}
      </span>
      <div className="flex items-center gap-px" aria-hidden>
        {Array.from({ length: QI_MAX }, (_, i) => (
          <span
            key={i}
            className={`inline-block rounded-full ${compact ? 'h-[4px] w-[4px]' : 'h-[5px] w-[5px]'} ${
              i < n ? 'bg-aged/80' : 'bg-aged/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SkillName({
  skill,
  ready,
  selected,
  onCast,
  onInspect,
}: {
  skill: SkillRuntime;
  ready: boolean;
  selected: boolean;
  onCast?: () => void;
  onInspect?: () => void;
}) {
  const passive = skill.kind === 'passive' || skill.engineKind === 'start' || skill.engineKind === 'passive';
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  let color = 'text-ink/40';
  let border = 'border-aged/55 bg-paper/35';
  if (passive) {
    color = 'text-[#6a6358]';
    border = 'border-[#9a8f7c] bg-paper/25';
  } else if (ready) {
    color = 'text-ink';
    border = 'border-[#c9a227] bg-[#f7f0de]/85';
  } else {
    color = 'text-ink/45';
    border = 'border-aged/55 bg-paper/35';
  }
  if (selected) border = 'border-[#c9a227] bg-[#efe4cc]';

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
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
    if (fireClick && !longPressed.current) {
      if (ready && onCast) onCast();
    }
  };

  return (
    <button
      type="button"
      className={`block w-full truncate rounded-sm border-2 px-1 py-0.5 text-center text-[11px] leading-[13px] select-none ${color} ${border} ${
        ready ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ touchAction: 'manipulation' }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        startPress();
      }}
      onPointerUp={() => endPress(true)}
      onPointerLeave={() => endPress(false)}
      onPointerCancel={() => endPress(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        clearTimer();
        longPressed.current = true;
        onInspect?.();
      }}
    >
      {skill.name}
    </button>
  );
}

function Seal({
  g,
  mine,
  showFactionFog,
  onPortrait,
}: {
  g: GeneralRuntime;
  mine: boolean;
  showFactionFog?: boolean;
  onPortrait?: () => void;
}) {
  const color = FACTION_COLOR[g.faction];
  const showFace = true;
  const fogBorder = false;
  return (
    <button
      type="button"
      onClick={onPortrait}
      className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full border"
      style={{
        borderColor: showFace || fogBorder ? color : '#8a7349',
        backgroundColor: showFace ? color : '#d8c7a4',
      }}
    >
      {showFace ? (
        <img
          src={portraitSrc(g.id)}
          alt={g.name}
          className="h-full w-full rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-lg text-ink">？</div>
      )}
    </button>
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
  showFactionFog,
  qi = 0,
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
  return (
    <div className="px-1">
      <QiMeter value={qi} compact={!mine} />
      <div className="flex items-start justify-center gap-1">
        {generals.map((g) => {
          const showFace = true;
          return (
            <div key={g.id} className="flex w-[120px] items-center gap-1.5">
              <Seal
                g={g}
                mine={mine}
                showFactionFog={showFactionFog}
                onPortrait={onPortrait ? () => onPortrait(g) : undefined}
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                {(
                  g.skills.map((sk) => {
                    const ready = !!mine && !!canCastSkill?.(sk.id);
                    return (
                      <SkillName
                        key={sk.id}
                        skill={sk}
                        ready={ready}
                        selected={selectedSkillId === sk.id}
                        onCast={onCastSkill ? () => onCastSkill(g, sk) : undefined}
                        onInspect={onInspectSkill ? () => onInspectSkill(g, sk) : undefined}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showCaptured && captured && (
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {captured.length === 0 && <div className="text-[11px] text-aged">无被吃子可复活</div>}
          {captured.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPickCaptured?.(p.id)}
              className="wood-token flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ color: p.side === 'red' ? '#b8332a' : '#2a2520' }}
            >
              {CHAR[p.side][p.type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
