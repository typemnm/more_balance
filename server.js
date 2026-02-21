const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD env var not set. Using insecure default password.');
}

app.use(express.static(path.join(__dirname, 'public')));

const gameState = {
  status: 'waiting',
  rounds: [],
  currentRound: -1,
  timer: null,
  timerRemaining: 0,
};

const players = new Map(); // socketId -> {nickname, vote, isSpectator, isAdmin, connected}
let adminVote = null; // 'A' or 'B' or null - reset each round
let adminSocketId = null;

function getOnlineCount() {
  return io.sockets.sockets.size;
}

function getPublicPlayers(showVotes) {
  const result = [];
  for (const [id, p] of players.entries()) {
    result.push({
      nickname: p.nickname,
      isSpectator: p.isSpectator,
      isAdmin: p.isAdmin,
      connected: p.connected,
      vote: showVotes ? p.vote : null,
    });
  }
  return result;
}

function broadcastGameState(showVotes) {
  io.emit('gameState', {
    status: gameState.status,
    rounds: gameState.rounds,
    currentRound: gameState.currentRound,
    timerRemaining: gameState.timerRemaining,
    players: getPublicPlayers(showVotes || false),
    onlineCount: getOnlineCount(),
  });
}

function startRound(roundIndex) {
  if (roundIndex >= gameState.rounds.length) {
    gameState.status = 'finished';
    gameState.currentRound = -1;
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }
    broadcastGameState(true);
    return;
  }

  gameState.currentRound = roundIndex;
  adminVote = null;
  const round = gameState.rounds[roundIndex];
  gameState.timerRemaining = round.durationSeconds;

  // Reset votes for all active players
  for (const [id, p] of players.entries()) {
    if (!p.isSpectator) {
      p.vote = null;
    }
  }

  broadcastGameState(false);

  if (gameState.timer) {
    clearInterval(gameState.timer);
  }

  gameState.timer = setInterval(() => {
    gameState.timerRemaining--;
    io.emit('timerTick', { remaining: gameState.timerRemaining });

    if (gameState.timerRemaining <= 0) {
      clearInterval(gameState.timer);
      gameState.timer = null;
      endRound();
    }
  }, 1000);
}

function endRound() {
  const activePlayers = [];
  for (const [id, p] of players.entries()) {
    if (!p.isSpectator && !p.isAdmin && p.connected) {
      activePlayers.push(p);
    }
  }

  let aCount = activePlayers.filter(p => p.vote === 'A').length;
  let bCount = activePlayers.filter(p => p.vote === 'B').length;

  let winner = null;
  let adminUsed = false;

  if (aCount > bCount) {
    winner = 'A';
  } else if (bCount > aCount) {
    winner = 'B';
  } else {
    // Tie
    if (adminVote === 'A') {
      winner = 'A';
      adminUsed = true;
    } else if (adminVote === 'B') {
      winner = 'B';
      adminUsed = true;
    } else {
      winner = null; // everyone stays alive
    }
  }

  if (winner === 'A') {
    for (const [id, p] of players.entries()) {
      if (!p.isSpectator && !p.isAdmin && p.vote === 'B') {
        p.isSpectator = true;
      }
    }
  } else if (winner === 'B') {
    for (const [id, p] of players.entries()) {
      if (!p.isSpectator && !p.isAdmin && p.vote === 'A') {
        p.isSpectator = true;
      }
    }
  }

  const results = { aCount, bCount, winner, adminUsed };

  io.emit('roundEnd', { results, roundIndex: gameState.currentRound });
  broadcastGameState(true);

  // Auto-advance after 5 seconds
  setTimeout(() => {
    const nextRound = gameState.currentRound + 1;
    if (nextRound >= gameState.rounds.length) {
      gameState.status = 'finished';
      gameState.currentRound = -1;
      broadcastGameState(true);
    } else {
      startRound(nextRound);
    }
  }, 5000);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current game state on connect
  socket.emit('gameState', {
    status: gameState.status,
    rounds: gameState.rounds,
    currentRound: gameState.currentRound,
    timerRemaining: gameState.timerRemaining,
    players: getPublicPlayers(gameState.status === 'finished'),
    onlineCount: getOnlineCount(),
  });

  socket.on('join', ({ nickname }) => {
    const isSpectator = gameState.status === 'playing';
    players.set(socket.id, {
      nickname,
      vote: null,
      isSpectator,
      isAdmin: false,
      connected: true,
    });

    socket.emit('joined', { nickname, isSpectator, isAdmin: false });
    broadcastGameState(false);
  });

  socket.on('adminLogin', ({ password }) => {
    if (password === ADMIN_PASSWORD) {
      adminSocketId = socket.id;
      if (!players.has(socket.id)) {
        players.set(socket.id, {
          nickname: 'Admin',
          vote: null,
          isSpectator: false,
          isAdmin: true,
          connected: true,
        });
      } else {
        players.get(socket.id).isAdmin = true;
      }
      socket.emit('adminLoggedIn');
      broadcastGameState(false);
    } else {
      socket.emit('adminLoginFailed', { message: 'Invalid password' });
    }
  });

  socket.on('adminVote', ({ option }) => {
    const player = players.get(socket.id);
    if (player && player.isAdmin && gameState.status === 'playing') {
      adminVote = option;
      socket.emit('adminVoteRecorded', { option });
    }
  });

  socket.on('vote', ({ option }) => {
    const player = players.get(socket.id);
    if (player && !player.isSpectator && !player.isAdmin && gameState.status === 'playing') {
      player.vote = option;
      // Broadcast vote counts (without revealing individual votes)
      let aCount = 0, bCount = 0;
      for (const [id, p] of players.entries()) {
        if (!p.isSpectator && !p.isAdmin) {
          if (p.vote === 'A') aCount++;
          else if (p.vote === 'B') bCount++;
        }
      }
      io.emit('voteCounts', { aCount, bCount });
      broadcastGameState(false);
    }
  });

  socket.on('createGame', ({ rounds }) => {
    const player = players.get(socket.id);
    if (player && player.isAdmin) {
      gameState.rounds = rounds;
      gameState.status = 'waiting';
      gameState.currentRound = -1;
      broadcastGameState(false);
    }
  });

  socket.on('startGame', () => {
    const player = players.get(socket.id);
    if (player && player.isAdmin && gameState.status === 'waiting' && gameState.rounds.length > 0) {
      gameState.status = 'playing';
      startRound(0);
    }
  });

  socket.on('nextRound', () => {
    const player = players.get(socket.id);
    if (player && player.isAdmin) {
      if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
      }
      const next = gameState.currentRound + 1;
      if (next < gameState.rounds.length) {
        startRound(next);
      } else {
        gameState.status = 'finished';
        broadcastGameState(true);
      }
    }
  });

  socket.on('resetGame', () => {
    const player = players.get(socket.id);
    if (player && player.isAdmin) {
      if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
      }
      gameState.status = 'waiting';
      gameState.rounds = [];
      gameState.currentRound = -1;
      gameState.timerRemaining = 0;
      adminVote = null;
      // Reset all players
      for (const [id, p] of players.entries()) {
        if (!p.isAdmin) {
          p.isSpectator = false;
          p.vote = null;
        }
      }
      broadcastGameState(false);
    }
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      player.connected = false;
    }
    console.log('Client disconnected:', socket.id);
    broadcastGameState(false);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
