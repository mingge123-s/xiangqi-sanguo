import { CHAR } from '../game/types';
import type { Piece } from '../game/types';

export function CapturedRail({
  pieces,
  align,
  clickableIds,
  onPick,
}: {
  pieces: Piece[];
  align: 'top' | 'bottom';
  clickableIds?: string[];
  onPick?: (id: string) => void;
}) {
  return (
    <div className={`captured-rail captured-rail-${align}`}>
      {pieces.map((p) => {
        const clickable = !!clickableIds?.includes(p.id);
        const label = CHAR[p.side][p.type];
        const color = p.side === 'red' ? '#b8332a' : '#2a2520';
        return (
          <button
            key={p.id}
            type="button"
            disabled={!clickable}
            onClick={() => {
              if (clickable) onPick?.(p.id);
            }}
            className={`wood-token flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none ${
              clickable ? 'ring-1 ring-amber-300/85' : ''
            }`}
            style={{ color, pointerEvents: clickable ? 'auto' : 'none' }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
