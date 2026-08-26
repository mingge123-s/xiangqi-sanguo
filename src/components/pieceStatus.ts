export type PieceStatusTone = 'threat' | 'control' | 'guard' | 'command' | 'intel' | 'support';

export interface PieceStatusEffect {
  mark: string;
  label: string;
  tone: PieceStatusTone;
}

export interface PieceStatusSources {
  yingshiMarkId?: string;
  fanjianMarkId?: string;
  lijianMarkId?: string;
  guicaiMarkId?: string;
  qingnangMarkId?: string;
  kongchengMarkId?: string;
  wushengMarkId?: string;
  zhangfeiMarkId?: string;
  wushuangMarkId?: string;
}

/** Resolve the highest-priority visible effect when several skills mark one piece. */
export function pieceStatusEffect(
  pieceId: string,
  sources: PieceStatusSources,
): PieceStatusEffect | undefined {
  if (sources.guicaiMarkId === pieceId) {
    return { mark: '鬼', label: '鬼才锁定：本回合只能移动此棋', tone: 'control' };
  }
  if (sources.lijianMarkId === pieceId) {
    return { mark: '离', label: '离间标记：改走其他棋将随机失去一子', tone: 'threat' };
  }
  if (sources.fanjianMarkId === pieceId) {
    return { mark: '反', label: '反间标记：移动此棋将随机落点', tone: 'threat' };
  }
  if (sources.zhangfeiMarkId === pieceId) {
    return { mark: '咆', label: '咆哮指定：此棋还可再走一步', tone: 'command' };
  }
  if (sources.kongchengMarkId === pieceId) {
    return { mark: '空', label: '空城守护：敌方不能俘虏此棋', tone: 'guard' };
  }
  if (sources.wushengMarkId === pieceId) {
    return { mark: '武', label: '武圣守护：过河前不能被俘虏', tone: 'guard' };
  }
  if (sources.wushuangMarkId === pieceId) {
    return { mark: '双', label: '无双守护：将帅无法被俘虏或被将军', tone: 'guard' };
  }
  if (sources.yingshiMarkId === pieceId) {
    return { mark: '鹰', label: '鹰视标记：翻开或被俘虏后可再次发动', tone: 'intel' };
  }
  if (sources.qingnangMarkId === pieceId) {
    return { mark: '青', label: '青囊挪动：此棋刚被随机移到此处', tone: 'support' };
  }
  return undefined;
}
