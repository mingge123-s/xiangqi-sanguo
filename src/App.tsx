import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Board } from './components/Board';
import { CapturedRail } from './components/CapturedRail';
import { GeneralDetail } from './components/GeneralDetail';
import { GeneralPanel } from './components/GeneralPanel';
import { Home } from './components/Home';
import { Result } from './components/Result';
import { SkillBroadcast } from './components/SkillBroadcast';
import { TurnBroadcast } from './components/TurnBroadcast';
import { applyAITurn } from './game/ai';
import { posEq } from './game/core';
import {
  canUseSkill,
  clearBroadcast,
  createHomeState,
  isKongchengCaptureAttempt,
  isWushuangCaptureAttempt,
  listLegalFrom,
  makeMove,
  overFiveDests,
  peekDark,
  peekedOf,
  sideInCheck,
  skipKongcheng,
  skipOverFive,
  skillLiveState,
  startMatch,
  useSkill,
  validSkillTargets,
} from './game/engine';
import { sideHasSkill } from './game/generals';
import type { GameState, GeneralRuntime, Pos, Side, SkillPayload, SkillRuntime } from './game/types';

interface Targeting {
  skillId: string;
  hint: string;
  picks: Pos[];
}

function hintFor(id: string): string {
  switch (id) {
    case 'guanyu-wuguan':
      return '过五关：回合开始，点己方已翻开的马再点落点（可越马腿）';
    case 'guanyu-wusheng':
      return '武圣：点选己方已翻开且在河界内一子（不能是帅）';
    case 'zhangfei-paoxiao':
      return '咆哮：点选要连走两步的己方棋';
    case 'zhaoyun-longhun':
      return '龙魂：依次点选要交换的两枚己方棋（可暗可明；发动后本回合不可再行棋）';
    case 'caocao-guixin':
      return '归心：收编己方九宫内的敌子';
    case 'simayi-guicai':
      return '鬼才：点选对方一枚能走的子（卡住的不行），其下回合只能动它；发动后本回合结束';
    case 'simayi-yingshi':
      return '鹰视：点选对方一枚未翻开的棋子标记偷看';
    case 'huatuo-qingnang':
      return '青囊：随机传送己方一枚非将帅棋子';
    case 'zhouyu-fanjian':
      return '反间：点选对方一子，使其下回合无法移动';
    case 'sunshangxiang-lianyin':
      return '联姻：点选己方已过河棋子';
    case 'lvbu-chitu':
      return '赤兔：点选己方已翻开的兵/卒化为马';
    case 'lvbu-wushuang':
      return '无双：三回合内将帅不可被吃、不可被将军';
    case 'diaochan-lijian':
      return '离间：对方下回合由你操控其暗子';
    case 'zhuge-guanxing':
      return '观星：点选五枚暗子偷看（不翻开）';
    case 'zhuge-kongcheng':
      return '空城：点选己方一子护到下回合';
    case 'xiahoudun-danjing':
      return '啖睛：点选对方一子，使其下回合无法吃子';
    default:
      return '选择目标';
  }
}

