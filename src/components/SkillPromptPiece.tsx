import type { Side } from '../game/types';

export function SkillPromptPiece({
  side,
  label,
  compact = false,
}: {
  side: Side;
  label: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`skill-prompt-piece skill-prompt-piece-${side}${compact ? ' skill-prompt-piece-compact' : ''}`}
      aria-hidden
    >
      <span>{label}</span>
    </span>
  );
}
