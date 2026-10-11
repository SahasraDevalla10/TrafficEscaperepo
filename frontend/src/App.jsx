
import "./App.css";
import { useEffect, useState } from "react";
import Game from "./components/Game";

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);

  const loadScores = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/scores");

      if (!response.ok) {
        throw new Error("Unable to load scores");
      }

      const data = await response.json();

      data.sort((a, b) => b.score - a.score);
      setScores(data);
    } catch (error) {
      console.error("Leaderboard error:", error);
    } finally {
      setLoadingScores(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  if (gameStarted) {
    return <Game onExit={() => {
      setGameStarted(false);
      loadScores();
    }} />;
  }

  return (
    <div className="app">
      <nav className="navbar">
        <h2 className="logo">🚗 Traffic Escape</h2>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how-to-play">How to Play</a>
          <a href="#leaderboard">Leaderboard</a>
        </div>

        <button className="login-btn">Login</button>
      </nav>

      <main className="hero" id="home">
        <div className="hero-content">
          <p className="tagline">YOUR DRIVE. YOUR CHALLENGE.</p>

          <h1>
            ESCAPE THE
            <span> TRAFFIC!</span>
          </h1>

          <p className="description">
            Dodge traffic, avoid collisions, and travel as far
            as you can. Are you ready to take the challenge?
          </p>

          <button
            className="start-btn"
            onClick={() => setGameStarted(true)}
          >
            ▶ Start Game
          </button>

          <div className="features">
            <div className="feature">
              <span>🚘</span>
              <p>Dodge Traffic</p>
            </div>

            <div className="feature">
              <span>🏆</span>
              <p>Beat Your Score</p>
            </div>

            <div className="feature">
              <span>⚡</span>
              <p>Test Your Skills</p>
            </div>
          </div>
        </div>

        <div className="road-preview">
          <div className="road">
            <div className="road-line"></div>
            <div className="car player-car">🚙</div>
            <div className="car traffic-car">🚕</div>
            <div className="car traffic-car second-car">🚗</div>
          </div>

          <div className="score-card">
            <span>🏁 YOUR NEXT CHALLENGE</span>
            <h3>Ready to Drive?</h3>
            <p>Start your journey today!</p>
          </div>
        </div>
      </main>

      <section className="leaderboard" id="leaderboard">
        <p className="tagline">THE BEST DRIVERS</p>
        <h2>🏆 Leaderboard</h2>
        <p>Can you make it to the top?</p>

        {loadingScores ? (
          <p>Loading scores...</p>
        ) : scores.length === 0 ? (
          <p>No scores yet. Play your first race!</p>
        ) : (
          <div className="leaderboard-list">
            {scores.slice(0, 10).map((item, index) => (
              <div className="leaderboard-row" key={item.id}>
                <span className="rank">
                  {index === 0 ? "🥇" :
                   index === 1 ? "🥈" :
                   index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <span className="player-name">{item.playerName}</span>
                <strong>{item.score} pts</strong>
              </div>
            ))}
          </div>
        )}

        <button className="start-btn" onClick={loadScores}>
          ↻ Refresh Scores
        </button>
      </section>

      <section id="how-to-play" className="how-to-play">
        <h2>How to Play</h2>
        <p>Steer to dodge traffic, accelerate to gain points, and avoid collisions!</p>
      </section>

      <footer id="about">
        <p>TRAFFIC ESCAPE © 2026 | Drive Smart. Play Safe.</p>
      </footer>
    </div>
  );
}

export default App;
