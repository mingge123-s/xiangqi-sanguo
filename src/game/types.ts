export type Side = 'red' | 'black';
export type PieceType = 'K' | 'A' | 'B' | 'N' | 'R' | 'C' | 'P';

export type PieceGroup = 'jiangshuai' | 'chepao' | 'jinwei' | 'bingzu';

export const PIECE_GROUP: Record<PieceType, PieceGroup> = {
  K: 'jiangshuai',
  R: 'chepao',
  C: 'chepao',
  N: 'jinwei',
  B: 'jinwei',
  A: 'jinwei',
  P: 'bingzu',
};

export const PIECE_GROUP_NAME: Record<PieceGroup, string> = {
  jiangshuai: '将帅棋',
  chepao: '车炮棋',
  jinwei: '近卫棋',
  bingzu: '兵卒棋',
};

export type Faction = 'shu' | 'wei' | 'wu' | 'qun';
export type SkillUiKind = 'active' | 'passive';
export type SkillEngineKind = 'start' | 'limited' | 'passive' | 'active' | 'window';
export type SkillNature = '限定技' | '主动技' | '被动技' | '锁定技';
export type SkillPhase = '游戏开始' | '回合开始' | '走棋阶段' | '回合结束';
/** Display tag in skill detail; overrides the default derived from kind/engineKind. `'none'` hides the badge. */
export type SkillLabelKind = '锁定技' | '出牌技' | '回合技' | '开局技' | '限定技' | '主动技' | '被动技' | '回合主动技' | 'none';
export type Phase = 'home' | 'playing' | 'result';

export interface PeekedBySide {
  red: string[];
  black: string[];
}

export interface Pos {
  r: number;
  c: number;
}

export interface Piece {
  type: PieceType;       // true identity
  side: Side;
  id: string;
  revealed: boolean;     // 将帅 true; others start false
  coverType: PieceType;  // role of the square it was dealt onto (K for kings)
}

export interface Move {
  from: Pos;
  to: Pos;
}

export interface LastMove {
  from: Pos;
  to: Pos;
  piece: Piece;
}

export interface Recharge {
  need: number;
  progress: number;
  trigger: string;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  kind: SkillUiKind;
  engineKind?: SkillEngineKind;
  nature: SkillNature;
  phase?: SkillPhase | null;
  /** Optional override for detail-card type badge. Use the five-way taxonomy. */
  labelKind?: SkillLabelKind;
  maxUses: number;
  rechargeNeed: number;
  rechargeTrigger: string;
  qiCost?: number;
}

export interface SkillRuntime extends SkillDef {
  uses: number;
  recharge: Recharge;
}

export interface GeneralRuntime {
  id: string;
  name: string;
  faction: Faction;
  title: string;
  hidden: boolean;
  skills: SkillRuntime[];
}

export interface PendingEffects {
  awaitOverFive?: boolean;
  awaitGuanxing?: boolean;
  awaitKongcheng?: boolean;
  wushengGuard?: { pieceId: string; owner: Side };
  zhouYuFrozen?: { r: number; c: number; untilSide: Side };
  zhangFeiMovesLeft?: number;
  zhangFeiPieceId?: string;
  kongcheng?: { pieceId: string; untilSide: Side };
  danjing?: { pieceId: string; untilSide: Side };
  bridgeDown?: { owner: Side; enemyTurnsLeft: number };
  awaitYingshi?: boolean;
  yingshiMark?: { owner: Side; pieceId: string };
  yingshiReload?: { red?: boolean; black?: boolean };
  guicaiLock?: { pieceId: string; untilSide: Side };
  /** 吕布无双：剩余己方回合数（发动当回合计 1，己方回合结束时递减）。 */
  wushuang?: { owner: Side; turnsLeft: number };
  /** 貂蝉离间：controller 在对方回合操控对方暗子。 */
  lijianHijack?: { controller: Side };
  /**
   * 夏侯惇刚烈：吃子落地后抛 d6，动画结束前阻塞行棋。
   * resumeTurn：resolve 后是否继续 makeMove 的结束回合流程（过五关额外吃子为 false）。
   */
  ganglieDice?: {
    victimSide: Side;
    capturerPos: Pos;
    capturerId: string;
    roll: number;
    resumeTurn: boolean;
  };
}

export interface SkillBroadcast {
  name: string;
  skill: string;
  faction: Faction;
}

export interface GameState {
  board: (Piece | null)[][];
  side: Side;
  redGenerals: GeneralRuntime[];
  blackGenerals: GeneralRuntime[];
  lastMove: LastMove | null;
  pending: PendingEffects;
  captured: { red: Piece[]; black: Piece[] };
  log: { text: string; side: Side }[];
  winner: Side | null;
  phase: Phase;
  skillBroadcast: SkillBroadcast | null;
  turnCount: number;
  skillUsedThisTurn: boolean;
  /** True after this side has made a chess move (含过五关跳) this turn. */
  movedThisTurn: boolean;
  crossedRiverIds: string[];
  plyCount: number;
  moveSerial: number;
  noReviveIds: string[];
  riverCrossCount: { red: number; black: number };
  /** Per-side dark-piece peeks (观星 / 鹰视). Never share across sides. */
  peekedIds: PeekedBySide;
  qi: { red: number; black: number };
  /** True if the side to move has captured at least once this turn (闭月). */
  capturedThisTurn: boolean;
}

export type SkillPayload =
  | { kind: 'none' }
  | { kind: 'pos'; pos: Pos }
  | { kind: 'twoPos'; a: Pos; b: Pos }
  | { kind: 'fromTo'; from: Pos; to: Pos }
  | { kind: 'posList'; positions: Pos[] }
  | { kind: 'capturedId'; id: string };

export const ROWS = 10;
export const COLS = 9;

export const QI_MAX = 10;
export const QI_START = 0;

export const PIECE_VALUES: Record<PieceType, number> = {
  K: 10000,
  R: 90,
  C: 45,
  N: 40,
  B: 20,
  A: 20,
  P: 10,
};

export const CHAR: Record<Side, Record<PieceType, string>> = {
  red: { K: '帅', A: '仕', B: '相', N: '馬', R: '車', C: '炮', P: '兵' },
  black: { K: '将', A: '士', B: '象', N: '馬', R: '車', C: '炮', P: '卒' },
};

/** Cover-square role marks for 鹰视 (not true identity). */
export const COVER_CHAR: Record<PieceType, string> = {
  K: '将',
  A: '仕',
  B: '相',
  N: '马',
  R: '车',
  C: '炮',
  P: '兵',
};

export const FACTION_COLOR: Record<Faction, string> = {
  shu: '#2f6b4f',
  wei: '#2c4a7c',
  wu: '#8b2e2e',
  qun: '#6b4c8a',
};

export const FAMILY_NAME: Record<string, string> = {
  guanyu: '关',
  zhuge: '诸',
  zhangfei: '张',
  zhaoyun: '赵',
  caocao: '曹',
  simayi: '司',
  xiahoudun: '夏',
  huatuo: '华',
  zhouyu: '周',
  sunshangxiang: '孙',
  ganning: '甘',
  lvbu: '吕',
  diaochan: '貂',
};
