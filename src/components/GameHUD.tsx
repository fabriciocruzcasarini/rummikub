import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  Menu,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { type Tile, type TileColor, isValidMeld } from '../game/rules.ts';
import { type PlayerInfo } from '../game/network.ts';

interface GameHUDProps {
  currentTurn: number; // 0, 1, or 2
  localPlayerIndex: number;
  players: PlayerInfo[];
  turnTimer: number; // seconds remaining
  maxTimer: number;
  isBoardValid: boolean;
  hasPlayedThisTurn: boolean;
  hasOpened: boolean;
  pouchCount: number;
  playerHand: Tile[];
  selectedTileIds: string[];
  board: Tile[][];
  cameraMode: 'gameplay' | 'zoom-table' | 'zoom-rack';
  isMuted: boolean;
  onToggleMute: () => void;
  onChangeCamera: (mode: 'gameplay' | 'zoom-table' | 'zoom-rack') => void;
  onTileSelect: (tileId: string) => void;
  onSortByGroups: () => void;
  onSortByRuns: () => void;
  onPlaySelectedToNewMeld: () => void;
  onInsertTileIntoMeld: (meldIndex: number) => void;
  onDrawTile: () => void;
  onEndTurn: () => void;
  onResetTurn: () => void;
  onOpenRules: () => void;
  onOpenMenu: () => void;
  statusMessage: string | null;
}

const COLOR_CLASSES: Record<TileColor, { text: string; bg: string; border: string }> = {
  black: { text: 'text-zinc-900', bg: 'bg-zinc-100', border: 'border-zinc-300' },
  blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  red: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  yellow: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  joker: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
};

