import type { Faction, GeneralRuntime, SkillDef, SkillLabelKind, SkillPhase, SkillRuntime } from './types';

export interface GeneralDef {
  id: string;
  name: string;
  faction: Faction;
  title: string;
  startHidden?: boolean;
  skills: SkillDef[];
}

export function skillTypeLabel(skill: SkillDef | SkillRuntime): SkillLabelKind | null {
  if (skill.labelKind === 'none') return null;
  if (skill.nature) return skill.nature;
  if (skill.labelKind === '主动技') return '主动技';
  if (skill.labelKind === '回合主动技') return '主动技';
  if (skill.labelKind) return skill.labelKind;
  if (skill.engineKind === 'limited') return '限定技';
  if (skill.engineKind === 'window') return '主动技';
  if (skill.engineKind === 'start') return '主动技';
  if (skill.engineKind === 'passive' || skill.kind === 'passive') return '锁定技';
  if (skill.kind === 'active') return '主动技';
  return '锁定技';
}

export function skillPhaseOf(skill: SkillDef | SkillRuntime): SkillPhase | null {
  return skill.phase ?? null;
}

export const GENERALS: GeneralDef[] = [
  {
    id: 'guanyu',
    name: '关羽',
    faction: 'shu',
    title: '武圣',
    startHidden: true,
    skills: [
      {
        id: 'guanyu-wuguan',
        name: '过五关',
        desc: '回合开始时，你可以消耗3点战气，指定己方一枚明棋马，令其立即走一步，此步不受蹩马腿限制。',
        kind: 'active',
        engineKind: 'window',
        nature: '主动技',
        phase: '回合开始',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
      {
        id: 'guanyu-wusheng',
        name: '武圣',
        desc: '限定技。走棋阶段，指定己方一枚位于己方河界内的非将帅明棋。该子如处于己方河界内，则无法被吃。',
        kind: 'active',
        engineKind: 'limited',
        nature: '限定技',
        phase: '走棋阶段',
        labelKind: '限定技',
        maxUses: 1,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'zhuge',
    name: '诸葛亮',
    faction: 'shu',
    title: '卧龙',
    skills: [
      {
        id: 'zhuge-guanxing',
        name: '观星',
        desc: '主动技。游戏开始时，你可以选择五枚暗棋，观看其真实身份。该子仍为暗棋，且仅对你可见。',
        kind: 'passive',
        engineKind: 'start',
        nature: '主动技',
        phase: '游戏开始',
        labelKind: '主动技',
        maxUses: 1,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
      {
        id: 'zhuge-kongcheng',
        name: '空城',
        desc: '主动技。回合结束时，你可以消耗3点战气，指定己方一枚棋子。直至你的下个回合开始，该子无法被吃。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '回合结束',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
    ],
  },
  {
    id: 'zhangfei',
    name: '张飞',
    faction: 'shu',
    title: '咆哮',
    skills: [
      {
        id: 'zhangfei-paoxiao',
        name: '咆哮',
        desc: '主动技。走棋阶段，你可以消耗5点战气，指定己方一枚暗棋。该子走棋次数+1。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'zhangfei-pojun',
        name: '破军',
        desc: '被动技。每当你吃一子，你的战气+1。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'zhaoyun',
    name: '赵云',
    faction: 'shu',
    title: '龙胆',
    skills: [
      {
        id: 'zhaoyun-longhun',
        name: '龙魂',
        desc: '主动技。走棋阶段，你可以消耗1点走棋次数和4点战气，交换己方两枚非将帅棋的位置。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 4,
      },
      {
        id: 'zhaoyun-longdan',
        name: '龙胆',
        desc: '锁定技。回合开始时，若你被将军，战气+2。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '锁定技',
        phase: '回合开始',
        labelKind: '锁定技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'caocao',
    name: '曹操',
    faction: 'wei',
    title: '枭雄',
    skills: [
      {
        id: 'caocao-guixin',
        name: '归心',
        desc: '主动技。走棋阶段，若己方九宫内有敌方棋子，你可以消耗6点战气，将其全部收为己用。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 6,
      },
      {
        id: 'caocao-jianxiong',
        name: '奸雄',
        desc: '被动技。当你吃掉一枚暗棋，且其真实身份为车、炮或马时，战气+3。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'simayi',
    name: '司马懿',
    faction: 'wei',
    title: '冢虎',
    skills: [
      {
        id: 'simayi-guicai',
        name: '鬼才',
        desc: '主动技。走棋阶段，你可以消耗4点战气，指定对方一枚可以走动的非将帅棋。对方下回合只能行走该子。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 4,
      },
      {
        id: 'simayi-yingshi',
        name: '鹰视',
        desc: '主动技。游戏开始时，你可以标记对方一枚暗棋并观看其真实身份。该子成为明棋或被吃后，你的下个回合开始时再次标记。',
        kind: 'passive',
        engineKind: 'start',
        nature: '主动技',
        phase: '游戏开始',
        labelKind: '主动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'xiahoudun',
    name: '夏侯惇',
    faction: 'wei',
    title: '刚烈',
    startHidden: true,
    skills: [
      {
        id: 'xiahoudun-ganglie',
        name: '刚烈',
        desc: '被动技。每当对方以非将帅棋吃掉己方棋子时，消耗5点战气，抛一枚六面骰。奇数则该子与被吃子同归于尽；偶数则恢复2点战气。对方第一次吃掉己方棋子时，揭示此武将。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'xiahoudun-danjing',
        name: '啖睛',
        desc: '主动技。走棋阶段，你可以消耗2点战气，指定对方一枚棋子。该子于其下个回合不能吃子。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 2,
      },
    ],
  },
  {
    id: 'huatuo',
    name: '华佗',
    faction: 'wu',
    title: '神医',
    skills: [
      {
        id: 'huatuo-qingnang',
        name: '青囊',
        desc: '主动技。走棋阶段，你可以消耗6点战气，随机将己方一枚非将帅棋移至己方半场的随机空位（须可落子：士须留在九宫，暗棋象不得过河）。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 6,
      },
      {
        id: 'huatuo-shenyi',
        name: '神医',
        desc: '被动技。每当你的棋子被吃，战气+1。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'zhouyu',
    name: '周瑜',
    faction: 'wu',
    title: '美周郎',
    skills: [
      {
        id: 'zhouyu-fanjian',
        name: '反间',
        desc: '主动技。走棋阶段，你可以消耗5点战气，标记对方一枚棋子。若其下回合行走该子，则改为随机落点。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'zhouyu-huogong',
        name: '火攻',
        desc: '被动技。己方以炮吃子时（该炮为明棋，或暗棋自炮位翻开成为明棋的那一步），战气+2。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'sunshangxiang',
    name: '孙尚香',
    faction: 'wu',
    title: '枭姬',
    skills: [
      {
        id: 'sunshangxiang-lianyin',
        name: '联姻',
        desc: '主动技。走棋阶段，你可以消耗5点战气，指定己方一枚非将帅明棋，将其移至对方半场的随机空位。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'sunshangxiang-xiaoji',
        name: '枭姬',
        desc: '被动技。己方一枚已过河的棋子被吃时，战气+2。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'ganning',
    name: '甘宁',
    faction: 'wu',
    title: '锦帆贼',
    startHidden: true,
    skills: [
      {
        id: 'ganning-chaiqiao',
        name: '奇袭',
        desc: '主动技。走棋阶段，你可以消耗5点战气发动奇袭：两回合内，对方棋子不能过河，己方不受此限。已过河的对方棋子仍可在对岸活动。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'ganning-jinfan',
        name: '锦帆',
        desc: '被动技。每当对方棋子过河时，己方战气+1。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '被动技',
        phase: null,
        labelKind: '被动技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'lvbu',
    name: '吕布',
    faction: 'qun',
    title: '战神',
    startHidden: true,
    skills: [
      {
        id: 'lvbu-chitu',
        name: '赤兔',
        desc: '主动技。走棋阶段，你可以消耗6点战气，指定己方一枚明棋兵卒棋，令其在所在位置变为马。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 6,
      },
      {
        id: 'lvbu-wushuang',
        name: '无双',
        desc: '限定技。走棋阶段，你可以发动无双：在你之后的3个敌方回合内，己方将帅棋无法被吃，且无法被将军。',
        kind: 'active',
        engineKind: 'limited',
        nature: '限定技',
        phase: '走棋阶段',
        labelKind: '限定技',
        maxUses: 1,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
  {
    id: 'diaochan',
    name: '貂蝉',
    faction: 'qun',
    title: '闭月',
    skills: [
      {
        id: 'diaochan-lijian',
        name: '离间',
        desc: '主动技。走棋阶段，你可以消耗5点战气，令对方的下个回合只能使用你选定的暗棋，否则随机失去一枚非将帅棋。',
        kind: 'active',
        engineKind: 'active',
        nature: '主动技',
        phase: '走棋阶段',
        labelKind: '主动技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'diaochan-biyue',
        name: '闭月',
        desc: '锁定技。回合结束时，若本回合至少吃过一子，战气+1。',
        kind: 'passive',
        engineKind: 'passive',
        nature: '锁定技',
        phase: '回合结束',
        labelKind: '锁定技',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
    ],
  },
];

function skillToRuntime(def: SkillDef): SkillRuntime {
  return {
    ...def,
    uses: 0,
    recharge: {
      need: def.rechargeNeed,
      progress: 0,
      trigger: def.rechargeTrigger,
    },
  };
}

export function defToRuntime(def: GeneralDef, hidden = def.startHidden ?? false): GeneralRuntime {
  return {
    id: def.id,
    name: def.name,
    faction: def.faction,
    title: def.title,
    hidden,
    skills: def.skills.map(skillToRuntime),
  };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealGenerals(): { red: GeneralRuntime[]; black: GeneralRuntime[] } {
  const shuffled = shuffle(GENERALS);
  return {
    red: shuffled.slice(0, 3).map((d) => defToRuntime(d)),
    black: shuffled.slice(3, 6).map((d) => defToRuntime(d)),
  };
}

export function isSkillReady(skill: SkillRuntime, qi = 0): boolean {
  if (skill.kind === 'passive') return false;
  if (skill.engineKind === 'start' || skill.engineKind === 'passive') return false;
  if (skill.uses >= skill.maxUses) return false;
  if (skill.qiCost != null && skill.qiCost > 0) return qi >= skill.qiCost;
  if (skill.recharge.need <= 0) return true;
  return skill.recharge.progress >= skill.recharge.need;
}

export function getGeneral(list: GeneralRuntime[], id: string): GeneralRuntime | undefined {
  return list.find((g) => g.id === id);
}

export function generalsOf(red: GeneralRuntime[], black: GeneralRuntime[], side: 'red' | 'black'): GeneralRuntime[] {
  return side === 'red' ? red : black;
}

export function findOwnedSkill(
  gens: GeneralRuntime[],
  skillId: string,
): { general: GeneralRuntime; skill: SkillRuntime } | undefined {
  for (const general of gens) {
    const skill = general.skills.find((sk) => sk.id === skillId);
    if (skill) return { general, skill };
  }
  return undefined;
}

export function sideHasSkill(gens: GeneralRuntime[], skillId: string): boolean {
  return gens.some((g) => g.skills.some((sk) => sk.id === skillId));
}

export function readyActiveSkills(gens: GeneralRuntime[], qi = 0): SkillRuntime[] {
  return gens.flatMap((g) => g.skills).filter((sk) => isSkillReady(sk, qi));
}
