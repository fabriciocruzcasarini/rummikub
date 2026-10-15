import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  type Tile,
  generateDeck,
  dealHands,
  isValidMeld,
  isBoardValid,
  calculateMeldPoints,
  calculateHandScore,
  sortRackByGroups,
  sortRackByRuns,
  calculateBotTurn,
} from './game/rules.ts';
import { RummikubScene } from './game/threeScene.ts';
import { NetworkManager, type PlayerInfo } from './game/network.ts';
import { sound } from './game/audio.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import {
  RulesModal,
  RoomLobbyModal,
  PauseMenuModal,
  GameOverModal,
} from './components/Modals.tsx';

type GameState = 'title' | 'lobby' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RummikubScene | null>(null);
  const networkRef = useRef<NetworkManager | null>(null);

  // Core Game State
  const [gameState, setGameState] = useState<GameState>('title');
  const [currentTurn, setCurrentTurn] = useState<number>(0); // 0 = Player 1 (You), 1 = Player 2, 2 = Player 3
  const [turnTimer, setTurnTimer] = useState<number>(60);
  const maxTimer = 60;
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [cameraMode, setCameraMode] = useState<'gameplay' | 'zoom-table' | 'zoom-rack'>('gameplay');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Deck & Board State
  const [deck, setDeck] = useState<Tile[]>([]);
  const [playerHands, setPlayerHands] = useState<Tile[][]>([[], [], []]);
  const [board, setBoard] = useState<Tile[][]>([]);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);

  // Turn Snapshots for "Desfazer Jogada"
  const turnSnapshotRef = useRef<{ board: Tile[][]; hand: Tile[] }>({ board: [], hand: [] });
  const [hasPlayedThisTurn, setHasPlayedThisTurn] = useState<boolean>(false);

  // Players Information
  const [players, setPlayers] = useState<PlayerInfo[]>([
    { id: 'p1', name: 'Você', isHost: true, isBot: false, tileCount: 14, hasOpened: false, score: 0 },
    { id: 'p2', name: 'Robô Sofia', isHost: false, isBot: true, tileCount: 14, hasOpened: false, score: 0 },
    { id: 'p3', name: 'Robô Lucas', isHost: false, isBot: true, tileCount: 14, hasOpened: false, score: 0 },
  ]);

  // Online Room State
  const [roomCode, setRoomCode] = useState<string>('');
  const [shareableUrl, setShareableUrl] = useState<string>('');

  // Modals Visibility
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<{
    name: string;
    isLocalWinner: boolean;
    scores: { name: string; score: number; remainingTiles: number }[];
  }>({ name: '', isLocalWinner: false, scores: [] });

  // Update body dataset state for styling and ultra-mode verification
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Helper to show temporary status banner
  const showBanner = useCallback((msg: string, duration = 3000) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, duration);
  }, []);

  // Initialize 3D Scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new RummikubScene(canvasMountRef.current, {
      onTileClick: (tileId, location, meldIndex) => {
        if (location === 'rack') {
          handleTileToggle(tileId);
        } else if (location === 'pouch') {
          if (currentTurn === 0) {
            handleDrawTile();
          }
        } else if (location === 'board' && meldIndex !== undefined) {
          if (selectedTileIds.length > 0 && currentTurn === 0) {
            handleInsertSelectedIntoMeld(meldIndex);
          }
        }
      },
    });

    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Synchronize 3D Scene with current Game State
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.setCameraView(gameState === 'title' ? 'title' : cameraMode);

    sceneRef.current.updateSceneState({
      playerHand: playerHands[0] || [],
      player2Count: playerHands[1]?.length || 0,
      player3Count: playerHands[2]?.length || 0,
      board: board,
      pouchCount: deck.length,
      selectedTileId: selectedTileIds.length === 1 ? selectedTileIds[0] : null,
    });
  }, [gameState, cameraMode, playerHands, board, deck, selectedTileIds]);

  // Toggle tile selection
  const handleTileToggle = useCallback((tileId: string) => {
    sound.playTileClick();
    setSelectedTileIds((prev) =>
      prev.includes(tileId) ? prev.filter((id) => id !== tileId) : [...prev, tileId]
    );
  }, []);

  // Sort Rack
  const handleSortByGroups = useCallback(() => {
    sound.playTileClick();
    setPlayerHands((prev) => {
      const next = [...prev];
      next[0] = sortRackByGroups(next[0]);
      return next;
    });
  }, []);

  const handleSortByRuns = useCallback(() => {
    sound.playTileClick();
    setPlayerHands((prev) => {
      const next = [...prev];
      next[0] = sortRackByRuns(next[0]);
      return next;
    });
  }, []);

  // Start a fresh game
  const startNewGame = useCallback((customPlayers?: PlayerInfo[]) => {
    const fullDeck = generateDeck();
    const { hands, remainingDeck } = dealHands(fullDeck, 3);

    // Initial hands sorted by runs
    const sortedHands = hands.map((h) => sortRackByRuns(h));

    setDeck(remainingDeck);
    setPlayerHands(sortedHands);
    setBoard([]);
    setSelectedTileIds([]);
    setCurrentTurn(0);
    setTurnTimer(60);
    setHasPlayedThisTurn(false);

    const activePlayers = customPlayers || [
      { id: 'p1', name: 'Você', isHost: true, isBot: false, tileCount: 14, hasOpened: false, score: 0 },
      { id: 'p2', name: 'Robô Sofia', isHost: false, isBot: true, tileCount: 14, hasOpened: false, score: 0 },
      { id: 'p3', name: 'Robô Lucas', isHost: false, isBot: true, tileCount: 14, hasOpened: false, score: 0 },
    ];

    setPlayers(activePlayers);
    turnSnapshotRef.current = { board: [], hand: [...sortedHands[0]] };

    setGameState('playing');
    setCameraMode('gameplay');
    setIsLobbyOpen(false);
    setIsPauseOpen(false);
    setIsGameOverOpen(false);

    sound.playTurnStart();
    showBanner('Sua vez! Se for sua primeira jogada, desça 30+ pontos para abrir.');
  }, [showBanner]);

  // Check URL autostart or room hash on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startNewGame();
      return;
    }

    const hash = window.location.hash;
    if (hash.startsWith('#room=')) {
      const code = hash.replace('#room=', '').trim();
      if (code) {
        setRoomCode(code);
      }
    }
  }, [startNewGame]);

  // Turn Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          // Time expired! Revert turn if played invalidly, or auto-draw
          handleTurnTimeout();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentTurn, hasPlayedThisTurn, board, playerHands]);

  // Handle Turn Timeout
  const handleTurnTimeout = useCallback(() => {
    if (currentTurn === 0) {
      // If local player was playing and left board invalid, apply penalty (revert + 3 penalty tiles)
      if (hasPlayedThisTurn && !isBoardValid(board)) {
        sound.playError();
        showBanner('Tempo esgotado com mesa inválida! Penalidade: 3 peças.');
        // Revert board & hand
        setBoard(turnSnapshotRef.current.board);
        setPlayerHands((prev) => {
          const next = [...prev];
          const penaltyTiles = deck.slice(0, 3);
          next[0] = [...turnSnapshotRef.current.hand, ...penaltyTiles];
          return next;
        });
        setDeck((prev) => prev.slice(3));
      } else if (!hasPlayedThisTurn) {
        // Auto draw 1 tile
        handleDrawTile();
        return;
      }
    }
    advanceTurn();
  }, [currentTurn, hasPlayedThisTurn, board, deck]);

  // Advance turn to next player
  const advanceTurn = useCallback(() => {
    const nextTurn = (currentTurn + 1) % 3;
    setCurrentTurn(nextTurn);
    setTurnTimer(60);
    setHasPlayedThisTurn(false);
    setSelectedTileIds([]);

    // Save snapshot for next player if local
    if (nextTurn === 0) {
      turnSnapshotRef.current = {
        board: JSON.parse(JSON.stringify(board)),
        hand: [...playerHands[0]],
      };
      sound.playTurnStart();
      showBanner('Sua vez de jogar!');
    }
  }, [currentTurn, board, playerHands, showBanner]);

  // Bot Turn Simulation (Player 2 and Player 3)
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (currentTurn === 0) return; // Local user turn

    const botPlayer = players[currentTurn];
    if (!botPlayer || !botPlayer.isBot) return;

    // Natural bot thinking delay (1.2s - 2.0s)
    const timeout = setTimeout(() => {
      const botHand = playerHands[currentTurn];
      const botResult = calculateBotTurn(botHand, board, botPlayer.hasOpened);

      if (botResult.action === 'play') {
        sound.playTilePlace();
        setBoard(botResult.newBoard);
        setPlayerHands((prev) => {
          const next = [...prev];
          next[currentTurn] = botResult.newRack;
          return next;
        });
        setPlayers((prev) => {
          const next = [...prev];
          next[currentTurn].hasOpened = true;
          next[currentTurn].tileCount = botResult.newRack.length;
          return next;
        });
        showBanner(`${botPlayer.name} desceu peças na mesa!`);

        // Check if bot emptied hand
        if (botResult.newRack.length === 0) {
          handleGameOver(currentTurn);
          return;
        }
      } else {
        // Bot draws a tile
        if (deck.length > 0) {
          const drawn = deck[0];
          const newDeck = deck.slice(1);
          const newBotHand = [...botHand, drawn];
          sound.playDrawTile();
          setDeck(newDeck);
          setPlayerHands((prev) => {
            const next = [...prev];
            next[currentTurn] = newBotHand;
            return next;
          });
          setPlayers((prev) => {
            const next = [...prev];
            next[currentTurn].tileCount = newBotHand.length;
            return next;
          });
          showBanner(`${botPlayer.name} comprou uma peça.`);
        }
      }

      // Next turn
      advanceTurn();
    }, 1800);

    return () => clearTimeout(timeout);
  }, [gameState, currentTurn, board, playerHands, players, deck, advanceTurn]);

  // Local Player Action: Draw Tile from Pouch
  const handleDrawTile = useCallback(() => {
    if (currentTurn !== 0) return;
    if (deck.length === 0) {
      showBanner('O monte de peças acabou!');
      advanceTurn();
      return;
    }

    // If player has already played tiles this turn, they cannot draw without resetting!
    if (hasPlayedThisTurn) {
      showBanner('Você já jogou peças neste turno! Finalize o turno ou desfaça a jogada.');
      sound.playError();
      return;
    }

    sound.playDrawTile();
    const drawnTile = deck[0];
    const newDeck = deck.slice(1);

    setDeck(newDeck);
    setPlayerHands((prev) => {
      const next = [...prev];
      next[0] = [...next[0], drawnTile];
      return next;
    });
    setPlayers((prev) => {
      const next = [...prev];
      next[0].tileCount = next[0].tileCount + 1;
      return next;
    });

    showBanner(`Você comprou: ${drawnTile.isJoker ? 'Coringa 🤡' : `${drawnTile.number} ${drawnTile.color}`}`);
    advanceTurn();
  }, [currentTurn, deck, hasPlayedThisTurn, advanceTurn, showBanner]);

  // Local Player Action: Form New Meld with Selected Tiles
  const handlePlaySelectedToNewMeld = useCallback(() => {
    if (currentTurn !== 0) return;
    const selected = playerHands[0].filter((t) => selectedTileIds.includes(t.id));

    if (selected.length < 3) {
      sound.playError();
      showBanner('Selecione pelo menos 3 peças para formar um jogo!');
      return;
    }

    if (!isValidMeld(selected)) {
      sound.playError();
      showBanner('Jogo inválido! Deve ser um Grupo (mesmo nº, cores diferentes) ou Sequência (mesma cor).');
      return;
    }

    // Check 30-point rule for initial meld
    const localPlayer = players[0];
    if (!localPlayer.hasOpened) {
      const points = calculateMeldPoints(selected);
      if (points < 30) {
        sound.playError();
        showBanner(`Abertura requer no mínimo 30 pontos! Este jogo soma apenas ${points} pontos.`);
        return;
      }
    }

    sound.playTilePlace();
    // Remove from hand and add to board
    setPlayerHands((prev) => {
      const next = [...prev];
      next[0] = next[0].filter((t) => !selectedTileIds.includes(t.id));
      return next;
    });
    setBoard((prev) => [...prev, selected]);
    setSelectedTileIds([]);
    setHasPlayedThisTurn(true);

    showBanner('Jogo adicionado à mesa!');
  }, [currentTurn, playerHands, selectedTileIds, players, showBanner]);

  // Local Player Action: Insert Selected Tile(s) into existing board meld
  const handleInsertSelectedIntoMeld = useCallback(
    (meldIndex: number) => {
      if (currentTurn !== 0) return;
      const localPlayer = players[0];
      if (!localPlayer.hasOpened) {
        sound.playError();
        showBanner('Você precisa fazer a abertura inicial de 30 pontos antes de mexer na mesa!');
        return;
      }

      const selected = playerHands[0].filter((t) => selectedTileIds.includes(t.id));
      if (selected.length === 0) return;

      const targetMeld = board[meldIndex];
      const newMeld = [...targetMeld, ...selected];

      // Remove from hand and update board
      sound.playTilePlace();
      setPlayerHands((prev) => {
        const next = [...prev];
        next[0] = next[0].filter((t) => !selectedTileIds.includes(t.id));
        return next;
      });
      setBoard((prev) => prev.map((m, idx) => (idx === meldIndex ? newMeld : m)));
      setSelectedTileIds([]);
      setHasPlayedThisTurn(true);
      showBanner(`Peça(s) adicionada(s) ao Jogo #${meldIndex + 1}!`);
    },
    [currentTurn, players, playerHands, selectedTileIds, board, showBanner]
  );

  // Local Player Action: Reset turn (Desfazer)
  const handleResetTurn = useCallback(() => {
    sound.playTileClick();
    setBoard(turnSnapshotRef.current.board);
    setPlayerHands((prev) => {
      const next = [...prev];
      next[0] = [...turnSnapshotRef.current.hand];
      return next;
    });
    setSelectedTileIds([]);
    setHasPlayedThisTurn(false);
    showBanner('Jogada desfeita! Mesa e suporte restaurados.');
  }, [showBanner]);

  // Local Player Action: End Turn
  const handleEndTurn = useCallback(() => {
    if (currentTurn !== 0) return;

    if (!hasPlayedThisTurn) {
      showBanner('Você deve jogar pelo menos uma peça do seu suporte ou comprar uma peça!');
      sound.playError();
      return;
    }

    if (!isBoardValid(board)) {
      sound.playError();
      showBanner('Mesa Inválida! Todos os jogos devem ter no mínimo 3 peças e ser válidos.');
      return;
    }

    // Mark opened
    setPlayers((prev) => {
      const next = [...prev];
      next[0].hasOpened = true;
      next[0].tileCount = playerHands[0].length;
      return next;
    });

    // Check if player won!
    if (playerHands[0].length === 0) {
      handleGameOver(0);
      return;
    }

    sound.playTileClick();
    showBanner('Turno concluído com sucesso!');
    advanceTurn();
  }, [currentTurn, hasPlayedThisTurn, board, playerHands, advanceTurn, showBanner]);

  // Game Over Handler
  const handleGameOver = useCallback(
    (winnerIdx: number) => {
      sound.playVictory();
      setGameState('gameover');

      // Trigger Confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}

      const winner = players[winnerIdx];
      const isLocalWinner = winnerIdx === 0;

      // Calculate official Rummikub scores
      // Losers get negative points of their remaining tiles.
      // Winner gets positive sum of all losers' remaining tiles.
      let totalWinnerPoints = 0;
      const scores = players.map((p, idx) => {
        const remaining = playerHands[idx] || [];
        if (idx === winnerIdx) {
          return { name: p.name, score: 0, remainingTiles: 0 };
        }
        const penalty = calculateHandScore(remaining);
        totalWinnerPoints += penalty;
        return { name: p.name, score: -penalty, remainingTiles: remaining.length };
      });

      // Set winner's score
      scores[winnerIdx].score = totalWinnerPoints;

      setWinnerInfo({
        name: winner.name,
        isLocalWinner,
        scores,
      });
      setIsGameOverOpen(true);
    },
    [players, playerHands]
  );

  // Online Multiplayer Room Handlers
  const handleCreateOnlineRoom = useCallback((code: string, name: string) => {
    setRoomCode(code);
    const net = new NetworkManager({
      onPlayerJoined: (slot, pName) => {
        sound.playTurnStart();
        showBanner(`${pName} entrou na sala!`);
        setPlayers((prev) => {
          const next = [...prev];
          next[slot] = {
            id: `p${slot + 1}`,
            name: pName,
            isHost: false,
            isBot: false,
            tileCount: 14,
            hasOpened: false,
            score: 0,
          };
          return next;
        });
      },
      onPlayerLeft: (slot) => {
        showBanner(`Jogador ${slot + 1} saiu. Substituído por Robô.`);
        setPlayers((prev) => {
          const next = [...prev];
          next[slot] = {
            id: `p${slot + 1}`,
            name: `Robô ${slot === 1 ? 'Sofia' : 'Lucas'}`,
            isHost: false,
            isBot: true,
            tileCount: 14,
            hasOpened: false,
            score: 0,
          };
          return next;
        });
      },
    });

    networkRef.current = net;
    net.createRoom(code, name).then(() => {
      setShareableUrl(net.getShareableUrl());
      setPlayers((prev) => {
        const next = [...prev];
        next[0].name = name;
        return next;
      });
      setIsLobbyOpen(true);
    });
  }, [showBanner]);

  const handleJoinOnlineRoom = useCallback((code: string, name: string) => {
    const net = new NetworkManager({
      onError: (err) => showBanner(err),
    });
    networkRef.current = net;
    net.joinRoom(code, name).then(() => {
      showBanner(`Conectado à sala ${code}!`);
      startNewGame();
    }).catch(() => {
      showBanner('Não foi possível conectar à sala. Iniciando modo solo.');
      startNewGame();
    });
  }, [showBanner, startNewGame]);

  // Keyboard Shortcuts: Enter/Space to start/draw, Esc to pause, M to mute, 1/2 to sort
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'KeyM') {
        const muted = sound.toggleMute();
        setIsMuted(muted);
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          setIsPauseOpen((prev) => !prev);
        }
      } else if (e.code === 'Digit1') {
        if (gameState === 'playing') handleSortByGroups();
      } else if (e.code === 'Digit2') {
        if (gameState === 'playing') handleSortByRuns();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (gameState === 'title') {
          startNewGame();
        } else if (gameState === 'playing' && currentTurn === 0 && !hasPlayedThisTurn) {
          handleDrawTile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentTurn, hasPlayedThisTurn, handleDrawTile, handleSortByGroups, handleSortByRuns, startNewGame]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          onStartQuickGame={() => startNewGame()}
          onCreateOnlineRoom={handleCreateOnlineRoom}
          onJoinOnlineRoom={handleJoinOnlineRoom}
          onOpenRules={() => setIsRulesOpen(true)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(sound.toggleMute())}
          defaultRoomCode={roomCode}
        />
      )}

      {/* Screen 2: In-Game Playing HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <GameHUD
          currentTurn={currentTurn}
          localPlayerIndex={0}
          players={players}
          turnTimer={turnTimer}
          maxTimer={maxTimer}
          isBoardValid={isBoardValid(board)}
          hasPlayedThisTurn={hasPlayedThisTurn}
          hasOpened={players[0]?.hasOpened || false}
          pouchCount={deck.length}
          playerHand={playerHands[0] || []}
          selectedTileIds={selectedTileIds}
          board={board}
          cameraMode={cameraMode}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(sound.toggleMute())}
          onChangeCamera={(mode) => setCameraMode(mode)}
          onTileSelect={handleTileToggle}
          onSortByGroups={handleSortByGroups}
          onSortByRuns={handleSortByRuns}
          onPlaySelectedToNewMeld={handlePlaySelectedToNewMeld}
          onInsertTileIntoMeld={handleInsertSelectedIntoMeld}
          onDrawTile={handleDrawTile}
          onEndTurn={handleEndTurn}
          onResetTurn={handleResetTurn}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenMenu={() => setIsPauseOpen(true)}
          statusMessage={statusMessage}
        />
      )}

      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      <RoomLobbyModal
        isOpen={isLobbyOpen}
        roomCode={roomCode}
        shareableUrl={shareableUrl}
        players={players}
        onStartGameWithBots={() => startNewGame(players)}
        onClose={() => setIsLobbyOpen(false)}
      />

      <PauseMenuModal
        isOpen={isPauseOpen}
        onResume={() => setIsPauseOpen(false)}
        onRestart={() => startNewGame()}
        onReturnToTitle={() => {
          setIsPauseOpen(false);
          setGameState('title');
        }}
      />

      <GameOverModal
        isOpen={isGameOverOpen}
        winnerName={winnerInfo.name}
        isLocalWinner={winnerInfo.isLocalWinner}
        scores={winnerInfo.scores}
        onPlayAgain={() => startNewGame()}
        onReturnToTitle={() => {
          setIsGameOverOpen(false);
          setGameState('title');
        }}
      />
    </main>
  );
}
