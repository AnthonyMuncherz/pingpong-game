# 🏓 Ping Pong Multiplayer Game

Multiplayer ping pong game built with Next.js & Socket.io - real-time main dgn kawan!

## Features

- **Real-time multiplayer** - Main live dgn orang lain via internet
- **Room-based system** - Create atau join room guna 6-digit code
- **Smooth gameplay** - 60 FPS game loop utk movement yg smooth
- **Responsive controls** - Arrow keys atau WASD utk control paddle
- **Score tracking** - First to 5 points menang!
- **Modern UI** - Clean design dgn Tailwind CSS

## Tech Stack

- **Next.js 15** - React framework dgn App Router
- **Socket.io** - Real-time websocket communication
- **TypeScript** - Type safety utk better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **HTML5 Canvas** - Game rendering
- **UUID** - Generate unique room codes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm

### Installation

1. Clone repo ni:
```bash
git clone <repo-url>
cd pingpong-game
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Buka browser & pergi ke `http://localhost:3000`

## How to Play

### Create Room
1. Masukkan nama lu
2. Click "Create New Room"
3. Share room code dgn kawan utk join

### Join Room  
1. Masukkan nama lu
2. Masukkan room code yg kawan bagi
3. Click "Join Room"

### Controls
- **Arrow Keys** ↑↓ - Move paddle up/down
- **W/S Keys** - Alternative controls
- **Goal**: First player to score 5 points wins!

## Game Mechanics

- **Ball Physics**: Ball speed increases slightly after paddle hits
- **Collision Detection**: Accurate paddle & wall collision system
- **Scoring System**: Ball exits left/right = point utk opponent
- **Win Condition**: First to 5 points wins the match
- **Room Management**: Automatic cleanup when players disconnect

## Project Structure

```
src/
├── app/
│   ├── api/socket/route.ts    # Socket.io API route (backup)
│   ├── page.tsx               # Main page
│   └── layout.tsx             # Root layout
├── components/
│   └── PingPongGame.tsx       # Main game component
├── hooks/
│   └── useSocket.ts           # Socket.io custom hook
└── server.js                  # Custom server dgn Socket.io
```

## Socket.io Events

### Client → Server
- `join-room` - Join/create room
- `paddle-move` - Move paddle up/down
- `disconnect` - Player leaves

### Server → Client  
- `room-joined` - Successfully joined room
- `room-error` - Error joining room (full, etc)
- `room-update` - Room state updated
- `game-start` - Game begins (2 players)
- `game-update` - Real-time game state
- `player-left` - Another player disconnected

## Development Notes

### Game Settings
All constants (canvas size, paddle speed, etc) stored in `GAME_SETTINGS` object utk easy tuning.

### Performance
- Game loop runs at 60 FPS
- Only sends updates when needed
- Efficient collision detection

### Error Handling
- Graceful disconnect handling
- Room cleanup when empty
- Connection status feedback

## Deployment

### Build for production:
```bash
npm run build
npm start
```

### Environment Variables
Kalo deploy, make sure configure:
- `NODE_ENV=production`
- Proper socket.io CORS settings utk domain lu

## Contributing

1. Fork repo
2. Create feature branch: `git checkout -b feature/awesome-feature`
3. Commit changes: `git commit -m 'Add awesome feature'`
4. Push branch: `git push origin feature/awesome-feature`
5. Open Pull Request

## Future Enhancements

- [ ] Power-ups (speed boost, bigger paddle, etc)
- [ ] Different ball skins
- [ ] Spectator mode
- [ ] Tournament bracket system
- [ ] Player stats & leaderboard
- [ ] Sound effects & background music
- [ ] Mobile touch controls
- [ ] AI opponent utk practice

## Known Issues

- WebSocket connection might timeout on some hosting platforms
- Mobile responsiveness could be improved
- Need better error messages utk network issues

## License

MIT License - feel free to use & modify!

---

**Made with ❤️ in Malaysia**

Have fun playing! Kalo ada bug or suggestions, create issue dalam repo ni.
