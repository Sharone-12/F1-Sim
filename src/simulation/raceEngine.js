export const TYRE_COMPOUNDS = {
  S: { color: "#FF3333", name: "Soft", deg: 1.6 },
  M: { color: "#FFD700", name: "Medium", deg: 1.0 },
  H: { color: "#EBEBEB", name: "Hard", deg: 0.65 },
  I: { color: "#43d17f", name: "Intermediate", deg: 1.15 },
  W: { color: "#2d7ef7", name: "Wet", deg: 1.45 },
};

const SECTOR_BASE_TIMES = { S1: 30, S2: 35, S3: 35 };
const TOTAL_BASE_LAP_TIME = Object.values(SECTOR_BASE_TIMES).reduce((sum, value) => sum + value, 0);
const SECTOR_WEAR_MULTIPLIER = { S1: 0.85, S2: 1, S3: 1.15 };
const TYRE_LAP_EFFECT = { S: -1.5, M: 0, H: 1, I: 0.4, W: 1.4 };
const DRIVING_STYLE_LAP_EFFECT = { aggressive: -0.5, balanced: 0, conservative: 0.4 };
const DRIVING_STYLE_WEAR_FACTOR = { aggressive: 1.1, balanced: 1, conservative: 0.9 };
const WEATHER_TYRE_PENALTY = {
  dry: { S: 0, M: 0, H: 0, I: 1.5, W: 3 },
  light_rain: { S: 2.5, M: 2.5, H: 2.5, I: 0, W: 1 },
  heavy_rain: { S: 5, M: 5, H: 5, I: 2, W: 0 },
};

const roundToThousandths = (value) => Number(value.toFixed(3));

const createLeaderboardEntry = (player) => ({
  playerId: player.id,
  name: player.name,
  position: player.position,
  totalTime: player.totalTime,
  currentLapTime: player.currentLapTime,
  pitCount: player.pitCount,
});

const getPitTyreForLap = (raceState) => (
  raceState.currentLap < raceState.totalLaps / 2 ? "M" : "H"
);

const getNextTimestamp = (events) => ((events.at(-1)?.timestamp ?? 0) + 1);

const buildPitEvent = (playerId, lap, forced) => ({
  type: "pit_stop",
  playerId,
  lap,
  forced,
});

// Calculation functions
export function calculateLapTime(player, raceState, sectorType) {
  const baseSectorTime = SECTOR_BASE_TIMES[sectorType] ?? SECTOR_BASE_TIMES.S1;
  const sectorWeight = baseSectorTime / TOTAL_BASE_LAP_TIME;
  const tyreLapEffect = TYRE_LAP_EFFECT[player.tyre] ?? 0;
  const fuelPenalty = player.fuelLoad * 0.03;
  const rawWearPenalty = player.tyreAge * 0.15 + player.tyreWear * 0.02;
  const suspensionWearFactor = 1 - player.setup.suspension * 0.002;
  const styleWearFactor = DRIVING_STYLE_WEAR_FACTOR[player.drivingStyle] ?? 1;
  const adjustedWearPenalty = rawWearPenalty * suspensionWearFactor * styleWearFactor;
  const weatherPenalty = WEATHER_TYRE_PENALTY[raceState.weather]?.[player.tyre] ?? 0;
  const drivingStyleLapEffect = DRIVING_STYLE_LAP_EFFECT[player.drivingStyle] ?? 0;

  let downforcePenalty = 0;

  if (sectorType === "S1") {
    downforcePenalty = (player.setup.downforce / 100) * 0.8;
  } else {
    downforcePenalty = ((100 - player.setup.downforce) / 100) * 0.6;
  }

  const sectorTime =
    baseSectorTime +
    tyreLapEffect * sectorWeight +
    fuelPenalty * sectorWeight +
    adjustedWearPenalty * sectorWeight * (SECTOR_WEAR_MULTIPLIER[sectorType] ?? 1) +
    drivingStyleLapEffect * sectorWeight +
    weatherPenalty * sectorWeight +
    downforcePenalty;

  return roundToThousandths(sectorTime);
}

export function calculateFullLap(player, raceState) {
  const s1 = calculateLapTime(player, raceState, "S1");
  const s2 = calculateLapTime(player, raceState, "S2");
  const s3 = calculateLapTime(player, raceState, "S3");
  const currentLapTime = roundToThousandths(s1 + s2 + s3);

  return {
    ...player,
    currentLapTime,
    sectorTimes: {
      S1: s1,
      S2: s2,
      S3: s3,
    },
  };
}

export function syncRaceStateCalculations(raceState) {
  const players = raceState.players.map((player) => calculateFullLap(player, raceState));

  return {
    ...raceState,
    players,
    leaderboard: players
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(createLeaderboardEntry),
  };
}

export function updateWeather(raceState) {
  let weather = "dry";

  if (raceState.currentLap >= 26) {
    weather = "heavy_rain";
  } else if (raceState.currentLap >= 16) {
    weather = "light_rain";
  }

  return {
    ...raceState,
    weather,
  };
}

