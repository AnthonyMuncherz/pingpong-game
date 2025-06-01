import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  position: number;
  score: number;
  ready?: boolean;
}

interface Ball {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

interface GameRoom {
  id: string;
  players: Player[];
  ball: Ball;
  gameState: 'waiting' | 'ready-check' | 'countdown' | 'playing' | 'paused' | 'finished';
  countdown?: number | null;
  countdownStartTime?: Date | null;
  createdAt: Date;
}

interface GameSettings {
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
  PADDLE_HEIGHT: number;
  PADDLE_WIDTH: number;
  BALL_SIZE: number;
  BALL_SPEED: number;
  PADDLE_SPEED: number;
  WINNING_SCORE: number;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerId, setPlayerId] = useState<number>(-1);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [error, setError] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setError('');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('room-joined', (data: { roomCode: string; playerId: number; gameSettings: GameSettings }) => {
      console.log('Room joined:', data);
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setGameSettings(data.gameSettings);
      setError('');
    });

    socket.on('room-error', (message: string) => {
      console.log('Room error:', message);
      setError(message);
    });

    socket.on('room-update', (room: GameRoom) => {
      console.log('Room updated:', room);
      setGameRoom(room);
    });

    socket.on('game-start', (room: GameRoom) => {
      console.log('Game started!', room);
      setGameRoom(room);
    });

    socket.on('game-update', (room: GameRoom) => {
      setGameRoom(room);
    });

    socket.on('player-left', (room: GameRoom) => {
      console.log('Player left:', room);
      setGameRoom(room);
    });

    socket.on('countdown-update', (data: { countdown: number }) => {
      console.log('Countdown update:', data.countdown);
      setCountdown(data.countdown);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = (roomCode: string, playerName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { roomCode, playerName });
    }
  };

  const createRoom = (playerName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { playerName });
    }
  };

  const movePaddle = (direction: 'up' | 'down') => {
    if (socketRef.current && gameRoom?.gameState === 'playing') {
      socketRef.current.emit('paddle-move', { direction });
    }
  };

  const setPlayerReady = (ready: boolean) => {
    if (socketRef.current && gameRoom?.gameState === 'ready-check') {
      socketRef.current.emit('player-ready', { ready });
    }
  };

  return {
    connected,
    roomCode,
    playerId,
    gameRoom,
    gameSettings,
    error,
    countdown,
    joinRoom,
    createRoom,
    movePaddle,
    setPlayerReady
  };
}; 