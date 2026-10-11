
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./Game.css";

function makeCar(color, player = false) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9deaff,
    metalness: 0.2,
    roughness: 0.2,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15191f });

  function box(w, h, d, y, z, material) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );
    mesh.position.set(0, y, z);
    mesh.castShadow = true;
    car.add(mesh);
  }

  box(1.7, 0.48, 3.5, 0.62, 0, bodyMat);
  box(1.3, 0.55, 1.65, 1.05, -0.25, bodyMat);
  box(1.12, 0.38, 1.3, 1.12, -0.2, glassMat);

  for (const x of [-0.9, 0.9]) {
    for (const z of [-1.12, 1.1]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.23, 12),
        darkMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      car.add(wheel);
    }
  }

  const lampMat = new THREE.MeshStandardMaterial({
    color: player ? 0x00eaff : 0xff3333,
    emissive: player ? 0x00aaff : 0xff1111,
    emissiveIntensity: 1.5,
  });

  for (const x of [-0.55, 0.55]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.06),
      lampMat
    );
    lamp.position.set(x, 0.72, player ? 1.78 : -1.78);
    car.add(lamp);
  }

  return car;
}

function Game({ onExit }) {
  const mountRef = useRef(null);
  const engine = useRef(null);

  const [hud, setHud] = useState({
    speed: 90,
    score: 0,
    level: 1,
    nitro: 100,
  });
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const pausedRef = useRef(false);
  
const scoreSavedRef = useRef(false);

const saveScore = async (finalScore) => {
  if (scoreSavedRef.current) return;

  scoreSavedRef.current = true;

  try {
    const response = await fetch("http://localhost:8080/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerName: "Player1",
        score: finalScore,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save score");
    }

    console.log("Score saved successfully!");
  } catch (error) {
    scoreSavedRef.current = false;
    console.error("Error saving score:", error);
  }
};


  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const resetGame = useCallback(() => {
    const state = engine.current;
    scoreSavedRef.current = false;
    if (state) {
      state.playerX = 0;
      state.speed = 90;
      state.score = 0;
      state.nitro = 100;
      state.crashed = false;
      state.distance = 0;
      state.keys = {};
      state.steering = 0;
      state.accelerating = false;
      state.braking = false;
      state.boosting = false;
      state.jumping = false;
      state.jumpTime = 0;

      state.objects.forEach((obj, i) => {
        obj.mesh.visible = false;
        obj.z = -70 - i * 28;
        obj.passed = false;
      });
    }

    setHud({ speed: 90, score: 0, level: 1, nitro: 100 });
    setPaused(false);
    setGameOver(false);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("Unable to create the 3D renderer:", error);
      mount.innerHTML =
        '<p class="game-error">3D graphics are unavailable in this browser. Try enabling hardware acceleration.</p>';
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ac8e8);
    scene.fog = new THREE.Fog(0x9ac8e8, 70, 230);

    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);
    camera.position.set(0, 6.5, 11);
    camera.lookAt(0, 0.5, -18);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(
      Math.max(mount.clientWidth, 1),
      Math.max(mount.clientHeight, 1)
    );
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe3f5ff, 0x46553d, 2.2));

    const sunlight = new THREE.DirectionalLight(0xffffff, 3);
    sunlight.position.set(-15, 30, 12);
    sunlight.castShadow = true;
    scene.add(sunlight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0x477d43, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.08, -100);
    ground.receiveShadow = true;
    scene.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x30343b,
      roughness: 0.95,
    });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x333333,
    });

    const roadSegments = [];
    const laneMarks = [];

    for (let i = 0; i < 36; i++) {
      const z = -i * 7;

      const road = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.12, 7.1),
        roadMat
      );
      road.position.set(0, 0, z);
      road.receiveShadow = true;
      scene.add(road);
      roadSegments.push(road);

      for (const x of [-6.15, 6.15]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.14, 7.1),
          edgeMat
        );
        edge.position.set(x, 0.04, z);
        scene.add(edge);
        roadSegments.push(edge);
      }

      for (const x of [-2, 2]) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.035, 3.1),
          dashMat
        );
        dash.position.set(x, 0.09, z - 1.5);
        scene.add(dash);
        laneMarks.push(dash);
      }
    }

    const scenery = [];
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x24633c });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x67472c });

    for (let i = 0; i < 40; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -12 - Math.floor(i / 2) * 12;
      const tree = new THREE.Group();

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 1.5, 6),
        trunkMat
      );
      trunk.position.y = 0.75;
      tree.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 2.8, 7),
        treeMat
      );
      crown.position.y = 2.35;
      tree.add(crown);

      tree.position.set(side * (10 + Math.random() * 5), 0, z);
      scene.add(tree);
      scenery.push(tree);
    }

    const player = makeCar(0x00cce9, true);
    player.position.set(0, 0, 2);
    scene.add(player);

    const colors = [0xff424e, 0xffb52e, 0x6578ff, 0xf4f4f4, 0x31ba79];
    const objects = [];

    for (let i = 0; i < 9; i++) {
      const isBarrier = i % 3 === 2;
      const mesh = isBarrier
        ? new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.9, 0.65),
            new THREE.MeshStandardMaterial({ color: 0xffa928 })
          )
        : makeCar(colors[i % colors.length]);

      mesh.visible = false;
      if (isBarrier) mesh.position.y = 0.45;
      scene.add(mesh);

      objects.push({
        mesh,
        z: -70 - i * 28,
        x: [-4, 0, 4][i % 3],
        isBarrier,
        passed: false,
      });
    }

    const state = {
      playerX: 0,
      speed: 90,
      score: 0,
      nitro: 100,
      crashed: false,
      distance: 0,
      objects,
      keys: {},
      steering: 0,
      accelerating: false,
      braking: false,
      boosting: false,
      jumping: false,
      jumpTime: 0,
      curve: 0,
    };

    engine.current = state;

    let lastTime = 0;
    let hudTime = 0;
    let animationId = 0;
    let running = true;

    const curveAt = (z) =>
      Math.sin((state.distance + Math.abs(z)) * 0.0035) * 0.65 +
      Math.sin((state.distance + Math.abs(z)) * 0.0012) * 0.4;

    const animate = (time) => {
      if (!running) return;

      const dt = Math.min((time - (lastTime || time)) / 1000, 0.035);
      lastTime = time;

      if (!pausedRef.current && !state.crashed) {
        const keys = state.keys;

        const steering =
          state.steering +
          ((keys.ArrowRight || keys.d ? 1 : 0) -
            (keys.ArrowLeft || keys.a ? 1 : 0));

        const accel = state.accelerating || keys.ArrowUp || keys.w;
        const brake = state.braking || keys.ArrowDown || keys.s;
        const boost = state.boosting || keys[" "];

        const level = Math.min(10, Math.floor(state.score / 250) + 1);

        state.speed += (accel ? 70 : -12) * dt;
        if (brake) state.speed -= 145 * dt;

        if (boost && state.nitro > 0) {
          state.speed += 95 * dt;
          state.nitro = Math.max(0, state.nitro - 26 * dt);
        } else {
          state.nitro = Math.min(100, state.nitro + 4 * dt);
        }

        state.speed = THREE.MathUtils.clamp(
          state.speed,
          0,
          210 + level * 8
        );

        state.playerX += steering * dt * (2.3 + state.speed / 100);
        state.playerX = THREE.MathUtils.clamp(state.playerX, -5.2, 5.2);

        state.distance += state.speed * dt;
        state.score += state.speed * dt * 0.06;
        state.jumpTime = Math.max(0, state.jumpTime - dt);

        if (state.jumping && state.jumpTime === 0) {
          state.jumpTime = 0.85;
        }

        state.curve = curveAt(-30);
        const roadShift = state.distance % 7;

        roadSegments.forEach((mesh, i) => {
          const segmentIndex = Math.floor(i / 3);
          const originalZ = -segmentIndex * 7;
          const z = originalZ + roadShift;
          const curve = curveAt(z);
          mesh.position.z = z;
          mesh.position.x =
            curve * Math.pow(Math.abs(z) / 220, 1.25) * 22;
          mesh.rotation.y = curve * -0.055;
        });

        laneMarks.forEach((mesh, i) => {
          const row = Math.floor(i / 2);
          const originalZ = -row * 7 - 1.5;
          const z = originalZ + roadShift;
          const curve = curveAt(z);
          mesh.position.z = z;
          mesh.position.x =
            (i % 2 === 0 ? -2 : 2) +
            curve * Math.pow(Math.abs(z) / 220, 1.25) * 22;
          mesh.rotation.y = curve * -0.055;
        });

        scenery.forEach((mesh) => {
          mesh.position.z += state.speed * dt * 0.32;
          if (mesh.position.z > 12) mesh.position.z -= 240;
        });

        objects.forEach((obj) => {
          if (!obj.mesh.visible) {
            obj.z = -100 - Math.random() * 70;
            obj.x = [-4, 0, 4][Math.floor(Math.random() * 3)];
            obj.passed = false;
            obj.mesh.visible = true;
          }

          obj.z += state.speed * dt * 0.42;
          const curve = curveAt(obj.z);

          obj.mesh.position.z = obj.z;
          obj.mesh.position.x =
            obj.x + curve * Math.pow(Math.abs(obj.z) / 220, 1.25) * 22;

          if (!obj.isBarrier) obj.mesh.rotation.y = curve * -0.055;

          if (
            obj.z > -1 &&
            obj.z < 5 &&
            Math.abs(obj.mesh.position.x - state.playerX) < 1.7 &&
            state.jumpTime < 0.2
          ) {
            state.crashed = true;
            saveScore(Math.floor(state.score));
            setGameOver(true);            
          }

          if (obj.z > 7 && !obj.passed) {
            obj.passed = true;
            state.score += 20;
          }

          if (obj.z > 16) obj.mesh.visible = false;
        });

        player.position.x = state.playerX;
        player.position.y =
          state.jumpTime > 0
            ? Math.sin((state.jumpTime / 0.85) * Math.PI) * 1.8
            : 0;
        player.rotation.z = -steering * 0.075;
        player.rotation.y = -state.curve * 0.05;
      }

      const targetX = player.position.x * 0.35 + state.curve * 2.3;
      camera.position.x += (targetX - camera.position.x) * 0.045;
      camera.position.y +=
        (6.5 + player.position.y * 0.3 - camera.position.y) * 0.08;
      camera.lookAt(
        player.position.x * 0.18 + state.curve * 2.2,
        0.7,
        -18
      );

      renderer.render(scene, camera);

      hudTime -= dt;
      if (hudTime <= 0) {
        setHud({
          speed: Math.round(state.speed),
          score: Math.floor(state.score),
          level: Math.min(10, Math.floor(state.score / 250) + 1),
          nitro: Math.round(state.nitro),
        });
        hudTime = 0.15;
      }

      animationId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const keyDown = (event) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(
          event.key
        )
      ) event.preventDefault();

      state.keys[event.key] = true;
      state.keys[event.key.toLowerCase()] = true;

      if (event.key.toLowerCase() === "p") {
        setPaused((value) => !value);
      }
      if (event.key.toLowerCase() === "j") state.jumping = true;
    };

    const keyUp = (event) => {
      state.keys[event.key] = false;
      state.keys[event.key.toLowerCase()] = false;
      if (event.key.toLowerCase() === "j") state.jumping = false;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    resize();
    animationId = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((material) => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
      if (engine.current === state) engine.current = null;
    };
  }, []);

  const hold = (field, value) => (event) => {
    event.preventDefault();
    if (engine.current) engine.current[field] = value;
  };

  return (
    <main className="race-page">
      <header className="race-header">
        <button className="race-back" onClick={onExit}>← EXIT</button>
        <div className="race-brand">TRAFFIC <span>ESCAPE</span></div>
        <button
          className="race-pause"
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "▶ RESUME" : "Ⅱ PAUSE"}
        </button>
      </header>

      <section className="race-stats">
        <div><small>LEVEL</small><strong>{String(hud.level).padStart(2, "0")}</strong></div>
        <div><small>SPEED</small><strong>{hud.speed}<i> km/h</i></strong></div>
        <div><small>SCORE</small><strong>{String(hud.score).padStart(5, "0")}</strong></div>
        <div>
          <small>NITRO</small>
          <div className="nitro-track">
            <span style={{ width: `${hud.nitro}%` }} />
          </div>
        </div>
      </section>

      <section className="race-stage">
        <div ref={mountRef} className="three-game" />

        {(paused || gameOver) && (
          <div className="race-overlay">
            <div className="race-modal">
              <p className="race-kicker">
                {gameOver ? "RACE ENDED" : "TAKE A BREATHER"}
              </p>
              <h1>{gameOver ? "CRASHED!" : "PAUSED"}</h1>
              <p>
                {gameOver
                  ? `You scored ${hud.score} points.`
                  : "Your race is waiting."}
              </p>
              {gameOver ? (
                <button className="race-primary" onClick={resetGame}>
                  ↻ RACE AGAIN
                </button>
              ) : (
                <button
                  className="race-primary"
                  onClick={() => setPaused(false)}
                >
                  ▶ CONTINUE
                </button>
              )}
              <button className="race-secondary" onClick={onExit}>
                BACK TO HOME
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="race-controls">
        <div className="steering-pad">
          <button
            onPointerDown={hold("steering", -1)}
            onPointerUp={hold("steering", 0)}
            onPointerLeave={hold("steering", 0)}
            onPointerCancel={hold("steering", 0)}
          >◀ LEFT</button>
          <button
            onPointerDown={hold("steering", 1)}
            onPointerUp={hold("steering", 0)}
            onPointerLeave={hold("steering", 0)}
            onPointerCancel={hold("steering", 0)}
          >RIGHT ▶</button>
        </div>

        <div className="pedal-pad">
          <button className="brake-btn"
            onPointerDown={hold("braking", true)}
            onPointerUp={hold("braking", false)}
            onPointerLeave={hold("braking", false)}
            onPointerCancel={hold("braking", false)}
          >BRAKE</button>
          <button className="jump-btn"
            onPointerDown={hold("jumping", true)}
            onPointerUp={hold("jumping", false)}
            onPointerLeave={hold("jumping", false)}
            onPointerCancel={hold("jumping", false)}
          >JUMP</button>
          <button className="nitro-btn"
            onPointerDown={hold("boosting", true)}
            onPointerUp={hold("boosting", false)}
            onPointerLeave={hold("boosting", false)}
            onPointerCancel={hold("boosting", false)}
          >NITRO</button>
          <button className="accelerate-btn"
            onPointerDown={hold("accelerating", true)}
            onPointerUp={hold("accelerating", false)}
            onPointerLeave={hold("accelerating", false)}
            onPointerCancel={hold("accelerating", false)}
          >ACCELERATE</button>
        </div>
      </section>

      <footer className="race-help">
        <span>← → / A D <b>STEER</b></span>
        <span>↑ / W <b>ACCELERATE</b></span>
        <span>↓ / S <b>BRAKE</b></span>
        <span>SPACE <b>NITRO</b></span>
        <span>J <b>JUMP</b></span>
        <span>P <b>PAUSE</b></span>
      </footer>
    </main>
  );
}

export default Game;
