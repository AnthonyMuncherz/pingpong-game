'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

export const PingPongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerName, setPlayerName] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [showGame, setShowGame] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  const {
    connected,
    roomCode,
    playerId,
    gameRoom,
    gameSettings,
    error,
    joinRoom,
    createRoom,
    movePaddle
  } = useSocket();

  // Handle mouse movement utk paddle control
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!gameSettings || !canvasRef.current || gameRoom?.gameState !== 'playing') return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseYRelative = e.clientY - rect.top;
      
      // Convert mouse Y position to paddle position (center paddle on mouse)
      const paddleY = Math.max(0, Math.min(
        gameSettings.CANVAS_HEIGHT - gameSettings.PADDLE_HEIGHT,
        mouseYRelative - gameSettings.PADDLE_HEIGHT / 2
      ));
      
      setMouseY(paddleY);
      
      // Calculate movement direction based on current player position
      if (gameRoom?.players[playerId]) {
        const currentPosition = gameRoom.players[playerId].position;
        const diff = paddleY - currentPosition;
        
        // Only send movement if there's significant difference (reduce network spam)
        if (Math.abs(diff) > 2) {
          if (diff > 0) {
            movePaddle('down');
          } else {
            movePaddle('up');
          }
        }
      }
    };

    if (showGame && gameRoom?.gameState === 'playing') {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [movePaddle, gameSettings, canvasRef, gameRoom, playerId, showGame]);

  // Render game on canvas
  useEffect(() => {
    if (!gameRoom || !gameSettings || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gameSettings.CANVAS_WIDTH, gameSettings.CANVAS_HEIGHT);

    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(gameSettings.CANVAS_WIDTH / 2, 0);
    ctx.lineTo(gameSettings.CANVAS_WIDTH / 2, gameSettings.CANVAS_HEIGHT);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#fff';
    
    // Player 1 paddle (kiri)
    if (gameRoom.players[0]) {
      ctx.fillRect(
        0, 
        gameRoom.players[0].position, 
        gameSettings.PADDLE_WIDTH, 
        gameSettings.PADDLE_HEIGHT
      );
    }

    // Player 2 paddle (kanan)
    if (gameRoom.players[1]) {
      ctx.fillRect(
        gameSettings.CANVAS_WIDTH - gameSettings.PADDLE_WIDTH, 
        gameRoom.players[1].position, 
        gameSettings.PADDLE_WIDTH, 
        gameSettings.PADDLE_HEIGHT
      );
    }

    // Draw ball
    ctx.fillRect(
      gameRoom.ball.x, 
      gameRoom.ball.y, 
      gameSettings.BALL_SIZE, 
      gameSettings.BALL_SIZE
    );

    // Draw scores
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    
    // Player 1 score
    if (gameRoom.players[0]) {
      ctx.fillText(
        gameRoom.players[0].score.toString(), 
        gameSettings.CANVAS_WIDTH / 4, 
        60
      );
    }

    // Player 2 score
    if (gameRoom.players[1]) {
      ctx.fillText(
        gameRoom.players[1].score.toString(), 
        (gameSettings.CANVAS_WIDTH / 4) * 3, 
        60
      );
    }

    // Draw player names
    ctx.font = '16px Arial';
    if (gameRoom.players[0]) {
      ctx.fillText(gameRoom.players[0].name, gameSettings.CANVAS_WIDTH / 4, 90);
    }
    if (gameRoom.players[1]) {
      ctx.fillText(gameRoom.players[1].name, (gameSettings.CANVAS_WIDTH / 4) * 3, 90);
    }

  }, [gameRoom, gameSettings]);

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      createRoom(playerName.trim());
      setShowGame(true);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && inputRoomCode.trim()) {
      joinRoom(inputRoomCode.trim().toUpperCase(), playerName.trim());
      setShowGame(true);
    }
  };

  const getGameStatusText = () => {
    if (!gameRoom) return '';
    
    switch (gameRoom.gameState) {
      case 'waiting':
        return `Tunggu player lain... Room Code: ${roomCode}`;
      case 'playing':
        return 'Game dah start! Gunakan ↑↓ atau W/S utk control paddle';
      case 'finished':
        const winner = gameRoom.players.find(p => p.score >= (gameSettings?.WINNING_SCORE || 5));
        return `Game habis! ${winner?.name} menang! 🎉`;
      default:
        return '';
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (!showGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-8">🏓 Ping Pong Multiplayer</h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Your Name:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Masukkan nama lu"
              maxLength={20}
            />
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded-lg font-medium transition-colors"
            >
              Create New Room {!playerName.trim() && '(Enter name first)'}
            </button>

            <div className="text-center text-gray-400">or</div>

            <div>
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none mb-2"
                placeholder="Room Code (6 characters)"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !inputRoomCode.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded-lg font-medium transition-colors"
              >
                Join Room {(!playerName.trim() || !inputRoomCode.trim()) && '(Enter name & room code)'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-600 rounded-lg text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold mb-2">🏓 Ping Pong Game</h1>
        <p className="text-lg">{getGameStatusText()}</p>
        {gameRoom?.gameState === 'waiting' && (
          <p className="text-sm text-gray-400 mt-2">
            Share room code "{roomCode}" with your friend to start playing!
          </p>
        )}
      </div>

      {gameSettings && (
        <div className="border-2 border-gray-700 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={gameSettings.CANVAS_WIDTH}
            height={gameSettings.CANVAS_HEIGHT}
            className="block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}

      <div className="mt-4 text-center text-sm text-gray-400">
        <p>Controls: ↑↓ Arrow Keys or W/S keys</p>
        <p>You are: Player {playerId + 1} {playerId === 0 ? '(Left)' : '(Right)'}</p>
      </div>

      {gameRoom?.gameState === 'finished' && (
        <button
          onClick={() => setShowGame(false)}
          className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Menu
        </button>
      )}
    </div>
  );
}; 