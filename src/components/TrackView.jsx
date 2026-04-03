import { useEffect, useRef, useState } from "react";

const TRACK_VIEWBOX = { width: 1000, height: 680 };
const TOTAL_TRACK_LENGTH = 1000;
const SECTOR_BREAKPOINTS = [
  { key: "S1", start: 0, end: 0.34, color: "rgba(225,6,0,0.72)" },
  { key: "S2", start: 0.34, end: 0.67, color: "rgba(255,196,87,0.6)" },
  { key: "S3", start: 0.67, end: 1, color: "rgba(115,201,255,0.62)" },
];
const DRIVER_COLORS = [
  "#E10600",
  "#27F4D2",
  "#FF8700",
  "#3671C6",
  "#52E252",
  "#FF87BC",
];
const BADGE_EVENT_TYPES = new Set(["pit_stop", "undercut", "overcut"]);
const EVENT_BADGE_META = {
  pit_stop: { label: "PIT", color: "#f4c542" },
  undercut: { label: "UNDERCUT", color: "#47d17a" },
  overcut: { label: "OVERCUT", color: "#59a8ff" },
  pit_request: { label: "PIT IN", color: "#ff8a3d" },
};
const EVENT_BADGE_TTL_MS = 1500;
const WEATHER_ALERT_TTL_MS = 1800;
const RECENT_EVENT_LAPS = 3;
const FEED_VISIBLE_LAPS = 4;

const SPA_TRACK_PATH = `
  M 116 600
  C 66 650, 40 640, 52 566
  C 66 488, 102 406, 152 318
  C 194 245, 228 192, 256 152
  C 282 116, 312 104, 340 92
  C 364 82, 380 58, 392 30
  C 404 4, 432 0, 456 22
  C 482 46, 494 90, 524 130
  C 566 184, 648 142, 740 82
  C 816 34, 892 16, 932 42
  C 966 64, 974 112, 950 142
  C 924 174, 866 150, 824 114
  C 798 92, 760 96, 736 122
  C 708 152, 712 198, 748 214
  C 790 234, 842 216, 868 248
  C 896 282, 888 326, 854 346
  C 814 368, 732 348, 664 360
  C 602 370, 578 416, 590 474
  C 602 530, 662 548, 738 550
  C 820 552, 910 556, 938 590
  C 966 624, 954 660, 914 664
  C 854 672, 778 666, 716 642
  C 654 618, 628 562, 578 530
  C 518 494, 430 500, 372 536
  C 324 566, 270 582, 220 596
  C 196 604, 192 576, 196 548
  C 202 516, 214 498, 204 484
  C 188 460, 164 512, 116 600
`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getDriverLabel(player) {
  const [firstName, lastName] = player.name.split(" ");
  return lastName ? `${player.position}. ${lastName}` : `${player.position}. ${firstName}`;
}

function formatEventLabel(event, playersById) {
  if (event.type === "weather_change") {
    return {
      actor: "TRACK",
      action: `${String(event.to).replace("_", " ").toUpperCase()} STARTED`,
      emphasis: "normal",
      arrow: null,
    };
  }

  const player = playersById.get(event.playerId);
  const driverName = player?.name?.split(" ").at(-1) ?? event.playerId;
  const eventMeta = EVENT_BADGE_META[event.type];

  if (event.type === "position_gain" || event.type === "position_loss") {
    const rivalName = event.rivalPlayerId
      ? playersById.get(event.rivalPlayerId)?.name?.split(" ").at(-1)
      : null;
    const gain = typeof event.previousPosition === "number" && typeof event.newPosition === "number"
      ? event.previousPosition - event.newPosition
      : 0;

    return {
      actor: driverName.toUpperCase(),
      action: rivalName
        ? `${gain > 0 ? "PASSED" : "LOST TO"} ${rivalName.toUpperCase()} (P${event.previousPosition} → P${event.newPosition})`
        : `${gain > 0 ? "POSITION GAIN" : "POSITION LOSS"} (P${event.previousPosition} → P${event.newPosition})`,
      emphasis: Math.abs(gain) >= 2 ? "high" : "normal",
      arrow: gain > 0 ? "↑" : "↓",
    };
  }

  if (!eventMeta) {
    return null;
  }

  const rivalName = event.rivalPlayerId
    ? playersById.get(event.rivalPlayerId)?.name?.split(" ").at(-1)
    : null;
  const positionDelta = typeof event.previousPosition === "number" && typeof event.newPosition === "number"
    ? ` (P${event.previousPosition} → P${event.newPosition})`
    : "";
  const action = rivalName
    ? `${eventMeta.label} ${rivalName}${positionDelta}`
    : `${eventMeta.label}${positionDelta}`;
  const gain = typeof event.previousPosition === "number" && typeof event.newPosition === "number"
    ? event.previousPosition - event.newPosition
    : 0;

  return {
    actor: driverName.toUpperCase(),
    action,
    emphasis: gain >= 2 || event.type === "undercut" || event.type === "overcut" ? "high" : "normal",
    arrow: gain > 0 ? "↑" : gain < 0 ? "↓" : null,
  };
}

