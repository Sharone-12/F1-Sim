import { useEffect, useRef, useState } from "react";
import { simulateRaceTick } from "../simulation/raceEngine";

const RACE_TICK_MS = 1800;

export function useRaceController(raceState, setRaceState) {
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const tickStartRef = useRef(0);

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

    let frameId;

    const animate = (timestamp) => {
      if (!tickStartRef.current) {
        tickStartRef.current = timestamp;
      }

      const elapsed = timestamp - tickStartRef.current;
      setPlaybackProgress(Math.min(elapsed / RACE_TICK_MS, 1));
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [raceState.racePhase, raceState.currentLap]);

  useEffect(() => {
    if (raceState.racePhase !== "racing") {
      return undefined;
    }

    if (raceState.currentLap >= raceState.totalLaps) {
      setRaceState((previousState) => (
        previousState.racePhase === "racing"
          ? { ...previousState, racePhase: "finished" }
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
            racePhase: "finished",
          };
        }

        return nextRaceState;
      });
    }, RACE_TICK_MS);

    return () => window.clearTimeout(timerId);
  }, [raceState.racePhase, raceState.currentLap, raceState.totalLaps, setRaceState]);

  return {
    playbackProgress,
  };
}
