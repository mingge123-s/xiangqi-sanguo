import type { GameState } from './types';

export function resultDescription(reason: GameState['resultReason']) {
  switch (reason) {
    case 'king-captured': return { title: '将帅被俘', detail: '败方将帅已被俘虏。' };
    case 'king-destroyed': return { title: '将帅被摧毁', detail: '败方将帅被技能摧毁，对局结束。' };
    case 'stalemate': return { title: '困毙', detail: '败方没有合法走法，也没有可解围的技能。' };
    case 'checkmate': return { title: '将死', detail: '败方被将军，所有走法和可用技能均无法解围。' };
    default: return { title: '对局结束', detail: '可返回棋盘，结合记录查看终局。' };
  }
}
