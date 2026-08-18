import type { Faction, GeneralRuntime, SkillDef, SkillLabelKind, SkillRuntime } from './types';

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
  if (skill.labelKind) return skill.labelKind;
  if (skill.engineKind === 'limited') return '限定技';
  if (skill.engineKind === 'window') return '回合技';
  if (skill.engineKind === 'passive' || skill.engineKind === 'start' || skill.kind === 'passive') {
    return '锁定技';
  }
  if (skill.kind === 'active') return '主动技';
  return '锁定技';
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
        desc: '回合开始时，你可以消耗3点战气，指定己方一枚已翻开的马，令其立即行动一日，此步不受蹩马腿限制。跳完或跳过后仍可走正常一步。',
        kind: 'active',
        engineKind: 'window',
        labelKind: '回合技',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
      {
        id: 'guanyu-wusheng',
        name: '武圣',
        desc: '限定技，出牌阶段，指定己方一枚已翻开且在己方河界内的棋子（不能指定帅/将）。该子在己方河界内不能被吃；一旦过河，效果消失。',
        kind: 'active',
        engineKind: 'limited',
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
        desc: '锁定技，对局开始时，你可以选择五枚暗子，观看其真实身份（不翻开，仅你可见）。',
        kind: 'passive',
        engineKind: 'start',
        maxUses: 1,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
      {
        id: 'zhuge-kongcheng',
        name: '空城',
        desc: '主动技，你的回合结束时，你可以消耗3点战气，指定己方一枚棋子。直至你的下个回合开始，该子不能被吃。',
        kind: 'active',
        engineKind: 'active',
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
        desc: '主动技，出牌阶段，你可以消耗5点战气，指定己方一枚棋子。本回合该子可以连走两步。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'zhangfei-pojun',
        name: '破军',
        desc: '锁定技，每当你吃一子，你的战气+1。',
        kind: 'passive',
        engineKind: 'passive',
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
        desc: '主动技，出牌阶段，在本回合行棋之前，你可以消耗4点战气，交换己方两子（可暗可明）。发动后本回合不可再行棋。帅须留九宫。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 4,
      },
      {
        id: 'zhaoyun-longdan',
        name: '龙胆',
        desc: '锁定技，你的回合开始时若被将军，战气+2。',
        kind: 'passive',
        engineKind: 'passive',
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
        name: '天下归心',
        desc: '主动技，出牌阶段，你可以消耗3点战气，将对方上一手退回原位；若该子因那步刚翻开，则重新扣上。原位被占则落空仍消耗。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
      {
        id: 'caocao-jianxiong',
        name: '奸雄',
        desc: '锁定技，对方吃掉己方已翻开的车或炮时，战气+3。',
        kind: 'passive',
        engineKind: 'passive',
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
        desc: '出牌阶段，你可以消耗5点战气，指定对方一枚棋子。对方的下个回合只能使用该子移动。',
        kind: 'active',
        engineKind: 'active',
        labelKind: 'none',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 5,
      },
      {
        id: 'simayi-yingshi',
        name: '鹰视',
        desc: '锁定技，对局开始时，你可以标记对方一枚棋子并观看其真实身份（不翻开，仅你可见）。该子被翻开或被吃后，你的下个回合开始时再次标记，直至对局结束。',
        kind: 'passive',
        engineKind: 'start',
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
        desc: '锁定技，此武将身份揭示后，每当对方吃子，该行棋之子有50%概率与被吃子同归于尽。对方第一次吃掉己方棋子时，揭示此武将并结算。',
        kind: 'passive',
        engineKind: 'passive',
        maxUses: 0,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
      {
        id: 'xiahoudun-danjing',
        name: '啖睛',
        desc: '主动技，出牌阶段，你可以消耗2点战气，指定对方一枚棋子，其于下个回合不能吃子（可行不吃子之棋）。',
        kind: 'active',
        engineKind: 'active',
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
        desc: '主动技，出牌阶段，你可以消耗4点战气，将己方一枚已阵亡的棋子置于己方底线的随机空位。若无空位，则此技能无效。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 4,
      },
      {
        id: 'huatuo-shenyi',
        name: '神医',
        desc: '锁定技，你的回合开始时若被将军，战气+1。',
        kind: 'passive',
        engineKind: 'passive',
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
        desc: '主动技，出牌阶段，你可以消耗3点战气，指定对方一枚棋子，其于下个回合不能移动。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
      {
        id: 'zhouyu-huogong',
        name: '火攻',
        desc: '锁定技，己方以炮（明炮，或从炮位翻开的那一步）吃子时，战气+2。',
        kind: 'passive',
        engineKind: 'passive',
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
        desc: '主动技，出牌阶段，你可以消耗2点战气，指定己方一枚已过河的棋子，将其移至己方半场的随机空位。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 2,
      },
      {
        id: 'sunshangxiang-xiaoji',
        name: '枭姬',
        desc: '锁定技，己方一枚已过河的棋子被吃时，战气+2。',
        kind: 'passive',
        engineKind: 'passive',
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
        desc: '主动技，出牌阶段，你可以消耗3点战气发动奇袭：两回合内，对方棋子不能过河，己方不受此限。已过河的对方棋子仍可在对岸活动。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
      {
        id: 'ganning-jinfan',
        name: '锦帆',
        desc: '锁定技，每当对方棋子过河时，己方战气+1。',
        kind: 'passive',
        engineKind: 'passive',
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
        id: 'lvbu-wushuang',
        name: '无双',
        desc: '限定技，出牌阶段，你可以指定与己方任一棋子距离不大于2的一枚对方棋子，无视走法将其吃掉。若你拥有【赤兔】，则距离改为不大于3。',
        kind: 'active',
        engineKind: 'limited',
        maxUses: 1,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
      },
      {
        id: 'lvbu-chitu',
        name: '赤兔',
        desc: '锁定技，【无双】的距离改为不大于3。',
        kind: 'passive',
        engineKind: 'passive',
        maxUses: 0,
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
        desc: '主动技，出牌阶段，你可以消耗3点战气，指定相邻的两枚对方棋子，令其中一枚吃掉另一枚。',
        kind: 'active',
        engineKind: 'active',
        maxUses: 999,
        rechargeNeed: 0,
        rechargeTrigger: 'none',
        qiCost: 3,
      },
      {
        id: 'diaochan-biyue',
        name: '闭月',
        desc: '锁定技，因【离间】而被吃掉的棋子，不能被【青囊】复活。',
        kind: 'passive',
        engineKind: 'passive',
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
