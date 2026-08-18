import { FACTION_COLOR } from '../game/types';
import type { GeneralRuntime } from '../game/types';

function portraitSrc(id: string): string {
  return `${import.meta.env.BASE_URL}generals/${id}.png`;
}

export function GeneralDetail({
  general,
  onClose,
  onCast,
  canCast,
}: {
  general: GeneralRuntime;
  onClose: () => void;
  onCast?: (skillId: string) => void;
  canCast?: (skillId: string) => boolean;
}) {
  const color = FACTION_COLOR[general.faction];
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="pointer-events-none absolute inset-0 bg-[#0a0806]/70" />
      <div
        className="relative max-h-[88dvh] w-full max-w-[340px] overflow-y-auto rounded-sm border border-aged/45 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        style={{
          background:
            'radial-gradient(circle at 22% 0%, rgba(232,220,196,0.10), transparent 46%), linear-gradient(180deg, #2a2218 0%, #16120e 100%)',
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
            />
          </div>
          <div className="min-w-0">
            <div className="text-xl tracking-[0.28em] text-paper">{general.name}</div>
            <div className="mt-0.5 text-[12px] tracking-[0.2em] text-paper-dim">{general.title}</div>
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          {general.skills.map((sk) => (
            <div key={sk.id}>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[10px] tracking-widest"
                  style={{
                    color:
                      sk.engineKind === 'limited'
                        ? '#d4b37a'
                        : sk.kind === 'active'
                          ? '#e8dcc4'
                          : '#8a7349',
                  }}
                >
                  {sk.engineKind === 'limited'
                    ? '限定技'
                    : sk.kind === 'active'
                      ? '主动技'
                      : '锁定技'}
                </span>
                <span className="text-[15px] text-paper">{sk.name}</span>
              </div>
              {sk.qiCost != null && sk.qiCost > 0 && (
                <div className="text-[10px] tracking-widest text-paper-dim">消耗 {sk.qiCost} 战气</div>
              )}
              <p className="mt-0.5 text-[12px] leading-5 text-paper-dim">{sk.desc}</p>
              {canCast?.(sk.id) && (
                <button
                  type="button"
                  onClick={() => onCast?.(sk.id)}
                  className="mt-1 border border-aged/45 px-2.5 py-0.5 text-[12px] tracking-[0.35em] text-paper"
                >
                  发动
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full border border-aged/40 py-1.5 text-[13px] tracking-[0.4em] text-paper-dim"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