export default function TrackView({ raceState, playbackProgress = 0 }) {
  const pathRef = useRef(null);
  const processedEventCountRef = useRef(0);
  const previousPositionsRef = useRef(new Map());
  const [pathLength, setPathLength] = useState(0);
  const [recentEvents, setRecentEvents] = useState([]);
  const [activeBadges, setActiveBadges] = useState([]);
  const [weatherAlert, setWeatherAlert] = useState(null);

  useEffect(() => {
    if (!pathRef.current) {
      return;
    }

    setPathLength(pathRef.current.getTotalLength());
  }, []);

  useEffect(() => {
    const incomingEvents = raceState.events.slice(processedEventCountRef.current);

    if (incomingEvents.length === 0) {
      return;
    }

    processedEventCountRef.current = raceState.events.length;

    setRecentEvents((previousEvents) => (
      [...previousEvents, ...incomingEvents].filter((event) => (
        raceState.currentLap - event.lap < FEED_VISIBLE_LAPS
      ))
    ));

    const badgeEvents = incomingEvents
      .filter((event) => BADGE_EVENT_TYPES.has(event.type) && event.playerId)
      .map((event) => ({
        id: `${event.type}-${event.playerId}-${event.lap}-${event.timestamp ?? raceState.currentLap}`,
        playerId: event.playerId,
        type: event.type,
      }));

    if (badgeEvents.length > 0) {
      setActiveBadges((previousBadges) => [...previousBadges, ...badgeEvents]);
      const badgeTimer = window.setTimeout(() => {
        setActiveBadges((previousBadges) => (
          previousBadges.filter((badge) => !badgeEvents.some((newBadge) => newBadge.id === badge.id))
        ));
      }, EVENT_BADGE_TTL_MS);

      return () => window.clearTimeout(badgeTimer);
    }

    const latestWeatherEvent = incomingEvents.findLast((event) => event.type === "weather_change");

    if (latestWeatherEvent) {
      const nextAlert = {
        id: `weather-${latestWeatherEvent.lap}-${latestWeatherEvent.to}`,
        label: `${String(latestWeatherEvent.to).replace("_", " ").toUpperCase()} STARTED`,
      };
      setWeatherAlert(nextAlert);
      const weatherTimer = window.setTimeout(() => {
        setWeatherAlert((currentAlert) => (currentAlert?.id === nextAlert.id ? null : currentAlert));
      }, WEATHER_ALERT_TTL_MS);

      return () => window.clearTimeout(weatherTimer);
    }
  }, [raceState.events, raceState.currentLap]);

  useEffect(() => {
    const currentPositions = new Map(raceState.players.map((player) => [player.id, player.position]));
    const previousPositions = previousPositionsRef.current;

    if (previousPositions.size > 0) {
      const generatedNarrativeEvents = [];

      raceState.players.forEach((player) => {
        const previousPosition = previousPositions.get(player.id);

        if (typeof previousPosition !== "number" || previousPosition === player.position) {
          return;
        }

        const positionDelta = previousPosition - player.position;
        const rival = raceState.players.find((otherPlayer) => {
          const otherPreviousPosition = previousPositions.get(otherPlayer.id);

          if (otherPlayer.id === player.id || typeof otherPreviousPosition !== "number") {
            return false;
          }

          return positionDelta > 0
            ? otherPreviousPosition < previousPosition && otherPlayer.position >= player.position
            : otherPreviousPosition > previousPosition && otherPlayer.position <= player.position;
        });

        generatedNarrativeEvents.push({
          type: positionDelta > 0 ? "position_gain" : "position_loss",
          playerId: player.id,
          rivalPlayerId: rival?.id,
          lap: raceState.currentLap,
          previousPosition,
          newPosition: player.position,
        });
      });

      if (generatedNarrativeEvents.length > 0) {
        setRecentEvents((previousEvents) => (
          [...previousEvents, ...generatedNarrativeEvents].filter((event) => (
            raceState.currentLap - event.lap < FEED_VISIBLE_LAPS
          ))
        ));
      }
    }

    previousPositionsRef.current = currentPositions;
  }, [raceState.currentLap, raceState.players]);

  useEffect(() => {
    const latestWeatherEvent = raceState.events.findLast((event) => event.type === "weather_change");

    if (!latestWeatherEvent) {
      return undefined;
    }

    const nextAlert = {
      id: `weather-${latestWeatherEvent.lap}-${latestWeatherEvent.to}`,
      label: `${String(latestWeatherEvent.to).replace("_", " ").toUpperCase()} STARTED`,
    };

    if (weatherAlert?.id === nextAlert.id) {
      return undefined;
    }

    setWeatherAlert(nextAlert);

    const weatherTimer = window.setTimeout(() => {
      setWeatherAlert((currentAlert) => (currentAlert?.id === nextAlert.id ? null : currentAlert));
    }, WEATHER_ALERT_TTL_MS);

    return () => window.clearTimeout(weatherTimer);
  }, [raceState.events, weatherAlert]);

  const playersById = new Map(raceState.players.map((player) => [player.id, player]));
  const enrichedRecentEvents = recentEvents
    .map((event) => {
      if (event.type === "weather_change") {
        return event;
      }

      const currentPlayer = playersById.get(event.playerId);
      const previousPosition = event.previousPosition
        ?? previousPositionsRef.current.get(event.playerId)
        ?? currentPlayer?.position;
      const newPosition = event.newPosition ?? currentPlayer?.position;

      return {
        ...event,
        previousPosition,
        newPosition,
      };
    })
    .filter((event) => raceState.currentLap - event.lap < FEED_VISIBLE_LAPS);

  const leaderTime = raceState.players.reduce(
    (lowest, player) => Math.min(lowest, player.totalTime),
    Number.POSITIVE_INFINITY,
  );

  const displayCars = raceState.players.map((player, index) => {
    const paceFactor = player.currentLapTime > 0
      ? clamp((raceState.players[0]?.currentLapTime ?? player.currentLapTime) / player.currentLapTime, 0.84, 1.08)
      : 1;
    const sectorProgress = clamp(playbackProgress * paceFactor, 0, 0.999);
    const timeGap = player.totalTime - leaderTime;
    const lapGap = player.currentLapTime > 0 ? timeGap / player.currentLapTime : 0;
    const lapProgress = clamp(raceState.currentLap + sectorProgress - lapGap, 0, raceState.totalLaps);
    const normalizedTrackPosition = (lapProgress / Math.max(raceState.totalLaps, 1)) * TOTAL_TRACK_LENGTH;
    const svgLengthPosition = pathLength > 0
      ? (normalizedTrackPosition / TOTAL_TRACK_LENGTH) * pathLength
      : 0;
    const point = pathRef.current?.getPointAtLength(svgLengthPosition) ?? { x: 790, y: 548 };

    return {
      ...player,
      point,
      sectorProgress,
      color: DRIVER_COLORS[index % DRIVER_COLORS.length],
      badge: activeBadges.findLast((badge) => badge.playerId === player.id) ?? null,
    };
  });

  const groupedEvents = Array.from(
    enrichedRecentEvents.reduce((groupMap, event) => {
      const existingGroup = groupMap.get(event.lap) ?? [];
      existingGroup.push(event);
      groupMap.set(event.lap, existingGroup);
      return groupMap;
    }, new Map())
      .entries(),
  )
    .sort((a, b) => b[0] - a[0])
    .slice(0, FEED_VISIBLE_LAPS)
    .map(([lap, events]) => ({ lap, events }));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 32,
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 34%), linear-gradient(180deg, rgba(18,20,25,0.94), rgba(9,11,16,0.98))",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 34px 90px rgba(0,0,0,0.34)",
      }}
    >
      <style>{`
        @keyframes trackBadgeIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.92); }
          100% { opacity: 1; transform: translateY(-2px) scale(1); }
        }
        @keyframes weatherBannerIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(0.94); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.98); }
        }
        @keyframes feedItemIn {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 0.9px, transparent 0.9px)",
          backgroundSize: "18px 18px",
          opacity: 0.26,
          pointerEvents: "none",
        }}
      />

      {weatherAlert && (
        <div
          style={{
            position: "absolute",
            top: 22,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            padding: "14px 24px",
            borderRadius: 18,
            background: "rgba(10,12,16,0.78)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 18px 34px rgba(0,0,0,0.28)",
            color: "#fff",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 30,
            letterSpacing: 1.8,
            animation: `weatherBannerIn ${WEATHER_ALERT_TTL_MS}ms ease forwards`,
          }}
        >
          {weatherAlert.label}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 22,
          bottom: 22,
          zIndex: 4,
          width: 290,
          maxHeight: 250,
          overflowY: "auto",
          padding: "16px 18px",
          borderRadius: 22,
          background: "rgba(9,11,16,0.74)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 18px 34px rgba(0,0,0,0.26)",
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: 3,
            color: "#E10600",
            textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
          Race Feed
        </div>
        {groupedEvents.length === 0 ? (
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: 1.6,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
            }}
          >
            Waiting for race events
          </div>
        ) : (
          groupedEvents.map((lapGroup) => (
            <div
              key={`lap-${lapGroup.lap}`}
              style={{
                padding: "10px 0 2px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                animation: "feedItemIn 220ms ease",
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: 1.1,
                  color: "#fff",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Lap {lapGroup.lap}
              </div>
              {lapGroup.events.map((event) => {
                const formatted = formatEventLabel(event, playersById);

                if (!formatted) {
                  return null;
                }

                const isPriority = formatted.emphasis === "high";

                return (
                  <div
                    key={`${event.type}-${event.playerId ?? event.to}-${event.lap}-${event.timestamp ?? event.lap}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 10,
                      alignItems: "start",
                      padding: "6px 0",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 800,
                        fontSize: isPriority ? 14 : 12,
                        letterSpacing: 1.8,
                        color: isPriority ? "#47d17a" : "rgba(255,255,255,0.52)",
                        lineHeight: 1.1,
                        textTransform: "uppercase",
                        minWidth: 12,
                      }}
                    >
                      {formatted.arrow ?? "•"}
                    </div>
                    <div style={{ lineHeight: 1 }}>
                      <div
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 800,
                          fontSize: isPriority ? 14 : 12,
                          letterSpacing: 1.8,
                          color: isPriority ? "#fff" : "rgba(255,255,255,0.88)",
                          textTransform: "uppercase",
                        }}
                      >
                        {formatted.actor}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: isPriority ? 700 : 600,
                          fontSize: isPriority ? 13 : 11,
                          letterSpacing: 1.4,
                          color: isPriority ? "rgba(116,217,167,0.94)" : "rgba(255,255,255,0.54)",
                          textTransform: "uppercase",
                          lineHeight: 1.2,
                        }}
                      >
                        {formatted.action}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <svg
        viewBox={`0 0 ${TRACK_VIEWBOX.width} ${TRACK_VIEWBOX.height}`}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <filter id="track-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          ref={pathRef}
          d={SPA_TRACK_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="40"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={SPA_TRACK_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.16"
          filter="url(#track-glow)"
        />

        {pathLength > 0 && SECTOR_BREAKPOINTS.map((sector) => {
          const segmentLength = pathLength * (sector.end - sector.start);
          const gapLength = pathLength - segmentLength;

          return (
            <path
              key={sector.key}
              d={SPA_TRACK_PATH}
              fill="none"
              stroke={sector.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${segmentLength} ${gapLength}`}
              strokeDashoffset={-pathLength * sector.start}
              opacity="0.82"
            />
          );
        })}

        {[
          { label: "S1", x: 382, y: 120 },
          { label: "S2", x: 806, y: 246 },
          { label: "S3", x: 614, y: 564 },
        ].map((sector) => (
          <g key={sector.label} transform={`translate(${sector.x} ${sector.y})`}>
            <circle cx="0" cy="0" r="20" fill="rgba(9,11,16,0.82)" stroke="rgba(255,255,255,0.14)" />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill="rgba(255,255,255,0.86)"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1 }}
            >
              {sector.label}
            </text>
          </g>
        ))}

        {displayCars.map((player) => (
          <g
            key={player.id}
            style={{
              transform: `translate(${player.point.x}px, ${player.point.y}px)`,
              transition: "transform 1.65s linear",
            }}
          >
            <circle
              cx="0"
              cy="0"
              r="16"
              fill={player.color}
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="3"
              style={{ filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.34))" }}
            />
            <circle
              cx="0"
              cy="0"
              r="6"
              fill="rgba(255,255,255,0.95)"
            />
            {(player.badge || player.hasRequestedPit) && EVENT_BADGE_META[player.badge?.type ?? "pit_request"] && (
              <foreignObject x="-18" y="-62" width="132" height="34" style={{ overflow: "visible" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: EVENT_BADGE_META[player.badge?.type ?? "pit_request"].color,
                    color: "#081017",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    boxShadow: "0 10px 18px rgba(0,0,0,0.25)",
                    animation: `trackBadgeIn ${player.badge ? EVENT_BADGE_TTL_MS : 900}ms ease forwards`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {EVENT_BADGE_META[player.badge?.type ?? "pit_request"].label}
                </div>
              </foreignObject>
            )}
            <foreignObject x="18" y="-18" width="150" height="42" style={{ overflow: "visible" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 14,
                  background: "rgba(9,11,16,0.78)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                  boxShadow: "0 10px 22px rgba(0,0,0,0.24)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: player.color }}>{player.position}</span>
                <span>{getDriverLabel(player)}</span>
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
}