export const GameHUD: React.FC<GameHUDProps> = ({
  currentTurn,
  localPlayerIndex,
  players,
  turnTimer,
  maxTimer,
  isBoardValid,
  hasPlayedThisTurn,
  hasOpened,
  pouchCount,
  playerHand,
  selectedTileIds,
  board,
  cameraMode,
  isMuted,
  onToggleMute,
  onChangeCamera,
  onTileSelect,
  onSortByGroups,
  onSortByRuns,
  onPlaySelectedToNewMeld,
  onInsertTileIntoMeld,
  onDrawTile,
  onEndTurn,
  onResetTurn,
  onOpenRules,
  onOpenMenu,
  statusMessage,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const isMyTurn = currentTurn === localPlayerIndex;
  const activePlayer = players[currentTurn] || { name: 'Jogador', isBot: false };

  // Timer percentage
  const timerPct = Math.max(0, Math.min(100, (turnTimer / maxTimer) * 100));
  const isLowTime = turnTimer <= 10;

  // Selected tiles details
  const selectedTiles = playerHand.filter((t) => selectedTileIds.includes(t.id));
  const canFormValidMeld = selectedTiles.length >= 3 && isValidMeld(selectedTiles);

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex flex-col justify-between p-3 md:p-6 z-20">
      {/* Top HUD Cluster */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2">
        {/* Left: Players status summary */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 pointer-events-auto scrollbar-none">
          {players.map((p, idx) => {
            const isTurn = currentTurn === idx;
            const isSelf = idx === localPlayerIndex;
            return (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shrink-0 transition text-xs ${
                  isTurn
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isTurn ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold leading-tight truncate max-w-[80px] md:max-w-[110px]">
                      {p.name} {isSelf && '(Você)'}
                    </span>
                    {p.isBot && (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">
                        IA
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {p.tileCount}p {p.hasOpened ? '✓' : '(abertura)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Turn & Timer Badge */}
        <div className="self-center flex flex-col items-center pointer-events-auto my-0.5">
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border shadow-xl transition ${
              isMyTurn
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-300'
            }`}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {isMyTurn ? 'SUA VEZ!' : `${activePlayer.name}`}
            </span>

            <div className="h-3.5 w-px bg-slate-700" />

            <div className="flex items-center gap-1 tabular-nums font-mono font-bold text-xs">
              <Clock className={`w-3 h-3 ${isLowTime ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
              <span className={isLowTime ? 'text-rose-400' : 'text-amber-200'}>
                {turnTimer}s
              </span>
            </div>
          </div>

          {/* Turn timer progress line */}
          <div className="w-36 md:w-44 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-1000 ${
                isLowTime ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>

        {/* Right: Board Status & Utility Controls */}
        <div className="flex items-center justify-end gap-1.5 pointer-events-auto">
          {/* Board validity pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${
              isBoardValid
                ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                : 'bg-rose-950/80 border-rose-600/60 text-rose-300 animate-pulse'
            }`}
          >
            {isBoardValid ? (
              <CheckCircle className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-rose-400" />
            )}
            <span>{isBoardValid ? 'Válida' : 'Inválida'}</span>
          </div>

          {/* Camera switcher */}
          <div className="hidden sm:flex bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden p-0.5">
            <button
              onClick={() => onChangeCamera('gameplay')}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition cursor-pointer ${
                cameraMode === 'gameplay' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Câmera Geral"
            >
              Geral
            </button>
            <button
              onClick={() => onChangeCamera('zoom-table')}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition cursor-pointer ${
                cameraMode === 'zoom-table' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Foco na Mesa"
            >
              Mesa
            </button>
            <button
              onClick={() => onChangeCamera('zoom-rack')}
              className={`px-2 py-0.5 text-[11px] rounded-lg transition cursor-pointer ${
                cameraMode === 'zoom-rack' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Foco no Suporte"
            >
              Suporte
            </button>
          </div>

          {/* Sound, Help & Menu */}
          <button
            onClick={onToggleMute}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 cursor-pointer"
            title="Alternar Som (M)"
            aria-label="Alternar som"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={onOpenRules}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 cursor-pointer"
            title="Regras"
            aria-label="Abrir regras"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
          </button>

          <button
            onClick={onOpenMenu}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 cursor-pointer"
            title="Menu (Esc)"
            aria-label="Abrir menu"
          >
            <Menu className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Floating Status / Hint Banner (if any) */}
      {statusMessage && (
        <div className="self-center bg-slate-900/95 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-xl text-xs md:text-sm shadow-2xl transition transform animate-fade-in pointer-events-auto flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Center Table Melds Quick-Insert Helpers (When tiles are selected) */}
      {isMyTurn && selectedTileIds.length > 0 && board.length > 0 && (
        <div className="self-center bg-slate-950/90 border border-amber-500/30 p-2.5 rounded-2xl shadow-2xl pointer-events-auto flex flex-wrap items-center justify-center gap-2 max-w-2xl mb-2">
          <span className="text-[11px] font-semibold text-amber-300 px-2">Inserir em jogo da mesa:</span>
          {board.map((meld, mIdx) => (
            <button
              key={mIdx}
              onClick={() => onInsertTileIntoMeld(mIdx)}
              className="flex items-center gap-1 bg-slate-900 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-400 px-2 py-1 rounded-lg text-xs text-slate-200 transition cursor-pointer"
            >
              <span>Jogo #{mIdx + 1} ({meld.length})</span>
              <Plus className="w-3 h-3 text-amber-400" />
            </button>
          ))}
        </div>
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center pointer-events-auto">
        {/* Collapse toggle tab */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-3.5 py-1 rounded-t-xl text-[11px] text-amber-300 font-semibold hover:bg-slate-800 transition cursor-pointer shadow-lg"
          aria-label={isDockCollapsed ? 'Expandir painel' : 'Recolher painel'}
        >
          {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDockCollapsed ? 'Mostrar Painel de Peças' : 'Ocultar Painel (Modo Cinema)'}</span>
        </button>

        {!isDockCollapsed && (
          <div className="w-full bg-slate-950/95 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-2xl">
            {/* Top Row: Quick Sort, Actions & Meld Form buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organizar:</span>
                <button
                  onClick={onSortByGroups}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-amber-200 transition cursor-pointer"
                  title="Agrupar por números iguais (7-7-7)"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>7-7-7 (Grupos)</span>
                </button>
                <button
                  onClick={onSortByRuns}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-blue-200 transition cursor-pointer"
                  title="Agrupar por sequências de mesma cor (1-2-3)"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>1-2-3 (Sequências)</span>
                </button>
              </div>

              {/* Turn Action Buttons */}
              <div className="flex items-center gap-2">
                {isMyTurn && hasPlayedThisTurn && (
                  <button
                    onClick={onResetTurn}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 rounded-lg text-xs text-rose-200 font-semibold transition cursor-pointer"
                    title="Desfazer jogadas deste turno"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Desfazer</span>
                  </button>
                )}

                {isMyTurn && selectedTileIds.length >= 3 && (
                  <button
                    onClick={onPlaySelectedToNewMeld}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg shadow transition cursor-pointer animate-pulse"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Baixar Jogo Selecionado ({selectedTileIds.length})</span>
                  </button>
                )}

                {isMyTurn ? (
                  hasPlayedThisTurn ? (
                    <button
                      onClick={onEndTurn}
                      disabled={!isBoardValid}
                      className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer ${
                        isBoardValid
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Finalizar Turno</span>
                    </button>
                  ) : (
                    <button
                      onClick={onDrawTile}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition transform active:scale-95 cursor-pointer"
                      title="Comprar 1 peça do monte e passar a vez"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Comprar Peça ({pouchCount} no Monte)</span>
                    </button>
                  )
                ) : (
                  <div className="text-xs text-slate-400 italic px-2">
                    Aguardando {activePlayer.name}...
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Interactive 2D Tiles Tray for accessibility & touch responsiveness */}
            <div className="pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  Suas Peças ({playerHand.length}) — Selecione para jogar ou toque no suporte 3D:
                </span>
                <span className="text-[11px] text-amber-300 font-medium">
                  {hasOpened ? 'Abertura Realizada ✓' : 'Abertura Pendente: Mínimo 30 pontos'}
                </span>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                {playerHand.map((tile) => {
                  const isSelected = selectedTileIds.includes(tile.id);
                  const colorConfig = COLOR_CLASSES[tile.color];
                  return (
                    <button
                      key={tile.id}
                      onClick={() => onTileSelect(tile.id)}
                      className={`shrink-0 w-9 md:w-11 h-13 md:h-16 rounded-lg flex flex-col items-center justify-center font-bold border shadow transition transform cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 -translate-y-2 ring-2 ring-amber-400 bg-amber-100'
                          : `${colorConfig.bg} ${colorConfig.border} hover:-translate-y-1`
                      }`}
                    >
                      {tile.isJoker ? (
                        <div className="text-center">
                          <span className="text-lg">🤡</span>
                          <span className="text-[9px] block text-purple-700 font-bold leading-tight">
                            JOKER
                          </span>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`text-base md:text-xl font-black ${colorConfig.text} leading-none`}
                          >
                            {tile.number}
                          </span>
                          {(tile.number === 6 || tile.number === 9) && (
                            <span className={`w-3.5 h-0.5 ${colorConfig.text.replace('text', 'bg')} mt-0.5`} />
                          )}
                          <span className={`w-2 h-2 rounded-full mt-1 ${colorConfig.text.replace('text', 'bg')}`} />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
