import type { LastMove, Piece, Pos } from '../game/types';

/** A destination highlight belongs to the moved piece, never to an empty/replaced square. */
export function isLastMovedPieceAt(
  piece: Piece | null,
  pos: Pos,
  lastMove: LastMove | null | undefined,
): boolean {
  return !!(
    piece &&
    lastMove &&
    piece.id === lastMove.piece.id &&
    pos.r === lastMove.to.r &&
    pos.c === lastMove.to.c
  );
}
