import Peer, { type DataConnection } from 'peerjs';
import { type Tile } from './rules.ts';

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  tileCount: number;
  hasOpened: boolean;
  score: number;
}

export type NetworkMessage =
  | { type: 'join-request'; playerName: string }
  | { type: 'join-accepted'; playerIndex: number; players: PlayerInfo[]; board: Tile[][]; currentTurn: number; pouchCount: number }
  | { type: 'room-full' }
  | { type: 'state-sync'; board: Tile[][]; currentTurn: number; pouchCount: number; players: PlayerInfo[] }
  | { type: 'player-action-draw'; playerIndex: number }
  | { type: 'player-action-play'; playerIndex: number; newBoard: Tile[][]; remainingTileCount: number }
  | { type: 'chat'; sender: string; text: string }
  | { type: 'game-over'; winnerName: string; winnerIndex: number; scores: { name: string; score: number }[] };

export interface NetworkCallbacks {
  onPlayerJoined?: (playerIndex: number, name: string) => void;
  onPlayerLeft?: (playerIndex: number) => void;
  onStateSync?: (board: Tile[][], currentTurn: number, pouchCount: number, players: PlayerInfo[]) => void;
  onChatMessage?: (sender: string, text: string) => void;
  onGameOver?: (winnerName: string, scores: { name: string; score: number }[]) => void;
  onError?: (err: string) => void;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private connections: Map<number, DataConnection> = new Map();
  public isHost: boolean = true;
  public roomCode: string = '';
  public playerIndex: number = 0;
  private callbacks: NetworkCallbacks;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Host creates a new room with a code like 'RMK-928'
   */
  public createRoom(roomCode: string, hostName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.playerIndex = 0;
      this.roomCode = roomCode.toUpperCase();
      const peerId = `rummikub-p3-${this.roomCode.toLowerCase()}`;

      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Host error:', err);
          if (this.callbacks.onError) {
            this.callbacks.onError(`Erro de rede: ${err.type || 'Conexão falhou'}`);
          }
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Client joins an existing room by code
   */
  public joinRoom(roomCode: string, playerName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomCode = roomCode.toUpperCase();
      const targetPeerId = `rummikub-p3-${this.roomCode.toLowerCase()}`;

      try {
        this.peer = new Peer({
          debug: 1,
        });

        this.peer.on('open', () => {
          const conn = this.peer!.connect(targetPeerId);

          conn.on('open', () => {
            conn.send({
              type: 'join-request',
              playerName,
            } as NetworkMessage);
          });

          conn.on('data', (data) => {
            const msg = data as NetworkMessage;
            if (msg.type === 'join-accepted') {
              this.playerIndex = msg.playerIndex;
              this.connections.set(0, conn);
              if (this.callbacks.onStateSync) {
                this.callbacks.onStateSync(msg.board, msg.currentTurn, msg.pouchCount, msg.players);
              }
              resolve(this.playerIndex);
            } else if (msg.type === 'room-full') {
              if (this.callbacks.onError) {
                this.callbacks.onError('A sala já possui 3 jogadores.');
              }
              reject(new Error('Sala cheia'));
            } else {
              this.handleIncomingMessage(msg);
            }
          });

          conn.on('close', () => {
            if (this.callbacks.onError) {
              this.callbacks.onError('Conexão com o anfitrião foi encerrada.');
            }
          });

          conn.on('error', (err) => {
            if (this.callbacks.onError) {
              this.callbacks.onError(`Falha ao conectar à sala: ${err}`);
            }
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      if (msg.type === 'join-request') {
        // Find next available player slot (1 or 2)
        let slot = 1;
        if (this.connections.has(1)) {
          slot = 2;
        }
        if (this.connections.has(2)) {
          // Room full
          conn.send({ type: 'room-full' } as NetworkMessage);
          conn.close();
          return;
        }

        this.connections.set(slot, conn);
        if (this.callbacks.onPlayerJoined) {
          this.callbacks.onPlayerJoined(slot, msg.playerName);
        }
      } else {
        this.handleIncomingMessage(msg);
      }
    });

    conn.on('close', () => {
      for (const [slot, c] of this.connections.entries()) {
        if (c === conn) {
          this.connections.delete(slot);
          if (this.callbacks.onPlayerLeft) {
            this.callbacks.onPlayerLeft(slot);
          }
          break;
        }
      }
    });
  }

  private handleIncomingMessage(msg: NetworkMessage) {
    switch (msg.type) {
      case 'state-sync':
        if (this.callbacks.onStateSync) {
          this.callbacks.onStateSync(msg.board, msg.currentTurn, msg.pouchCount, msg.players);
        }
        break;
      case 'chat':
        if (this.callbacks.onChatMessage) {
          this.callbacks.onChatMessage(msg.sender, msg.text);
        }
        break;
      case 'game-over':
        if (this.callbacks.onGameOver) {
          this.callbacks.onGameOver(msg.winnerName, msg.scores);
        }
        break;
    }
  }

  /**
   * Broadcast state to all connected peers
   */
  public broadcastState(board: Tile[][], currentTurn: number, pouchCount: number, players: PlayerInfo[]) {
    const msg: NetworkMessage = {
      type: 'state-sync',
      board,
      currentTurn,
      pouchCount,
      players,
    };
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  public sendChat(sender: string, text: string) {
    const msg: NetworkMessage = {
      type: 'chat',
      sender,
      text,
    };
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  public getShareableUrl(): string {
    if (typeof window === 'undefined') return `https://fabriciocruz.ddns.net/rummikub#room=${this.roomCode}`;
    const base = window.location.origin.includes('fabriciocruz.ddns.net')
      ? `${window.location.origin}/rummikub`
      : `${window.location.origin}${window.location.pathname}`;
    return `${base}#room=${this.roomCode}`;
  }

  public disconnect() {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
