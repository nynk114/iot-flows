const panels = msg.payload;
let totalCurrent = 0;
let minCurrent = 0;
let maxCurrent = 0;
let totalCells = 0;
let totalAreaTemp = 0;

let standardDeviationMap = {};
let averageMap = {};
//goes from arrays to single values at the end

let irregularPanels = [];

// taken from https://stackoverflow.com/questions/7343890/standard-deviation-javascript
function getStandardDeviation(array) {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(
    array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n
  );
}

function getMean(array) {
  return array.reduce((a, b) => a + b) / array.length;
}

for (const panel of panels) {
  totalCurrent += panel.Current;
  totalAreaTemp +=
    panel.Area_Temp_1 +
    panel.Area_Temp_2 +
    panel.Area_Temp_3 +
    panel.Area_Temp_4;
  if (minCurrent === 0) {
    minCurrent = panel.Current;
  }
  minCurrent = minCurrent < panel.Current ? minCurrent : panel.Current;
  maxCurrent = maxCurrent > panel.Current ? maxCurrent : panel.Current;
  for (let property in panel) {
    if (standardDeviationMap.hasOwnProperty(property)) {
      standardDeviationMap[property] = [
        ...standardDeviationMap[property],
        panel[property],
      ];
    } else {
      standardDeviationMap[property] = [panel[property]];
    }
  }
}
//trim non actual data
delete standardDeviationMap["ID_Battery"];
delete standardDeviationMap["ID_Battery_Type"];
delete standardDeviationMap["Cell_balance"];
delete standardDeviationMap["ID_Warning"];
delete standardDeviationMap["GPS_Latitude"];
delete standardDeviationMap["GPS_Longitude"];

averageMap = { ...standardDeviationMap };

for (let property in averageMap) {
  averageMap[property] = getMean(averageMap[property])
}

//change to standard deviations
for (let property in standardDeviationMap) {
  standardDeviationMap[property] = getStandardDeviation(
    standardDeviationMap[property]
  );
}

for (const panel in panels) {
  let isIrregular = false;
  let irregularProperties = [];
  for (const property in panel) {
    if (standardDeviationMap.hasOwnProperty(property)) {
      const belowTwoDevs =
        panel[property] <
        averageMap[property] - 2 * standardDeviationMap[property];
      const aboveTwoDevs =
        panel[property] >
        averageMap[property] + 2 * standardDeviationMap[property];
      if (belowTwoDevs || aboveTwoDevs) {
        isIrregular = true;
        irregularProperties.push(property);
      }
    }
  }
  if (isIrregular) {
    irregularPanels.push({ ...panel, irregularProperties });
  }
}
console.log(standardDeviationMap)

const averageCurrent = parseFloat(totalCurrent) / panels.length;
const netAreaTemp = parseFloat(totalAreaTemp) / (panels.length * 4);

msg.payload = {
  panels: msg.payload,
  aggregations: {
    MinCurrent: minCurrent,
    MaxCurrent: maxCurrent,
    ...averageMap,
  },
  irregularPanels: irregularPanels,
};

return msg;