export default function App() {
  const [state, setState] = useState<GameState>(() => createHomeState());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [targeting, setTargeting] = useState<Targeting | null>(null);
  const [thinking, setThinking] = useState(false);
  const [detail, setDetail] = useState<GeneralRuntime | null>(null);
  const [turnSplash, setTurnSplash] = useState<Side | null>(null);
  const turnSeen = useRef<{ phase: string; side: string } | null>(null);
  const [centerPrompt, setCenterPrompt] = useState<string | null>(null);
  const promptTimer = useRef<number | null>(null);

  const showCenterPrompt = useCallback((text: string) => {
    if (promptTimer.current != null) window.clearTimeout(promptTimer.current);
    setCenterPrompt(text);
    promptTimer.current = window.setTimeout(() => {
      setCenterPrompt(null);
      promptTimer.current = null;
    }, 1600);
  }, []);

  const legal = useMemo(() => {
    if (!selected || state.phase !== 'playing') return [];
    if (targeting?.skillId === 'guanyu-wuguan' && targeting.picks.length === 1) {
      return overFiveDests(state, targeting.picks[0]);
    }
    return listLegalFrom(state, selected);
  }, [selected, state, targeting]);

  const highlights = useMemo(() => {
    if (!targeting) return [];
    const t = validSkillTargets(state, targeting.skillId);
    const extra =
      targeting.skillId === 'zhuge-guanxing'
        ? targeting.picks.filter((p) => !t.positions.some((q) => posEq(q, p)))
        : [];
    return extra.length ? [...t.positions, ...extra] : t.positions;
  }, [targeting, state]);

  const dismissBroadcast = useCallback(() => {
    setState((s) => clearBroadcast(s));
  }, []);

  const checked = state.phase === 'playing' && sideInCheck(state);
  const awaitOverFive = !!state.pending.awaitOverFive && state.side === 'red';
  const awaitGuanxing = !!state.pending.awaitGuanxing && state.side === 'red';
  const awaitYingshi = !!state.pending.awaitYingshi && state.side === 'red';
  const awaitKongcheng = !!state.pending.awaitKongcheng && state.side === 'red';
  const kongchengReady = awaitKongcheng && !state.skillBroadcast;
  const lijianHumanControl =
    !!state.pending.lijianHijack &&
    state.pending.lijianHijack.controller === 'red' &&
    state.side === 'black';
  const lijianAiOnRed =
    !!state.pending.lijianHijack &&
    state.pending.lijianHijack.controller === 'black' &&
    state.side === 'red';
  const inputLocked =
    thinking ||
    (!!state.winner) ||
    !!state.skillBroadcast ||
    (state.side === 'black' && !lijianHumanControl) ||
    lijianAiOnRed;
  const showCoverFog = false;
  const myPeeks = peekedOf(state, 'red');
  const showPeek =
    sideHasSkill(state.redGenerals, 'zhuge-guanxing') ||
    sideHasSkill(state.redGenerals, 'simayi-yingshi') ||
    myPeeks.length > 0;
  const guicaiHighlightId =
    state.pending.guicaiLock && state.pending.guicaiLock.untilSide === state.side
      ? state.pending.guicaiLock.pieceId
      : undefined;

  useEffect(() => {
    if (state.phase !== 'playing') {
      turnSeen.current = null;
      setTurnSplash(null);
      return;
    }
    if (state.skillBroadcast) return;
    const key = { phase: state.phase, side: state.side };
    const prev = turnSeen.current;
    if (prev && prev.phase === key.phase && prev.side === key.side) return;
    turnSeen.current = key;
    setTurnSplash(state.side);
  }, [state.phase, state.side, state.skillBroadcast]);

  useEffect(() => {
    setSelected(null);
    if (state.side === 'black' && !lijianHumanControl) setTargeting(null);
    if (lijianAiOnRed) setTargeting(null);
  }, [state.side, state.turnCount, lijianHumanControl, lijianAiOnRed]);

  useEffect(() => {
    if (state.pending.awaitGuanxing && state.side === 'red' && !state.skillBroadcast) {
      setTargeting({
        skillId: 'zhuge-guanxing',
        hint: hintFor('zhuge-guanxing'),
        picks: [],
      });
    }
  }, [state.pending.awaitGuanxing, state.side, state.skillBroadcast]);

  useEffect(() => {
    if (state.pending.awaitYingshi && state.side === 'red' && !state.skillBroadcast) {
      setTargeting({
        skillId: 'simayi-yingshi',
        hint: hintFor('simayi-yingshi'),
        picks: [],
      });
    }
  }, [state.pending.awaitYingshi, state.side, state.skillBroadcast]);

  useEffect(() => {
    if (state.pending.awaitOverFive && state.side === 'red' && !state.skillBroadcast) {
      setTargeting({
        skillId: 'guanyu-wuguan',
        hint: hintFor('guanyu-wuguan'),
        picks: [],
      });
    }
  }, [state.pending.awaitOverFive, state.side, state.moveSerial, state.skillBroadcast]);

  useEffect(() => {
    if (state.pending.awaitKongcheng && state.side === 'red' && !state.skillBroadcast) {
      setTargeting({
        skillId: 'zhuge-kongcheng',
        hint: hintFor('zhuge-kongcheng'),
        picks: [],
      });
    }
  }, [state.pending.awaitKongcheng, state.side, state.moveSerial, state.skillBroadcast]);

  useEffect(() => {
    const aiShouldPlay =
      state.phase === 'playing' &&
      !state.winner &&
      ((state.side === 'black' && !lijianHumanControl) || lijianAiOnRed);
    if (!aiShouldPlay) {
      setThinking(false);
      return;
    }
    let cancelled = false;
    setThinking(true);
    const snap = state.moveSerial;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setState((cur) => {
        if (cur.moveSerial !== snap) return cur;
        return applyAITurn(cur);
      });
      setThinking(false);
    }, 90);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    state.phase,
    state.side,
    state.winner,
    state.moveSerial,
    state.turnCount,
    lijianHumanControl,
    lijianAiOnRed,
  ]);

  /** Keep skillBroadcast so splash plays AFTER the click/target resolves. */
  const applyPayload = (id: string, payload: SkillPayload) => {
    setState((s) => useSkill(s, id, payload));
    setTargeting(null);
    setSelected(null);
  };

  const openTargeting = (skillId: string) => {
    if (
      skillId === 'caocao-guixin' ||
      skillId === 'ganning-chaiqiao' ||
      skillId === 'diaochan-lijian' ||
      skillId === 'huatuo-qingnang' ||
      skillId === 'lvbu-wushuang'
    ) {
      applyPayload(skillId, { kind: 'none' });
      return;
    }
    setSelected(null);
    setTargeting({ skillId, hint: hintFor(skillId), picks: [] });
  };

  /** Short-tap cast: open targeting / resolve first; broadcast comes from useSkill. */
  const beginCast = (skillId: string) => {
    if (state.skillBroadcast || inputLocked) return;
    if (!canUseSkill(state, skillId)) return;
    openTargeting(skillId);
  };

  const onPortrait = (g: GeneralRuntime, mine: boolean) => {
    setDetail(g);
  };

  const onInspectSkill = (g: GeneralRuntime, _skill: SkillRuntime, mine: boolean) => {
    setDetail(g);
  };

  const onCastSkill = (_g: GeneralRuntime, skill: SkillRuntime) => {
    beginCast(skill.id);
  };

  const onCell = (pos: Pos) => {
    if (inputLocked) return;

    if (targeting) {
      const id = targeting.skillId;
      const t = validSkillTargets(state, id);

      if (id === 'zhuge-guanxing') {
        if (!t.positions.some((p) => posEq(p, pos))) return;
        if (targeting.picks.some((p) => posEq(p, pos))) return;
        const picks = [...targeting.picks, pos];
        if (picks.length >= 5) {
          setState((s) => useSkill(peekDark(s, pos), id, { kind: 'posList', positions: picks }));
          setTargeting(null);
          setSelected(null);
          return;
        }
        setState((s) => peekDark(s, pos));
        setTargeting({
          ...targeting,
          picks,
          hint: `观星：点选五枚暗子偷看（不翻开）（还差 ${5 - picks.length} 枚）`,
        });
        return;
      }

      if (id === 'guanyu-wuguan') {
        if (targeting.picks.length === 0) {
          if (!t.positions.some((p) => posEq(p, pos))) return;
          setTargeting({ ...targeting, picks: [pos] });
          setSelected(pos);
          return;
        }
        applyPayload(id, { kind: 'fromTo', from: targeting.picks[0], to: pos });
        return;
      }

      if (id === 'zhaoyun-longhun') {
        if (!t.positions.some((p) => posEq(p, pos)) && targeting.picks.length === 0) return;
        if (targeting.picks.length === 0) {
          setTargeting({ ...targeting, picks: [pos] });
          return;
        }
        applyPayload(id, { kind: 'twoPos', a: targeting.picks[0], b: pos });
        return;
      }

      if (!t.positions.some((p) => posEq(p, pos))) return;
      applyPayload(id, { kind: 'pos', pos });
      return;
    }

    const piece = state.board[pos.r][pos.c];
    if (selected) {
      if (legal.some((p) => posEq(p, pos))) {
        setState((s) => makeMove(s, selected, pos));
        setSelected(null);
        return;
      }
      if (isKongchengCaptureAttempt(state, selected, pos)) {
        showCenterPrompt('此子已发动空城的技能');
        return;
      }
      if (isWushuangCaptureAttempt(state, selected, pos)) {
        showCenterPrompt('此子已发动无双的技能');
        return;
      }
    }
    if (lijianHumanControl) {
      if (piece && piece.side === 'black' && !piece.revealed) {
        setSelected(pos);
        return;
      }
      setSelected(null);
      return;
    }
    if (piece && piece.side === 'red' && state.side === 'red') {
      setSelected(pos);
      return;
    }
    setSelected(null);
  };

  const lastLine = state.log[state.log.length - 1];
  const wushuangKingId =
    state.pending.wushuang && state.pending.wushuang.turnsLeft > 0
      ? state.board.flat().find((p) => p && p.type === 'K' && p.side === state.pending.wushuang!.owner)?.id
      : undefined;

  return (
    <div className="phone-frame">
      {state.phase === 'home' && <Home onStart={() => setState(startMatch())} />}

      {state.phase === 'playing' && (
        <div className="play-screen">
          <div className="play-generals">
            <GeneralPanel
              generals={state.blackGenerals}
              mine={false}
              qi={state.qi?.black ?? 0}
              showFactionFog={false}
              onPortrait={(g) => onPortrait(g, false)}
              onInspectSkill={(g, sk) => onInspectSkill(g, sk, false)}
            />
          </div>

          <div className="play-status">
            <AnimatePresence>
              {thinking && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  黑方思考中…
                </motion.span>
              )}
              {!thinking && checked && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="play-status-check text-red-piece"
                >
                  将军!
                </motion.span>
              )}
              {!thinking && awaitOverFive && (
                <span className="flex items-center gap-2 text-ink">
                  过五关 · 回合开始，点马来跳，或点跳过
                  <button
                    type="button"
                    className="rounded border border-aged/50 px-1.5 py-0 text-[11px] tracking-widest text-aged"
                    onClick={() => {
                      setState((s) => skipOverFive(s));
                      setTargeting(null);
                      setSelected(null);
                    }}
                  >
                    跳过
                  </button>
                </span>
              )}
              {!thinking && !checked && !awaitOverFive && !awaitGuanxing && !awaitYingshi && !awaitKongcheng && targeting && (
                <span className="flex items-center gap-2 text-ink">
                  {targeting.hint}
                  <button
                    type="button"
                    className="rounded border border-aged/50 px-1.5 py-0 text-[11px] tracking-widest text-aged"
                    onClick={() => {
                      setTargeting(null);
                      setSelected(null);
                    }}
                  >
                    取消
                  </button>
                </span>
              )}
              {!thinking && !checked && !targeting && !awaitOverFive && !awaitGuanxing && !awaitYingshi && !awaitKongcheng && lijianHumanControl && (
                <span className="text-ink">离间 · 操控对方暗子行棋</span>
              )}
              {!thinking && !checked && !targeting && !awaitOverFive && !awaitGuanxing && !awaitYingshi && !awaitKongcheng && !lijianHumanControl && state.pending.zhangFeiMovesLeft && (
                <span>咆哮 · 还可再走一步</span>
              )}
              {!thinking && !checked && !awaitOverFive && !awaitGuanxing && !awaitYingshi && !awaitKongcheng && !targeting && !lijianHumanControl && !state.pending.zhangFeiMovesLeft && (
                <span className={state.side === 'red' ? 'text-red-piece' : 'text-ink'}>
                  {state.side === 'red' ? '红方回合' : '黑方回合'}
                </span>
              )}
            </AnimatePresence>
          </div>

          {/* Opponent / black skill prompts — above the board, never over 棋面 */}
          <div className="skill-slot skill-slot-top" aria-live="polite">
            {turnSplash === 'black' && (
              <TurnBroadcast side="black" onDone={() => setTurnSplash(null)} />
            )}
            {turnSplash !== 'black' && lastLine?.side === 'black' && lastLine.text && (
              <div className="skill-slot-prompt">
                <div className="skill-center-mask">
                  <span className="skill-center-text play-log-line">{lastLine.text}</span>
                </div>
              </div>
            )}
          </div>

          <div className="play-board">
            <div className="play-board-row">
              <CapturedRail pieces={state.captured.red} align="top" />
              <div className="relative min-h-0 min-w-0 flex-1">
                <Board
                  board={state.board}
                  peekedIds={myPeeks}
                  showPeek={showPeek}
                  showCoverHint={showCoverFog}
                  yingshiMarkId={
                    state.pending.yingshiMark?.owner === 'red'
                      ? state.pending.yingshiMark.pieceId
                      : undefined
                  }
                  lockedPieceId={guicaiHighlightId ?? wushuangKingId}
                  selected={
                    targeting?.skillId === 'zhuge-guanxing' || targeting?.skillId === 'simayi-yingshi'
                      ? targeting.picks
                      : selected
                  }
                  legal={
                    targeting?.skillId === 'guanyu-wuguan' && targeting.picks.length === 1
                      ? legal
                      : targeting
                        ? []
                        : legal
                  }
                  lastMove={state.lastMove}
                  highlights={highlights}
                  disabled={inputLocked}
                  onCell={onCell}
                />
              </div>
              <CapturedRail pieces={state.captured.black} align="bottom" />
            </div>
          </div>

          {/* Own / red skill prompts — below the board (图2 gap), never over 棋面 */}
          <div className="skill-slot skill-slot-bottom" aria-live="polite">
            {turnSplash === 'red' && (
              <TurnBroadcast side="red" onDone={() => setTurnSplash(null)} />
            )}
            {awaitGuanxing && !state.skillBroadcast && turnSplash !== 'red' && (
              <div className="skill-slot-prompt">
                <div className="skill-center-mask">
                  <span className="skill-center-text">
                    {targeting?.hint ?? '观星：点选五枚暗子偷看（不翻开）'}
                  </span>
                </div>
              </div>
            )}
            {awaitYingshi && !state.skillBroadcast && turnSplash !== 'red' && (
              <div className="skill-slot-prompt">
                <div className="skill-center-mask">
                  <span className="skill-center-text">鹰视：点选对方一枚棋子标记偷看</span>
                </div>
              </div>
            )}
            {kongchengReady && turnSplash !== 'red' && (
              <div className="skill-slot-prompt">
                <div className="skill-center-mask skill-center-mask-inline">
                  <span className="skill-center-text">空城 · 点己方一子护到下回合</span>
                  <button
                    type="button"
                    className="pointer-events-auto relative rounded border border-aged/50 px-2 py-0.5 text-[12px] tracking-widest text-aged"
                    onClick={() => {
                      setState((s) => skipKongcheng(s));
                      setTargeting(null);
                      setSelected(null);
                    }}
                  >
                    跳过
                  </button>
                </div>
              </div>
            )}
            {centerPrompt && !kongchengReady && !awaitGuanxing && !awaitYingshi && turnSplash !== 'red' && (
              <div className="skill-slot-prompt">
                <div className="skill-center-mask">
                  <span className="skill-center-text">{centerPrompt}</span>
                </div>
              </div>
            )}
            {!awaitGuanxing && !awaitYingshi && !kongchengReady && !centerPrompt && turnSplash !== 'red' && lastLine?.side === 'red' && lastLine.text && (
              <div className="skill-slot-prompt">
                <div className="skill-center-mask">
                  <span className="skill-center-text play-log-line">{lastLine.text}</span>
                </div>
              </div>
            )}
          </div>

          <div className="play-generals-me">
            <GeneralPanel
              generals={state.redGenerals}
              mine={true}
              qi={state.qi?.red ?? 0}
              selectedSkillId={targeting?.skillId}
              onPortrait={(g) => onPortrait(g, true)}
              onInspectSkill={(g, sk) => onInspectSkill(g, sk, true)}
              onCastSkill={onCastSkill}
              canCastSkill={(id) => !inputLocked && canUseSkill(state, id)}
            />
          </div>
        </div>
      )}

      {state.phase === 'result' && state.winner && (
        <Result winner={state.winner} onAgain={() => setState(startMatch())} />
      )}

      <SkillBroadcast data={state.skillBroadcast} onDone={dismissBroadcast} />
      {detail && (
        <GeneralDetail
          general={detail}
          onClose={() => setDetail(null)}
          liveState={(id) => {
            const mine = state.redGenerals.some((g) => g.id === detail.id);
            if (!mine) return null;
            return skillLiveState(state, id, 'red');
          }}
          canCast={(id) => {
            if (id === 'zhuge-guanxing') return false;
            return !inputLocked && canUseSkill(state, id);
          }}
          onCast={(id) => {
            setDetail(null);
            beginCast(id);
          }}
        />
      )}
    </div>
  );
}
