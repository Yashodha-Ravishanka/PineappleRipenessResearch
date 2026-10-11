export const demoReadings = [
  { time: "09:00", temperature: 27.4, humidity: 72, gas: 260, ripeness: "Unripe" },
  { time: "09:10", temperature: 27.8, humidity: 73, gas: 275, ripeness: "Unripe" },
  { time: "09:20", temperature: 28.1, humidity: 74, gas: 290, ripeness: "Unripe" },
  { time: "09:30", temperature: 28.5, humidity: 75, gas: 315, ripeness: "Developing" },
  { time: "09:40", temperature: 28.2, humidity: 74, gas: 330, ripeness: "Developing" },
  { time: "09:50", temperature: 28.7, humidity: 76, gas: 350, ripeness: "Developing" },
];

export const demoExperiments = [
  {
    id: 1,
    batch: "PN-001",
    variety: "Mauritius",
    stage: "Unripe",
    temperature: 27.4,
    humidity: 72,
    gas: 260,
    notes: "Initial demonstration reading",
  },
  {
    id: 2,
    batch: "PN-002",
    variety: "Kew",
    stage: "Developing",
    temperature: 28.5,
    humidity: 75,
    gas: 315,
    notes: "Demonstration reading during storage",
  },
  {
    id: 3,
    batch: "PN-003",
    variety: "Mauritius",
    stage: "Ripe",
    temperature: 29.1,
    humidity: 78,
    gas: 380,
    notes: "Illustrative example only",
  },
];