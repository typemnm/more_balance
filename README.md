# ⚖️ Balance Game

A real-time multiplayer "balance game" where players vote between two options each round — those on the losing side are eliminated. Last player(s) standing win!

## How It Works

1. **Host** logs into the admin dashboard, creates rounds (topic + two options + timer), and starts the game.
2. **Players** join via the home page, pick a nickname, and land on the game screen.
3. Each round, every alive player votes **A** or **B** before the timer runs out.
4. The majority wins; players who voted for the losing option become **spectators**.
5. In case of a tie, the admin's tiebreaker vote decides — or everyone survives if no tiebreaker is set.
6. The last player(s) still alive at the end win.

## Local Development

```bash
# Install dependencies
npm install

# Start the server (http://localhost:3000)
npm start

# Or with auto-restart on file changes
npm run dev
```

Open your browser:
- **Player join page**: http://localhost:3000
- **Game page**: http://localhost:3000/game.html
- **Admin dashboard**: http://localhost:3000/admin.html

## Environment Variables

| Variable         | Default     | Description                          |
|------------------|-------------|--------------------------------------|
| `PORT`           | `3000`      | Port the server listens on           |
| `ADMIN_PASSWORD` | `admin123`  | Password for the admin dashboard     |

Set them in a `.env` file or directly in your environment / hosting platform.

> ⚠️ **Change `ADMIN_PASSWORD` before deploying to production.**

## Deployment to Render

### One-time setup

1. Create a **Web Service** on [Render](https://render.com):
   - **Repository**: connect this GitHub repo
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node

2. Add the following **Environment Variables** in the Render dashboard:
   | Key              | Value              |
   |------------------|--------------------|
   | `ADMIN_PASSWORD` | your-secret-pw     |
   | `NODE_ENV`       | `production`       |

3. Copy your **Service ID** from the Render dashboard URL (looks like `srv-xxxx`).

4. Generate a **Render API Key** at https://dashboard.render.com/u/settings#api-keys.

### GitHub Secrets for Auto-Deploy

Add these secrets to your GitHub repository (`Settings → Secrets and variables → Actions`):

| Secret              | Description                              |
|---------------------|------------------------------------------|
| `RENDER_API_KEY`    | Your Render API key                      |
| `RENDER_SERVICE_ID` | The Render service ID (e.g. `srv-xxxx`)  |
| `ADMIN_PASSWORD`    | Admin password (set in Render env vars)  |

Every push to the `main` branch will automatically trigger a deploy via the GitHub Actions workflow in `.github/workflows/deploy.yml`.

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Real-time**: WebSockets via Socket.IO

## Game Rules

- Players who join while a game is **in progress** become spectators automatically.
- Players who vote for the **losing option** become spectators for all subsequent rounds.
- If a round ends in a **tie** and the admin has set a tiebreaker vote, that decides the winner.
- If a round ends in a **tie** with no tiebreaker, **everyone survives** that round.
- The game ends after all configured rounds are complete.
- Disconnected players keep their alive/spectator status; if they reconnect they continue where they left off.
