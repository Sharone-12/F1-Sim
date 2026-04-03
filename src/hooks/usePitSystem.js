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

  return {
    requestPit,
    selectPitTyre,
  };
}
