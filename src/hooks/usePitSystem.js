export function usePitSystem(setRaceState) {
  const selectPitTyre = (playerId, compound) => {
    setRaceState((previousState) => ({
      ...previousState,
      players: previousState.players.map((player) => (
        player.id === playerId
          ? { ...player, nextTyreCompound: compound }
          : player
      )),
    }));
  };

  const requestPit = (playerId) => {
    setRaceState((previousState) => ({
      ...previousState,
      players: previousState.players.map((player) => (
        player.id === playerId
          ? { ...player, hasRequestedPit: true }
          : player
      )),
    }));
  };

  const setFuelMode = (playerId, mode) => {
    setRaceState((previousState) => ({
      ...previousState,
      players: previousState.players.map((player) => (
        player.id === playerId
          ? { ...player, fuelMode: mode }
          : player
      )),
    }));
  };

  const setErsMode = (playerId, mode) => {
    setRaceState((previousState) => ({
      ...previousState,
      players: previousState.players.map((player) => (
        player.id === playerId
          ? { ...player, ersMode: mode }
          : player
      )),
    }));
  };

  return {
    requestPit,
    selectPitTyre,
    setFuelMode,
    setErsMode,
  };
}
