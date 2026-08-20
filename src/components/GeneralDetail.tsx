import { FACTION_COLOR } from '../game/types';
import type { GeneralRuntime } from '../game/types';
import { skillTypeLabel } from '../game/generals';

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
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="pointer-events-none absolute inset-0 bg-[#3d3224]/25" />
      <div
        className="relative max-h-[88dvh] w-full max-w-[340px] overflow-y-auto rounded-sm border border-aged/40 px-4 py-3 shadow-[0_12px_36px_rgba(61,50,36,0.18)]"
        style={{
          background:
            'radial-gradient(circle at 22% 0%, rgba(255,250,235,0.65), transparent 46%), linear-gradient(180deg, #f7f0de 0%, #efe4cc 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 overflow-hidden rounded-full border"
            style={{ borderColor: color, backgroundColor: color }}
          >
            <img
              src={portraitSrc(general.id)}
              alt={general.name}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-xl tracking-[0.28em] text-ink">{general.name}</div>
            <div className="mt-0.5 text-[12px] tracking-[0.2em] text-aged">{general.title}</div>
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          {general.skills.map((sk) => {
            const tag = skillTypeLabel(sk);
            const live = liveState?.(sk.id) ?? null;
            return (
              <div key={sk.id}>
                <div className="flex items-baseline gap-2">
                  {tag && (
                    <span
                      className="shrink-0 whitespace-nowrap text-[10px] tracking-wider"
                      style={{
                        color:
                          tag === '限定技'
                            ? '#a67c2a'
                            : tag === '主动技' || tag === '回合技' || tag === '回合主动技'
                              ? '#2a2218'
                              : '#8a7349',
                      }}
                    >
                      {tag}
                    </span>
                  )}
                  <span className="text-[15px] text-ink">{sk.name}</span>
                </div>
                {sk.qiCost != null && sk.qiCost > 0 && (
                  <div className="text-[10px] tracking-widest text-aged">消耗 {sk.qiCost} 战气</div>
                )}
                <p className="mt-0.5 text-[12px] leading-5 text-ink-soft/85">{sk.desc}</p>
                {live && (
                  <p className="mt-1 text-[11px] leading-4 tracking-wider text-[#6b5a3e]">{live}</p>
                )}
                {canCast?.(sk.id) && (
                  <button
                    type="button"
                    onClick={() => onCast?.(sk.id)}
                    className="mt-1 border border-aged/50 px-2.5 py-0.5 text-[12px] tracking-[0.35em] text-ink"
                  >
                    发动
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full border border-aged/40 py-1.5 text-[13px] tracking-[0.4em] text-aged"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
