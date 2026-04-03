export const TEAMS = {
  "Red Bull":     { color: "#3671C6", accent: "#FFD700", abbr: "RBR" },
  McLaren:        { color: "#FF8700", accent: "#FF8700", abbr: "MCL" },
  Mercedes:       { color: "#27F4D2", accent: "#27F4D2", abbr: "MER" },
  Ferrari:        { color: "#E8002D", accent: "#E8002D", abbr: "FER" },
  Williams:       { color: "#64C4FF", accent: "#64C4FF", abbr: "WIL" },
  "Aston Martin": { color: "#229971", accent: "#229971", abbr: "AMR" },
  Alpine:         { color: "#0093CC", accent: "#FF87BC", abbr: "ALP" },
  Haas:           { color: "#B6BABD", accent: "#E6002D", abbr: "HAA" },
  RB:             { color: "#6692FF", accent: "#6692FF", abbr: "RBT" },
  "Kick Sauber":  { color: "#52E252", accent: "#52E252", abbr: "SAU" },
};

export const DRIVERS = [
  { name: "Max Verstappen",   abbr: "VER", team: "Red Bull",       skill: 97 },
  { name: "Oscar Piastri",    abbr: "PIA", team: "McLaren",        skill: 92 },
  { name: "George Russell",   abbr: "RUS", team: "Mercedes",       skill: 91 },
  { name: "Carlos Sainz",     abbr: "SAI", team: "Williams",       skill: 90 },
  { name: "Lando Norris",     abbr: "NOR", team: "McLaren",        skill: 93 },
  { name: "Charles Leclerc",  abbr: "LEC", team: "Ferrari",        skill: 92 },
  { name: "Lewis Hamilton",   abbr: "HAM", team: "Ferrari",        skill: 94 },
  { name: "Fernando Alonso",  abbr: "ALO", team: "Aston Martin",   skill: 89 },
  { name: "Pierre Gasly",     abbr: "GAS", team: "Alpine",         skill: 85 },
  { name: "Yuki Tsunoda",     abbr: "TSU", team: "RB",             skill: 84 },
  { name: "Lance Stroll",     abbr: "STR", team: "Aston Martin",   skill: 80 },
  { name: "Kevin Magnussen",  abbr: "MAG", team: "Haas",           skill: 79 },
  { name: "Nico Hulkenberg",  abbr: "HUL", team: "Kick Sauber",    skill: 82 },
  { name: "Alexander Albon",  abbr: "ALB", team: "Williams",       skill: 86 },
  { name: "Esteban Ocon",     abbr: "OCO", team: "Haas",           skill: 83 },
  { name: "Liam Lawson",      abbr: "LAW", team: "RB",             skill: 81 },
  { name: "Jack Doohan",      abbr: "DOO", team: "Alpine",         skill: 76 },
  { name: "Oliver Bearman",   abbr: "BEA", team: "Kick Sauber",    skill: 78 },
  { name: "Kimi Antonelli",   abbr: "ANT", team: "Mercedes",       skill: 83 },
  { name: "Isack Hadjar",     abbr: "HAD", team: "Red Bull",       skill: 77 },
];

export const CIRCUITS = [
  { name: "Bahrain Grand Prix",    location: "Sakhir",      laps: 57, country: "BH" },
  { name: "Saudi Arabian GP",      location: "Jeddah",      laps: 50, country: "SA" },
  { name: "Australian Grand Prix", location: "Melbourne",   laps: 58, country: "AU" },
  { name: "Japanese Grand Prix",   location: "Suzuka",      laps: 53, country: "JP" },
  { name: "Chinese Grand Prix",    location: "Shanghai",    laps: 56, country: "CN" },
  { name: "Miami Grand Prix",      location: "Miami",       laps: 57, country: "US" },
  { name: "Monaco Grand Prix",     location: "Monte Carlo", laps: 78, country: "MC" },
  { name: "British Grand Prix",    location: "Silverstone", laps: 52, country: "GB" },
  { name: "Italian Grand Prix",    location: "Monza",       laps: 53, country: "IT" },
  { name: "Abu Dhabi Grand Prix",  location: "Yas Marina",  laps: 58, country: "AE" },
];

export const TYRE_COMPOUNDS = {
  S: { color: "#FF3333", name: "Soft",   deg: 1.4 },
  M: { color: "#FFD700", name: "Medium", deg: 1.0 },
  H: { color: "#FFFFFF", name: "Hard",   deg: 0.7 },
};
