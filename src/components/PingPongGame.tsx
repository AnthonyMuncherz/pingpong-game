'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { timerAudio } from '@/utils/audioUtils';

export const PingPongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerName, setPlayerName] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [showGame, setShowGame] = useState(false);
  const [mouseY, setMouseY] = useState(0);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);

  const {
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

  // Handle countdown audio effects
  useEffect(() => {
    if (!timerAudio) return; // Skip if audio not available (SSR)
    
    if (countdown !== null && countdown > 0) {
      timerAudio.playCountdownBeep(countdown, 5);
    } else if (countdown === 0) {
      // Game starting sound when countdown finishes
      setTimeout(() => timerAudio.playGameStartSound(), 200);
    }
  }, [countdown]);

  // Handle game finish and play victory/lose sounds
  useEffect(() => {
    if (!timerAudio || !gameRoom || !gameSettings) return;

    // Check if game just finished
    if (gameRoom.gameState === 'finished') {
      const currentPlayer = gameRoom.players[playerId];
      const opponent = gameRoom.players.find((_, index) => index !== playerId);
      
      if (currentPlayer && opponent) {
        const currentPlayerWon = currentPlayer.score >= gameSettings.WINNING_SCORE;
        const newResult = currentPlayerWon ? 'won' : 'lost';
        
        // Only play sound if this is a new result
        if (gameResult !== newResult) {
          setGameResult(newResult);
          
          if (currentPlayerWon) {
            setTimeout(() => timerAudio.playVictorySound(), 300);
          } else {
            setTimeout(() => timerAudio.playLoseSound(), 300);
          }
        }
      }
    } else {
      // Reset result when game is not finished
      setGameResult(null);
    }
  }, [gameRoom?.gameState, gameRoom?.players, playerId, gameSettings, timerAudio, gameResult]);

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
      // Enable audio on user interaction
      if (timerAudio && timerAudio.audioContext?.state === 'suspended') {
        timerAudio.audioContext.resume();
      }
      createRoom(playerName.trim());
      setShowGame(true);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && inputRoomCode.trim()) {
      // Enable audio on user interaction
      if (timerAudio && timerAudio.audioContext?.state === 'suspended') {
        timerAudio.audioContext.resume();
      }
      joinRoom(inputRoomCode.trim().toUpperCase(), playerName.trim());
      setShowGame(true);
    }
  };

  const getGameStatusText = () => {
    if (!gameRoom) return '';
    
    switch (gameRoom.gameState) {
      case 'waiting':
        return `Tunggu player lain... Room Code: ${roomCode}`;
      case 'ready-check':
        return 'Both players joined! Click READY when you\'re prepared to play';
      case 'countdown':
        return countdown ? `Game starting in ${countdown}...` : 'Get ready!';
      case 'playing':
        return 'Game dah start! Move mouse up/down utk control paddle';
      case 'finished':
        const winner = gameRoom.players.find(p => p.score >= (gameSettings?.WINNING_SCORE || 5));
        const currentPlayer = gameRoom.players[playerId];
        const didWin = currentPlayer && currentPlayer.score >= (gameSettings?.WINNING_SCORE || 5);
        
        if (didWin) {
          return `🎉 VICTORY! You defeated ${gameRoom.players.find((_, i) => i !== playerId)?.name}! 🏆`;
        } else {
          return `💔 DEFEAT! ${winner?.name} won this round... Try again! 😤`;
        }
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
        
        {/* Ready Check Button */}
        {gameRoom?.gameState === 'ready-check' && (
          <div className="mt-4">
            <div className="mb-3">
              <p className="text-sm text-gray-300 mb-2">Players Ready Status:</p>
              <div className="flex justify-center space-x-4 text-sm">
                {gameRoom.players.map((player, index) => (
                  <div key={player.id} className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${player.ready ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className={index === playerId ? 'font-bold text-blue-400' : 'text-gray-300'}>
                      {player.name} {index === playerId && '(You)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setPlayerReady(true)}
                disabled={gameRoom.players[playerId]?.ready === true}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {gameRoom.players[playerId]?.ready ? '✓ Ready!' : 'Ready'}
              </button>
              <button
                onClick={() => setPlayerReady(false)}
                disabled={gameRoom.players[playerId]?.ready === false}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Not Ready
              </button>
            </div>
          </div>
        )}

        {/* Countdown Display */}
        {gameRoom?.gameState === 'countdown' && countdown !== null && (
          <div className="mt-4">
            <div className="text-6xl font-bold text-yellow-400 animate-pulse">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            <p className="text-sm text-gray-400 mt-2">Get your mouse ready!</p>
          </div>
        )}
      </div>

      {gameSettings && (
        <div className="border-2 border-gray-700 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={gameSettings.CANVAS_WIDTH}
            height={gameSettings.CANVAS_HEIGHT}
            className="block cursor-none"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}

      <div className="mt-4 text-center text-sm text-gray-400">
        <p>Controls: Move mouse up/down to control your paddle</p>
        <p>You are: Player {playerId + 1} {playerId === 0 ? '(Left)' : '(Right)'}</p>
      </div>

      {gameRoom?.gameState === 'finished' && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowGame(false)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Menu
          </button>
          
          <div className="mt-2 flex justify-center space-x-2 text-xs text-gray-400">
            <button
              onClick={() => timerAudio?.playVictorySound()}
              className="hover:text-green-400 transition-colors"
            >
              🔊 Play Victory Song
            </button>
            <button
              onClick={() => timerAudio?.playLoseSound()}
              className="hover:text-red-400 transition-colors"
            >
              🔊 Play Defeat Song
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 