const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Game state storage - ni kita store game rooms
const gameRooms = new Map();

// Game settings - constant utk ping pong game
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

function createNewRoom() {
  return {
    id: uuidv4().substring(0, 6).toUpperCase(), // 6 char room code je
    players: [],
    ball: {
      x: GAME_SETTINGS.CANVAS_WIDTH / 2,
      y: GAME_SETTINGS.CANVAS_HEIGHT / 2,
      velocityX: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      velocityY: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    },
    gameState: 'waiting',
    countdown: null, // Timer countdown state
    countdownStartTime: null,
    createdAt: new Date()
  };
}

function updateBallPosition(room) {
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

function resetBall(room) {
  room.ball = {
    x: GAME_SETTINGS.CANVAS_WIDTH / 2,
    y: GAME_SETTINGS.CANVAS_HEIGHT / 2,
    velocityX: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    velocityY: GAME_SETTINGS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
  };
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Player masuk: ${socket.id}`);

    // Join or create room
    socket.on('join-room', (data) => {
      const { roomCode, playerName } = data;
      let room;

      if (roomCode && gameRooms.has(roomCode)) {
        // Join existing room
        room = gameRooms.get(roomCode);
        if (room.players.length >= 2) {
          socket.emit('room-error', 'Room dah penuh bro!');
          return;
        }
      } else {
        // Create new room
        room = createNewRoom();
        gameRooms.set(room.id, room);
        console.log(`New room created: ${room.id}`);
      }

      // Add player to room
      const playerId = room.players.length;
      room.players.push({
        id: socket.id,
        name: playerName,
        position: GAME_SETTINGS.CANVAS_HEIGHT / 2 - GAME_SETTINGS.PADDLE_HEIGHT / 2,
        score: 0,
        ready: false // Ready check status
      });

      socket.join(room.id);
      socket.emit('room-joined', { 
        roomCode: room.id, 
        playerId,
        gameSettings: GAME_SETTINGS 
      });

      // Check if both players ready when 2 players in room
      if (room.players.length === 2) {
        room.gameState = 'ready-check';
        console.log(`Ready check started in room: ${room.id}`);
      }

      io.to(room.id).emit('room-update', room);
    });

    // Handle ready check
    socket.on('player-ready', (data) => {
      const room = Array.from(gameRooms.values()).find(r => 
        r.players.some(p => p.id === socket.id)
      );

      if (!room || room.gameState !== 'ready-check') return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      player.ready = data.ready;
      console.log(`Player ${player.name} ready status: ${player.ready}`);

      // Check if both players ready
      const allReady = room.players.length === 2 && room.players.every(p => p.ready);
      
      if (allReady) {
        // Start countdown timer
        room.gameState = 'countdown';
        room.countdown = 5; // 5 second countdown
        room.countdownStartTime = Date.now();
        console.log(`Countdown started in room: ${room.id}`);
        
        // Reset ready status for next game
        room.players.forEach(p => p.ready = false);
      }

      io.to(room.id).emit('room-update', room);
    });

    // Handle paddle movement
    socket.on('paddle-move', (data) => {
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
      console.log(`Player keluar: ${socket.id}`);
      
      // Remove player from room
      for (const [roomId, room] of gameRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          
          if (room.players.length === 0) {
            gameRooms.delete(roomId);
            console.log(`Room deleted: ${roomId}`);
          } else {
            room.gameState = 'waiting';
            io.to(roomId).emit('player-left', room);
          }
          break;
        }
      }
    });
  });

  // Game loop utk update ball position & countdown - 60 FPS
  setInterval(() => {
    gameRooms.forEach((room) => {
      // Handle countdown timer
      if (room.gameState === 'countdown' && room.countdownStartTime) {
        const elapsed = (Date.now() - room.countdownStartTime) / 1000;
        const remaining = Math.ceil(5 - elapsed);
        
        if (remaining !== room.countdown) {
          room.countdown = remaining;
          io.to(room.id).emit('countdown-update', { countdown: remaining });
        }
        
        // Start game when countdown reaches 0
        if (remaining <= 0) {
          room.gameState = 'playing';
          room.countdown = null;
          room.countdownStartTime = null;
          resetBall(room); // Reset ball position for new game
          io.to(room.id).emit('game-start', room);
          console.log(`Game started in room: ${room.id}`);
        }
      }
      
      // Handle ball physics during gameplay
      if (room.gameState === 'playing' && room.players.length === 2) {
        updateBallPosition(room);
        io.to(room.id).emit('game-update', room);
      }
    });
  }, 1000 / 60);

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
}); 