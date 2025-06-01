import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface GameRoom {
  id: string;
  players: Array<{
    id: string;
    name: string;
    position: number;
    score: number;
  }>;
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  gameState: 'waiting' | 'playing' | 'paused' | 'finished';
  createdAt: Date;
}

interface ServerWithSocket extends NetServer {
  io?: SocketIOServer;
}

const gameRooms = new Map<string, GameRoom>();

// Konstant utk game settings - ni style casual MY, bukan AI punya
const GAME_SETTINGS = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 400,
  PADDLE_HEIGHT: 80,
  PADDLE_WIDTH: 10,
  BALL_SIZE: 10,
  BALL_SPEED: 5,
  PADDLE_SPEED: 8,
  WINNING_SCORE: 5
};

function createNewRoom(): GameRoom {
  return {
    id: uuidv4().substring(0, 6).toUpperCase(),
    players: [],
    ball: {
      x: GAME_SETTINGS.CANVAS_WIDTH / 2,
      y: GAME_SETTINGS.CANVAS_HEIGHT / 2,
      velocityX: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      velocityY: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    },
    gameState: 'waiting',
    createdAt: new Date()
  };
}

function updateBallPosition(room: GameRoom): void {
  const { ball } = room;
  const { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE } = GAME_SETTINGS;

  // Update ball position
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  // Collision dgn top/bottom walls
  if (ball.y <= 0 || ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
    ball.velocityY = -ball.velocityY;
  }

  // Collision dgn paddles
  const player1 = room.players[0];
  const player2 = room.players[1];

  if (player1 && player2) {
    // Left paddle collision (player 1)
    if (ball.x <= PADDLE_WIDTH && 
        ball.y >= player1.position && 
        ball.y <= player1.position + PADDLE_HEIGHT) {
      ball.velocityX = Math.abs(ball.velocityX);
      ball.velocityY += (ball.y - (player1.position + PADDLE_HEIGHT/2)) * 0.1;
    }

    // Right paddle collision (player 2)
    if (ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE && 
        ball.y >= player2.position && 
        ball.y <= player2.position + PADDLE_HEIGHT) {
      ball.velocityX = -Math.abs(ball.velocityX);
      ball.velocityY += (ball.y - (player2.position + PADDLE_HEIGHT/2)) * 0.1;
    }
  }

  // Scoring - ball keluar kiri/kanan
  if (ball.x < 0) {
    if (player2) player2.score++;
    resetBall(room);
  } else if (ball.x > CANVAS_WIDTH) {
    if (player1) player1.score++;
    resetBall(room);
  }

  // Check winning condition
  if (player1?.score >= GAME_SETTINGS.WINNING_SCORE || player2?.score >= GAME_SETTINGS.WINNING_SCORE) {
    room.gameState = 'finished';
  }
}

function resetBall(room: GameRoom): void {
  room.ball = {
    x: GAME_SETTINGS.CANVAS_WIDTH / 2,
    y: GAME_SETTINGS.CANVAS_HEIGHT / 2,
    velocityX: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    velocityY: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
  };
}

export async function GET() {
  return new Response('Socket.IO server is running', { status: 200 });
}

// Handle socket connections
export async function POST(req: NextRequest) {
  if (typeof window !== 'undefined') {
    return new Response('This endpoint is for server-side only', { status: 400 });
  }

  const res = (global as any).res as any;
  const server: ServerWithSocket = res?.socket?.server;

  if (!server?.io) {
    console.log('Setting up Socket.IO server...');
    
    const io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    server.io = io;

    io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);

      // Join or create room
      socket.on('join-room', (data: { roomCode?: string; playerName: string }) => {
        const { roomCode, playerName } = data;
        let room: GameRoom;

        if (roomCode && gameRooms.has(roomCode)) {
          // Join existing room
          room = gameRooms.get(roomCode)!;
          if (room.players.length >= 2) {
            socket.emit('room-error', 'Room is full!');
            return;
          }
        } else {
          // Create new room
          room = createNewRoom();
          gameRooms.set(room.id, room);
        }

        // Add player to room
        const playerId = room.players.length;
        room.players.push({
          id: socket.id,
          name: playerName,
          position: GAME_SETTINGS.CANVAS_HEIGHT / 2 - GAME_SETTINGS.PADDLE_HEIGHT / 2,
          score: 0
        });

        socket.join(room.id);
        socket.emit('room-joined', { 
          roomCode: room.id, 
          playerId,
          gameSettings: GAME_SETTINGS 
        });

        // Start game if 2 players
        if (room.players.length === 2) {
          room.gameState = 'playing';
          io.to(room.id).emit('game-start', room);
        }

        io.to(room.id).emit('room-update', room);
      });

      // Handle paddle movement
      socket.on('paddle-move', (data: { direction: 'up' | 'down' }) => {
        const room = Array.from(gameRooms.values()).find(r => 
          r.players.some(p => p.id === socket.id)
        );

        if (!room || room.gameState !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const { PADDLE_SPEED, CANVAS_HEIGHT, PADDLE_HEIGHT } = GAME_SETTINGS;

        if (data.direction === 'up') {
          player.position = Math.max(0, player.position - PADDLE_SPEED);
        } else {
          player.position = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, player.position + PADDLE_SPEED);
        }

        io.to(room.id).emit('game-update', room);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        // Remove player from room
        for (const [roomId, room] of gameRooms.entries()) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            
            if (room.players.length === 0) {
              gameRooms.delete(roomId);
            } else {
              room.gameState = 'waiting';
              io.to(roomId).emit('player-left', room);
            }
            break;
          }
        }
      });
    });

    // Game loop utk update ball position
    setInterval(() => {
      gameRooms.forEach((room) => {
        if (room.gameState === 'playing' && room.players.length === 2) {
          updateBallPosition(room);
          io.to(room.id).emit('game-update', room);
        }
      });
    }, 1000 / 60); // 60 FPS
  }

  return new Response('Socket.IO initialized', { status: 200 });
} 