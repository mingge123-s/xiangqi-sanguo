import { FACTION_COLOR, QI_MAX } from '../game/types';
import type { GeneralRuntime, Piece, SkillRuntime } from '../game/types';
import { CHAR } from '../game/types';
import { isSkillReady } from '../game/generals';

function portraitSrc(id: string): string {
  return `${import.meta.env.BASE_URL}generals/${id}.png`;
}

function QiMeter({ value, compact }: { value: number; compact?: boolean }) {
  const n = Math.min(QI_MAX, Math.max(0, value));
  return (
    <div className={`flex items-center justify-center gap-1.5 ${compact ? 'mb-0.5' : 'mb-1'}`}>
      <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} tracking-widest text-paper-dim`}>
        战气 {n}
      </span>
      <div className="flex items-center gap-px" aria-hidden>
        {Array.from({ length: QI_MAX }, (_, i) => (
          <span
            key={i}
            className={`inline-block rounded-full ${compact ? 'h-[4px] w-[4px]' : 'h-[5px] w-[5px]'} ${
              i < n ? 'bg-paper-dim/75' : 'bg-aged/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SkillName({
  skill,
  mine,
  selected,
  qi,
  onClick,
}: {
  skill: SkillRuntime;
  mine: boolean;
  selected: boolean;
  qi: number;
  onClick?: () => void;
}) {
  const ready = mine && isSkillReady(skill, qi);
  const passive = skill.kind === 'passive';
  let color = 'text-paper/45';
  let border = 'border-aged/70 bg-ink-soft/50';
  if (passive) {
    color = 'text-[#8a8276]';
    border = 'border-[#6a6358] bg-ink-soft/40';
  } else if (ready) {
    color = 'text-paper';
    border = 'border-paper-dim bg-paper/15';
  } else {
    color = 'text-paper/50';
    border = 'border-aged/70 bg-ink-soft/50';
  }
  if (selected) border = 'border-paper bg-paper/20';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full truncate rounded-sm border-2 px-1 py-0.5 text-center text-[11px] leading-[13px] ${color} ${border}`}
    >
      {skill.name}
      {skill.qiCost != null && skill.qiCost > 0 ? ` ${skill.qiCost}` : ''}
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
  const showFace = mine || g.hidden === false;
  const fogBorder = !showFace && showFactionFog;
  return (
    <button
      type="button"
      onClick={onPortrait}
      className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full border"
      style={{
        borderColor: showFace || fogBorder ? color : '#3a3228',
        backgroundColor: showFace ? color : '#16120e',
      }}
    >
      {showFace ? (
        <img src={portraitSrc(g.id)} alt={g.name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-lg text-paper">？</div>
      )}
    </button>
  );
}

export function GeneralPanel({
  generals,
  mine,
  selectedSkillId,
  onPortrait,
  onSkill,
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
  onSkill?: (g: GeneralRuntime, skill: SkillRuntime) => void;
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
          const showFace = mine || g.hidden === false;
          return (
            <div key={g.id} className="flex w-[120px] items-center gap-1.5">
              <Seal
                g={g}
                mine={mine}
                showFactionFog={showFactionFog}
                onPortrait={onPortrait ? () => onPortrait(g) : undefined}
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                {showFace ? (
                  g.skills.map((sk) => (
                    <SkillName
                      key={sk.id}
                      skill={sk}
                      mine={mine}
                      qi={qi}
                      selected={selectedSkillId === sk.id}
                      onClick={onSkill ? () => onSkill(g, sk) : undefined}
                    />
                  ))
                ) : (
                  <div className="text-[11px] leading-[14px] text-paper-dim">隐匿将星</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showCaptured && captured && (
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {captured.length === 0 && <div className="text-[11px] text-paper-dim">无被吃子可复活</div>}
          {captured.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPickCaptured?.(p.id)}
              className="wood-token flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ color: p.side === 'red' ? '#9b1c1c' : '#1a1410' }}
            >
              {p.revealed ? CHAR[p.side][p.type] : '？'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
