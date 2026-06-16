import { useEffect, useRef, useState } from "react";
import { simulateRaceTick } from "../simulation/raceEngine";

// Base duration of a single lap of playback at 1x speed.
const BASE_TICK_MS = 1800;

export function useRaceController(raceState, setRaceState, speed = 1, running = true) {
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const tickStartRef = useRef(0);

  // Effective lap duration — higher speed = shorter lap.
  const tickMs = BASE_TICK_MS / (speed > 0 ? speed : 1);

  useEffect(() => {
    if (raceState.racePhase === "finished") {
      setPlaybackProgress(1);
      return undefined;
    }

    if (raceState.racePhase !== "racing") {
      tickStartRef.current = 0;
      setPlaybackProgress(0);
      return undefined;
    }

    // Restart the sweep at the beginning of every lap so each lap drives the
    // car through one full circuit (0 → 1), instead of pinning at 1.
    tickStartRef.current = 0;
    setPlaybackProgress(0);

    let frameId;

    const animate = (timestamp) => {
      if (!tickStartRef.current) {
        tickStartRef.current = timestamp;
      }

      const elapsed = timestamp - tickStartRef.current;
      setPlaybackProgress(Math.min(elapsed / tickMs, 1));
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [raceState.racePhase, raceState.currentLap, tickMs]);

  useEffect(() => {
    if (raceState.racePhase !== "racing") {
      return undefined;
    }

    // Hold the grid until the lights go out.
    if (!running) {
      return undefined;
    }

    if (raceState.currentLap >= raceState.totalLaps) {
      // Leader has completed all laps — hand off to the cooldown phase so the
      // rest of the field can finish before results are shown.
      setRaceState((previousState) => (
        previousState.racePhase === "racing"
          ? { ...previousState, racePhase: "cooldown" }
          : previousState
      ));
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setRaceState((previousState) => {
        if (previousState.racePhase !== "racing") {
          return previousState;
        }

        const nextRaceState = simulateRaceTick(previousState);

        if (nextRaceState.currentLap >= nextRaceState.totalLaps) {
          return {
            ...nextRaceState,
            racePhase: "cooldown",
          };
        }

        return nextRaceState;
      });
    }, tickMs);

    return () => window.clearTimeout(timerId);
  }, [raceState.racePhase, raceState.currentLap, raceState.totalLaps, tickMs, running, setRaceState]);

  return {
    playbackProgress,
  };
}
