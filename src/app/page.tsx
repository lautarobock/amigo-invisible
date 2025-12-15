/* Juego simple de Amigo Invisible: tenés balas limitadas, si acertás lo suficiente se revela el nombre. */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BULLETS = 8;
const REQUIRED_HITS = 3;
const TARGET_RADIUS = 28; // px (solo para calcular el radio de impacto)
const EDGE_PADDING = 6; // % de padding para que no se pegue completamente al borde
const BASE_SPEED = 0.5; // velocidad inicial (% del ancho por frame)

type Target = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function randomTarget(): Target {
  // Mantener el objetivo dentro del 100% x 100% con un padding proporcional
  const padding = EDGE_PADDING;
  const x = padding + Math.random() * (100 - padding * 2);
  const y = padding + Math.random() * (100 - padding * 2);
  // random direction
  const angle = Math.random() * Math.PI * 2;
  const speed = BASE_SPEED * (0.7 + Math.random() * 0.6); // small variation
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  return { x, y, vx, vy };
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [bulletsLeft, setBulletsLeft] = useState(BULLETS);
  const [hits, setHits] = useState(0);
  const [target, setTarget] = useState<Target>(() => randomTarget());
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState<string | null>(
    "¡Dispará al adorno! Cuando aciertes las suficientes veces, se revela el Amigo Invisible."
  );
  const areaRef = useRef<HTMLDivElement | null>(null);

  const resetGame = useCallback(() => {
    setBulletsLeft(BULLETS);
    setHits(0);
    setTarget(randomTarget());
    setRevealed(false);
    setMessage(
      "¡Dispará al adorno! Cuando aciertes las suficientes veces, se revela el Amigo Invisible."
    );
  }, []);

  // Ensure this game only renders on the client to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!revealed && hits >= REQUIRED_HITS) {
      setRevealed(true);
      setMessage("¡La rompiste! Tu Amigo Invisible es...");
    }
  }, [hits, revealed]);

  // Move target continuously to make it harder
  useEffect(() => {
    let frameId: number;

    const tick = () => {
      setTarget((prev) => {
        // If game is over or revealed, stop moving
        if (bulletsLeft <= 0 || revealed) {
          return prev;
        }

        const padding = EDGE_PADDING;
        let { x, y, vx, vy } = prev;

        x += vx;
        y += vy;

        let bounced = false;

        if (x < padding) {
          x = padding;
          vx = Math.abs(vx);
          bounced = true;
        } else if (x > 100 - padding) {
          x = 100 - padding;
          vx = -Math.abs(vx);
          bounced = true;
        }

        if (y < padding) {
          y = padding;
          vy = Math.abs(vy);
          bounced = true;
        } else if (y > 100 - padding) {
          y = 100 - padding;
          vy = -Math.abs(vy);
          bounced = true;
        }

        // Tiny random wiggle so path isn't perfectly straight
        if (!bounced) {
          const jitter = 0.005;
          vx += (Math.random() - 0.5) * jitter;
          vy += (Math.random() - 0.5) * jitter;
        }

        return { x, y, vx, vy };
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [bulletsLeft, revealed]);

  const handleShoot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (bulletsLeft <= 0 || revealed) return;
    if (!areaRef.current) return;

    setBulletsLeft((prev) => prev - 1);

    const rect = areaRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const dx = clickX - target.x;
    const dy = clickY - target.y;

    // Distance in percentage of container; convert radius from px approximately
    const approxRadiusPercent = (TARGET_RADIUS / rect.width) * 100;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= approxRadiusPercent) {
      // calculamos el nuevo número de aciertos primero
      setHits((prevHits) => {
        const nextHits = prevHits + 1;

        // Ajuste de velocidad por "fase":
        // 0 aciertos  -> velocidad base 0.5
        // 1 acierto   -> velocidad 1
        // 2+ aciertos -> velocidad 2
        let targetSpeed = BASE_SPEED;
        if (nextHits === 1) {
          targetSpeed = 1;
        } else if (nextHits >= 2) {
          targetSpeed = 2;
        }

        setMessage("¡Le pegaste! El objetivo ahora va más rápido.");

        setTarget((prevTarget) => {
          const angle = Math.random() * Math.PI * 2;
          return {
            ...prevTarget,
            vx: Math.cos(angle) * targetSpeed,
            vy: Math.sin(angle) * targetSpeed,
          };
        });

        return nextHits;
      });
    } else {
      setMessage("Pifiaste, probá de nuevo.");
    }
  };

  const gameOver = bulletsLeft === 0 && !revealed;

  if (!mounted) {
    return null;
  }

  return (
    <div className="game-root">
      <main className="game-main">
        <div className="game-card">
          <header className="game-header">
            <div>
              <h1 className="game-title">Tiro al Amigo Invisible</h1>
              <p className="game-subtitle">
                Tenés balas limitadas. Si le pegás varias veces al adorno que brilla,
                se revela quién es tu Amigo Invisible.
              </p>
            </div>
            <button onClick={resetGame} className="reset-button">
              Reiniciar juego
            </button>
          </header>

          <section className="stats-row">
            <div className="stats-chips">
              <div className="chip">
                <span className="chip-dot bullets" />
                <span>
                  <span className="chip-label-strong">Balas:</span>{" "}
                  <span>{bulletsLeft}</span> / {BULLETS}
                </span>
              </div>
              <div className="chip">
                <span className="chip-dot hits" />
                <span>
                  <span className="chip-label-strong">Aciertos:</span>{" "}
                  <span>{hits}</span> / {REQUIRED_HITS}
                </span>
              </div>
            </div>
            {message && <p className="status-text">{message}</p>}
          </section>

          <section className="arena-wrapper">
            <div
              ref={areaRef}
              onClick={handleShoot}
              className={`arena ${gameOver || revealed ? "disabled" : ""}`}
            >
              <div className="arena-grid" />

              {/* target */}
              {!revealed && (
                <div
                  className="target"
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                  }}
                >
                  <div className="target-ring" />
                  <div className="target-core" />
                </div>
              )}

              {/* overlays */}
              {(gameOver || revealed) && (
                <div className="overlay">
                  {gameOver && !revealed && (
                    <>
                      <p className="overlay-title loss">¡Te quedaste sin balas!</p>
                      <p className="overlay-text">
                        El Amigo Invisible se queda en misterio... por ahora.
                      </p>
                      <p className="overlay-sub">
                        Hacé clic en{" "}
                        <span className="overlay-strong">Reiniciar juego</span> para
                        intentarlo de nuevo.
                      </p>
                    </>
                  )}
                  {revealed && (
                    <>
                      <p className="overlay-title win">
                        ¡Se reveló el Amigo Invisible!
                      </p>
                      <p className="overlay-text">
                        Es{" "}
                        <span className="overlay-strong">Lautaro</span>.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <footer className="footer-text">
            Hacé clic en cualquier parte de la arena para disparar. Compartí la pantalla
            así los demás intentan adivinar quién es el Amigo Invisible antes de que se revele.
          </footer>
        </div>
      </main>
    </div>
  );
}
