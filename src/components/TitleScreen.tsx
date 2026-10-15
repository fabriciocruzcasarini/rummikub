import React, { useState } from 'react';
import { Play, Users, BookOpen, Volume2, VolumeX, Copy, Check } from 'lucide-react';
import { sound } from '../game/audio.ts';

interface TitleScreenProps {
  onStartQuickGame: () => void;
  onCreateOnlineRoom: (roomCode: string, name: string) => void;
  onJoinOnlineRoom: (roomCode: string, name: string) => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  defaultRoomCode?: string;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartQuickGame,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onOpenRules,
  isMuted,
  onToggleMute,
  defaultRoomCode = '',
}) => {
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'join'>('none');
  const [playerName, setPlayerName] = useState('Jogador 1');
  const [joinCode, setJoinCode] = useState(defaultRoomCode);
  const [createdCode, setCreatedCode] = useState(() =>
    'RMK-' + Math.floor(100 + Math.random() * 900)
  );

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      onCreateOnlineRoom(createdCode, playerName);
    } else if (modalMode === 'join' && joinCode.trim()) {
      onJoinOnlineRoom(joinCode.trim().toUpperCase(), playerName);
    }
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-10 select-none">
      {/* Top Header Controls */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 px-3 py-1.5 rounded-lg text-slate-300 text-xs tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>ONLINE 3 JOGADORES</span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-lg text-amber-200 transition text-sm cursor-pointer"
          title="Alternar Áudio (M)"
          aria-label="Alternar som"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="font-medium text-xs">{isMuted ? 'MUDO' : 'SOM ATIVO'}</span>
        </button>
      </div>

      {/* Main Title Hero Area (Over negative space) */}
      <div className="flex flex-col items-center text-center max-w-xl mx-auto my-auto pointer-events-auto">
        {/* Custom Bespoke Inline SVG Title Lockup */}
        <div className="relative mb-6">
          <svg className="w-72 md:w-96 h-auto drop-shadow-2xl" viewBox="0 0 400 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Tile 1: R */}
            <rect x="10" y="10" width="60" height="85" rx="8" fill="#fcf8ed" stroke="#d5c7a5" strokeWidth="3" />
            <rect x="14" y="14" width="52" height="77" rx="6" fill="#fefbf3" />
            <text x="40" y="66" fill="#1d4ed8" fontSize="48" fontWeight="bold" fontFamily="Trebuchet MS, sans-serif" textAnchor="middle">R</text>
            <circle cx="40" cy="80" r="3" fill="#1d4ed8" />

            {/* Tile 2: U */}
            <rect x="75" y="10" width="60" height="85" rx="8" fill="#fcf8ed" stroke="#d5c7a5" strokeWidth="3" />
            <rect x="79" y="14" width="52" height="77" rx="6" fill="#fefbf3" />
            <text x="105" y="66" fill="#dc2626" fontSize="48" fontWeight="bold" fontFamily="Trebuchet MS, sans-serif" textAnchor="middle">U</text>
            <circle cx="105" cy="80" r="3" fill="#dc2626" />

            {/* Tile 3: M */}
            <rect x="140" y="10" width="60" height="85" rx="8" fill="#fcf8ed" stroke="#d5c7a5" strokeWidth="3" />
            <rect x="144" y="14" width="52" height="77" rx="6" fill="#fefbf3" />
            <text x="170" y="66" fill="#d97706" fontSize="44" fontWeight="bold" fontFamily="Trebuchet MS, sans-serif" textAnchor="middle">M</text>
            <circle cx="170" cy="80" r="3" fill="#d97706" />

            {/* Tile 4: M */}
            <rect x="205" y="10" width="60" height="85" rx="8" fill="#fcf8ed" stroke="#d5c7a5" strokeWidth="3" />
            <rect x="209" y="14" width="52" height="77" rx="6" fill="#fefbf3" />
            <text x="235" y="66" fill="#18181b" fontSize="44" fontWeight="bold" fontFamily="Trebuchet MS, sans-serif" textAnchor="middle">M</text>
            <circle cx="235" cy="80" r="3" fill="#18181b" />

            {/* Tile 5: I */}
            <rect x="270" y="10" width="55" height="85" rx="8" fill="#fcf8ed" stroke="#d5c7a5" strokeWidth="3" />
            <rect x="274" y="14" width="47" height="77" rx="6" fill="#fefbf3" />
            <text x="297" y="66" fill="#1d4ed8" fontSize="48" fontWeight="bold" fontFamily="Trebuchet MS, sans-serif" textAnchor="middle">I</text>
            <circle cx="297" cy="80" r="3" fill="#1d4ed8" />

            {/* Tile 6: 3D Badge */}
            <rect x="330" y="18" width="60" height="72" rx="8" fill="#b91c1c" stroke="#fca5a5" strokeWidth="2" />
            <text x="360" y="62" fill="#ffffff" fontSize="34" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">3D</text>
          </svg>
        </div>

        <p className="text-amber-100/80 text-sm md:text-base font-medium mb-8 max-w-md">
          A clássica disputa de sequências e grupos em uma mesa 3D tátil para 3 jogadores online ou contra inteligência artificial.
        </p>

        {/* Action Buttons */}
        {modalMode === 'none' && (
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <button
              onClick={onStartQuickGame}
              data-start="true"
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base px-6 py-3.5 rounded-xl shadow-xl shadow-amber-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Jogar Rápido (Solo)</span>
            </button>

            <button
              onClick={() => setModalMode('create')}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-amber-200 border border-amber-500/40 font-semibold text-base px-5 py-3.5 rounded-xl shadow-lg transition transform active:scale-95 cursor-pointer"
            >
              <Users className="w-5 h-5 text-amber-400" />
              <span>Criar Sala Online</span>
            </button>
          </div>
        )}

        {/* Sub-menu actions */}
        {modalMode === 'none' && (
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setModalMode('join')}
              className="text-xs text-amber-200/90 hover:text-amber-300 underline underline-offset-4 cursor-pointer font-medium"
            >
              Entrar em Sala Existente
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={onOpenRules}
              className="flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-amber-300 cursor-pointer font-medium"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Regras Oficiais</span>
            </button>
          </div>
        )}

        {/* Inline Create/Join Modal Box */}
        {modalMode !== 'none' && (
          <form
            onSubmit={handleStartSubmit}
            className="w-full max-w-sm bg-slate-900/95 border border-amber-500/30 p-5 rounded-2xl shadow-2xl text-left"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-amber-300 font-bold text-base">
                {modalMode === 'create' ? 'Configurar Sala Online (3 Jogadores)' : 'Entrar em Sala Online'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-amber-100/70 mb-1">Seu Nome / Apelido:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={15}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              {modalMode === 'create' ? (
                <div>
                  <label className="block text-xs font-semibold text-amber-100/70 mb-1">Código da Sala:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdCode}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedCode('RMK-' + Math.floor(100 + Math.random() * 900));
                        sound.playTileClick();
                      }}
                      className="px-2.5 py-2 bg-slate-800 text-xs text-amber-300 rounded-lg hover:bg-slate-700 cursor-pointer"
                      title="Gerar outro código"
                    >
                      Novo
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Você poderá compartilhar o link com até 2 amigos ou preencher com robôs.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-amber-100/70 mb-1">Código da Sala:</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Ex: RMK-123"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-100 uppercase font-mono font-bold tracking-wider focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                data-start="true"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                {modalMode === 'create' ? 'Criar & Jogar' : 'Conectar'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Control Hint Line */}
      <div className="text-center text-slate-400/80 text-xs tracking-wider">
        <span>WASD / Mouse Girar Câmera · Espaço Comprar Peça · Esc Menu · 1-2-3 Atalhos</span>
      </div>
    </div>
  );
};