// Simulation functions
export function performPitStop(player, nextTyreCompound = player.nextTyreCompound ?? player.tyre) {
  return {
    ...player,
    tyre: nextTyreCompound,
    tyreWear: 0,
    tyreAge: 0,
    pitCount: player.pitCount + 1,
    hasPitted: true,
    hasRequestedPit: false,
    nextTyreCompound,
    totalTime: roundToThousandths(player.totalTime + 22),
  };
}

export function simulateSingleLap(raceState) {
  const simulatedLap = raceState.currentLap + 1;
  const preLapPositions = new Map(raceState.players.map((player) => [player.id, player.position]));
  const pitEvents = [];

  const lapResults = raceState.players.map((player) => {
    let workingPlayer = player;
    let pittedThisLap = false;
    const selectedPitTyre = player.nextTyreCompound ?? getPitTyreForLap(raceState);

    if (player.hasRequestedPit) {
      workingPlayer = performPitStop(player, selectedPitTyre);
      pittedThisLap = true;
      pitEvents.push(buildPitEvent(player.id, simulatedLap, false));
    }

    const lapResult = calculateFullLap(workingPlayer, raceState);
    const tyreDeg = TYRE_COMPOUNDS[lapResult.tyre]?.deg ?? 0;

    return {
      ...lapResult,
      totalTime: roundToThousandths(workingPlayer.totalTime + lapResult.currentLapTime),
      tyreAge: workingPlayer.tyreAge + 1,
      tyreWear: Math.min(100, roundToThousandths(workingPlayer.tyreWear + tyreDeg * 2)),
      fuelLoad: Math.max(0, roundToThousandths(workingPlayer.fuelLoad - 2)),
      pittedThisLap,
      hasRequestedPit: workingPlayer.hasRequestedPit,
      nextTyreCompound: workingPlayer.nextTyreCompound,
    };
  });

  const rankedPlayers = lapResults
    .slice()
    .sort((a, b) => a.totalTime - b.totalTime)
    .map((player, index) => ({
      ...player,
      position: index + 1,
    }));

  const postLapPositions = new Map(rankedPlayers.map((player) => [player.id, player.position]));
  const strategyEvents = [];

  rankedPlayers.forEach((player) => {
    const previousPosition = preLapPositions.get(player.id) ?? player.position;
    const gainedPosition = player.position < previousPosition;

    if (!gainedPosition) {
      return;
    }

    if (player.pittedThisLap) {
      const gainedOnStayer = raceState.players.some((otherPlayer) => (
        otherPlayer.id !== player.id &&
        (preLapPositions.get(otherPlayer.id) ?? otherPlayer.position) < previousPosition &&
        !lapResults.find((lapPlayer) => lapPlayer.id === otherPlayer.id)?.pittedThisLap &&
        (postLapPositions.get(otherPlayer.id) ?? otherPlayer.position) > player.position
      ));

      if (gainedOnStayer) {
        strategyEvents.push({
          type: "undercut",
          playerId: player.id,
          lap: simulatedLap,
        });
      }

      return;
    }

    const gainedOnPitter = raceState.players.some((otherPlayer) => (
      otherPlayer.id !== player.id &&
      (preLapPositions.get(otherPlayer.id) ?? otherPlayer.position) < previousPosition &&
      lapResults.find((lapPlayer) => lapPlayer.id === otherPlayer.id)?.pittedThisLap &&
      (postLapPositions.get(otherPlayer.id) ?? otherPlayer.position) > player.position
    ));

    if (gainedOnPitter) {
      strategyEvents.push({
        type: "overcut",
        playerId: player.id,
        lap: simulatedLap,
      });
    }
  });

  const cleanedPlayers = rankedPlayers.map(({ pittedThisLap, ...player }) => player);

  return {
    ...raceState,
    players: cleanedPlayers,
    currentLap: simulatedLap,
    leaderboard: cleanedPlayers.map(createLeaderboardEntry),
    events: [...raceState.events, ...pitEvents, ...strategyEvents],
  };
}

export function simulateRaceTick(raceState) {
  const weatherUpdatedRaceState = updateWeather(raceState);
  const events = [...raceState.events];

  if (raceState.weather !== weatherUpdatedRaceState.weather) {
    events.push({
      type: "weather_change",
      from: raceState.weather,
      to: weatherUpdatedRaceState.weather,
      lap: raceState.currentLap,
      timestamp: getNextTimestamp(events),
    });
  }

  const nextRaceState = simulateSingleLap({
    ...weatherUpdatedRaceState,
    events,
  });

  return {
    ...nextRaceState,
    events: [
      ...nextRaceState.events,
      {
        type: "lap_complete",
        lap: nextRaceState.currentLap,
        timestamp: getNextTimestamp(nextRaceState.events),
      },
    ],
  };
}
