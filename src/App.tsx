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
  resolveGanglie,
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
      return '过五关：回合开始时，点选己方明棋马及其落点（此步不受蹩马腿限制）';
    case 'guanyu-wusheng':
      return '武圣：点选己方位于己方河界内的非将帅明棋';
    case 'zhangfei-paoxiao':
      return '咆哮：点选己方一枚暗棋，该子走棋次数+1';
    case 'zhaoyun-longhun':
      return '龙魂：点选己方两枚非将帅棋交换位置（耗1步、4战气）';
    case 'caocao-guixin':
      return '归心：己方九宫有敌子时，将其全部收为己用';
    case 'simayi-guicai':
      return '鬼才：点选对方一枚可走动的非将帅棋，其下回合只能行走该子';
    case 'simayi-yingshi':
      return '鹰视：点选对方一枚暗棋，标记并观看其真实身份';
    case 'huatuo-qingnang':
      return '青囊：随机将己方一枚非将帅棋移至己方半场空位';
    case 'zhouyu-fanjian':
      return '反间：点选对方一子，其下回合若走该子则随机落点';
    case 'sunshangxiang-lianyin':
      return '联姻：点选己方一枚非将帅明棋，移至对方半场随机空位';
    case 'lvbu-chitu':
      return '赤兔：点选己方一枚明棋兵卒棋，令其变为马';
    case 'lvbu-wushuang':
      return '无双：之后3个敌方回合内，己方将帅棋无法被吃，且无法被将军';
    case 'diaochan-lijian':
      return '离间：点选对方一枚暗棋，其下回合只能使用该子，否则随机失去一枚非将帅棋';
    case 'zhuge-guanxing':
      return '观星：点选五枚暗棋，观看其真实身份';
    case 'zhuge-kongcheng':
      return '空城：点选己方一枚棋子，直至下个回合开始无法被吃';
    case 'xiahoudun-danjing':
      return '啖睛：点选对方一枚棋子，该子于其下个回合不能吃子';
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
  const gangliePending = !!state.pending.ganglieDice;
  const inputLocked =
    thinking ||
    (!!state.winner) ||
    !!state.skillBroadcast ||
    gangliePending ||
    state.side === 'black';
  const showCoverFog = false;
  const myPeeks = peekedOf(state, 'red');
  const showPeek =
    sideHasSkill(state.redGenerals, 'zhuge-guanxing') ||
    sideHasSkill(state.redGenerals, 'simayi-yingshi') ||
    myPeeks.length > 0;
  const lockHighlightId =
    state.pending.guicaiLock && state.pending.guicaiLock.untilSide === state.side
      ? state.pending.guicaiLock.pieceId
      : state.pending.lijianMark && state.pending.lijianMark.untilSide === state.side
        ? state.pending.lijianMark.pieceId
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
    if (state.side === 'black') setTargeting(null);
  }, [state.side, state.turnCount]);

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
      !state.pending.ganglieDice &&
      state.side === 'black';
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
    state.pending.ganglieDice,
  ]);

  const onGanglieSettled = useCallback(() => {
    setState((s) => (s.pending.ganglieDice ? resolveGanglie(s) : s));
  }, []);

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
          hint: `观星：点选五枚暗棋（还差 ${5 - picks.length} 枚）`,
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

          {/* Enemy skill announce only — flush to board top; never turn/status for player */}
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
                  lockedPieceId={lockHighlightId ?? wushuangKingId}
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
                  ganglieDice={
                    state.pending.ganglieDice
                      ? {
                          roll: state.pending.ganglieDice.roll,
                          capturerPos: state.pending.ganglieDice.capturerPos,
                        }
                      : null
                  }
                  onGanglieSettled={onGanglieSettled}
                />
              </div>
              <CapturedRail pieces={state.captured.black} align="bottom" />
            </div>
          </div>

          {/* Player status + red prompts — one strip at board bottom (priority: 将军>思考>过五关>观星/鹰视/空城>targeting>咆哮>回合; lastLine waits for windows) */}
          <div className="skill-slot skill-slot-bottom" aria-live="polite">
            {turnSplash === 'red' && (
              <TurnBroadcast side="red" onDone={() => setTurnSplash(null)} />
            )}
            {turnSplash !== 'red' && (
              <AnimatePresence mode="wait">
                {checked ? (
                  <motion.div
                    key="check"
                    className="skill-slot-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="skill-center-mask">
                      <span className="skill-center-text play-status-check text-red-piece">将军!</span>
                    </div>
                  </motion.div>
                ) : thinking ? (
                  <motion.div
                    key="thinking"
                    className="skill-slot-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="skill-center-mask">
                      <span className="skill-center-text">黑方思考中…</span>
                    </div>
                  </motion.div>
                ) : awaitOverFive ? (
                  <div key="overfive" className="skill-slot-prompt">
                    <div className="skill-center-mask skill-center-mask-inline">
                      <span className="skill-center-text">过五关 · 回合开始，点马来跳，或点跳过</span>
                      <button
                        type="button"
                        className="skill-slot-action"
                        onClick={() => {
                          setState((s) => skipOverFive(s));
                          setTargeting(null);
                          setSelected(null);
                        }}
                      >
                        跳过
                      </button>
                    </div>
                  </div>
                ) : awaitGuanxing && !state.skillBroadcast ? (
                  <div key="guanxing" className="skill-slot-prompt">
                    <div className="skill-center-mask">
                      <span className="skill-center-text">
                        {targeting?.hint ?? '观星：点选五枚暗棋'}
                      </span>
                    </div>
                  </div>
                ) : awaitYingshi && !state.skillBroadcast ? (
                  <div key="yingshi" className="skill-slot-prompt">
                    <div className="skill-center-mask">
                      <span className="skill-center-text">鹰视：点选对方一枚暗棋，标记并观看其真实身份</span>
                    </div>
                  </div>
                ) : kongchengReady ? (
                  <div key="kongcheng" className="skill-slot-prompt">
                    <div className="skill-center-mask skill-center-mask-inline">
                      <span className="skill-center-text">空城 · 点己方一子护到下回合</span>
                      <button
                        type="button"
                        className="skill-slot-action"
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
                ) : targeting ? (
                  <div key="targeting" className="skill-slot-prompt">
                    <div className="skill-center-mask skill-center-mask-inline">
                      <span className="skill-center-text">{targeting.hint}</span>
                      <button
                        type="button"
                        className="skill-slot-action"
                        onClick={() => {
                          setTargeting(null);
                          setSelected(null);
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : state.pending.zhangFeiPieceId && state.movesLeft > 0 ? (
                  <div key="paoxiao" className="skill-slot-prompt">
                    <div className="skill-center-mask">
                      <span className="skill-center-text">咆哮 · 还可再走一步</span>
                    </div>
                  </div>
                ) : centerPrompt ? (
                  <div key="center" className="skill-slot-prompt">
                    <div className="skill-center-mask">
                      <span className="skill-center-text">{centerPrompt}</span>
                    </div>
                  </div>
                ) : lastLine?.side === 'red' && lastLine.text ? (
                  <div key="last-red" className="skill-slot-prompt">
                    <div className="skill-center-mask">
                      <span className="skill-center-text play-log-line">{lastLine.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key="turn" className="skill-slot-prompt">
                    <div className="skill-center-mask">
                      <span className={`skill-center-text ${state.side === 'red' ? 'text-red-piece' : ''}`}>
                        {state.side === 'red' ? '红方回合' : '黑方回合'}
                      </span>
                    </div>
                  </div>
                )}
              </AnimatePresence>
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
