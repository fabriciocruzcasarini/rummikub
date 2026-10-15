import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Trophy,
  Users,
  BookOpen,
  RotateCcw,
  Play,
  Home,
  AlertCircle,
  HelpCircle,
  Share2,
} from 'lucide-react';
import { type PlayerInfo } from '../game/network.ts';

// 1. RULES MODAL
interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none pointer-events-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-lg">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Regras Oficiais do Rummikub</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 text-slate-200 text-sm leading-relaxed">
          <section className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <h4 className="text-amber-300 font-bold mb-1 flex items-center gap-1.5">
              <span>🎯 Objetivo do Jogo</span>
            </h4>
            <p className="text-xs text-slate-300">
              Ser o primeiro jogador a colocar todas as peças do seu suporte na mesa, formando jogos válidos de <strong>Grupos</strong> e <strong>Sequências</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-amber-300 font-bold">1. Tipos de Jogos Válidos (Mínimo de 3 Peças)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
                <span className="font-bold text-amber-200 block text-xs mb-1">
                  GRUPO (Trinca ou Quadra)
                </span>
                <p className="text-xs text-slate-300 mb-2">
                  3 ou 4 peças do <strong>mesmo número</strong> com <strong>cores todas diferentes</strong>.
                </p>
                <div className="flex gap-1.5">
                  <span className="w-6 h-8 rounded bg-white text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-400 shadow">7</span>
                  <span className="w-6 h-8 rounded bg-white text-red-700 font-bold text-xs flex items-center justify-center border border-red-400 shadow">7</span>
                  <span className="w-6 h-8 rounded bg-white text-amber-600 font-bold text-xs flex items-center justify-center border border-amber-400 shadow">7</span>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
                <span className="font-bold text-amber-200 block text-xs mb-1">
                  SEQUÊNCIA (Corrida)
                </span>
                <p className="text-xs text-slate-300 mb-2">
                  3 ou mais peças <strong>consecutivas</strong> da <strong>mesma cor</strong> (1 até 13).
                </p>
                <div className="flex gap-1.5">
                  <span className="w-6 h-8 rounded bg-white text-red-700 font-bold text-xs flex items-center justify-center border border-red-400 shadow">4</span>
                  <span className="w-6 h-8 rounded bg-white text-red-700 font-bold text-xs flex items-center justify-center border border-red-400 shadow">5</span>
                  <span className="w-6 h-8 rounded bg-white text-red-700 font-bold text-xs flex items-center justify-center border border-red-400 shadow">6</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-amber-950/30 border border-amber-700/40 p-3.5 rounded-xl">
            <h4 className="text-amber-300 font-bold mb-1 flex items-center gap-1.5">
              <span>⭐ Abertura Inicial (Mínimo de 30 Pontos)</span>
            </h4>
            <p className="text-xs text-slate-300">
              Na sua primeira jogada na partida, os jogos que você desce à mesa devem somar no total <strong>30 pontos ou mais</strong> usando apenas peças do seu suporte (sem pegar peças que já estão na mesa). Uma vez feita a abertura, nos turnos seguintes você pode jogar qualquer quantidade de pontos!
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-amber-300 font-bold">2. Manipulação da Mesa</h4>
            <p className="text-xs text-slate-300">
              Após sua abertura inicial, você pode adicionar peças a qualquer jogo na mesa, dividir sequências longas, trocar peças por coringas ou reorganizar a mesa livremente, desde que:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
              <li>Você coloque pelo menos uma peça do seu suporte durante a sua vez.</li>
              <li>Ao finalizar o turno, <strong>todos os jogos sobre a mesa continuem 100% válidos</strong> (mínimo de 3 peças por jogo).</li>
            </ul>
          </section>

          <section className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <h4 className="text-amber-300 font-bold mb-1">🤡 O Coringa</h4>
            <p className="text-xs text-slate-300">
              Substitui qualquer cor e número. Na pontuação final, um Coringa que sobrar no suporte de um jogador perdedor custa <strong>30 pontos de penalidade</strong>!
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Entendi, Voltar ao Jogo
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. ONLINE ROOM LOBBY MODAL
interface RoomLobbyModalProps {
  isOpen: boolean;
  roomCode: string;
  shareableUrl: string;
  players: PlayerInfo[];
  onStartGameWithBots: () => void;
  onClose: () => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  roomCode,
  shareableUrl,
  players,
  onStartGameWithBots,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyLink = () => {
    navigator.clipboard.writeText(shareableUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none pointer-events-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-amber-300">Sala Online para 3 Jogadores</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Code & Invite Link */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-5">
          <div className="text-center mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Código da Sala
            </span>
            <span className="text-2xl font-mono font-black text-amber-400 tracking-widest">
              {roomCode}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg p-2">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className="bg-transparent text-xs text-slate-300 font-mono w-full focus:outline-none overflow-x-auto"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-md transition shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Envie este link para até 2 amigos participarem da partida.
          </p>
        </div>

        {/* 3 Players Seats Status */}
        <div className="space-y-2 mb-6">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Jogadores na Mesa (3 Vagas):
          </span>
          {players.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </span>
                <span className="font-semibold text-slate-200">{p.name}</span>
                {p.isHost && (
                  <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                    Anfitrião
                  </span>
                )}
                {p.isBot && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                    Robô IA
                  </span>
                )}
              </div>
              <span className="text-emerald-400 font-medium">Pronto ✓</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={onStartGameWithBots}
          data-start="true"
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-xl transition cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>Iniciar Partida (Completar com Robôs se faltar)</span>
        </button>
      </div>
    </div>
  );
};

// 3. PAUSE / IN-GAME MENU MODAL
interface PauseMenuModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-amber-300">Jogo Pausado</h3>

        <div className="space-y-2 pt-2">
          <button
            onClick={onResume}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition cursor-pointer"
          >
            Continuar Partida
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition cursor-pointer"
          >
            Reiniciar Partida
          </button>
          <button
            onClick={onReturnToTitle}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-sm rounded-xl transition cursor-pointer"
          >
            Voltar ao Menu Principal
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. VICTORY / GAME OVER MODAL
interface GameOverModalProps {
  isOpen: boolean;
  winnerName: string;
  isLocalWinner: boolean;
  scores: { name: string; score: number; remainingTiles: number }[];
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerName,
  isLocalWinner,
  scores,
  onPlayAgain,
  onReturnToTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none pointer-events-auto">
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-3 bg-amber-500/20 border border-amber-400/40 rounded-full flex items-center justify-center text-amber-400">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-amber-300 mb-1">RUMMIKUB!</h2>
        <p className="text-slate-300 font-semibold text-base mb-4">
          {isLocalWinner ? '🎉 Parabéns! Você venceu a partida!' : `🏆 ${winnerName} esvaziou o suporte e venceu!`}
        </p>

        {/* Scores Table according to official Rummikub rules */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-5 text-left">
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 pb-2 border-b border-slate-800 uppercase">
            <span>Jogador</span>
            <span>Peças Restantes</span>
            <span>Pontos</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {scores.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 text-xs">
                <span className="font-semibold text-slate-200">{s.name}</span>
                <span className="text-slate-400 tabular-nums">{s.remainingTiles} peças</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    s.score > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {s.score > 0 ? `+${s.score}` : s.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onReturnToTitle}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Menu Principal
          </button>
          <button
            onClick={onPlayAgain}
            data-start="true"
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
          >
            Jogar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};
