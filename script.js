const apiKey = 'WiWq6RjGPS1kjDgdecSXkeKRSpGVyQCL4y46CetC';
let chartInstance;

document.getElementById('calculatorForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const location = document.getElementById('location').value;
  const usage = parseFloat(document.getElementById('usage').value);
  const cost = parseFloat(document.getElementById('cost').value);
  const systemSize = 5; // kW

  const coords = await getLatLon(location);
  if (!coords) return alert('Could not find location.');

  const { lat, lon } = coords;
  const output = await getPVWattsData(lat, lon, systemSize, usage, cost);

  if (output) document.getElementById('results').classList.remove('hidden');
});

async function getLatLon(place) {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`);
    const data = await resp.json();
    if (data.length > 0) return { lat: data[0].lat, lon: data[0].lon };
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function getPVWattsData(lat, lon, systemSize, usage, cost) {
  const url = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${apiKey}&lat=${lat}&lon=${lon}&system_capacity=${systemSize}&azimuth=0&tilt=20&array_type=1&module_type=1&losses=14`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const output = json.outputs;

    const acAnnual = output.ac_annual;
    const acMonthly = output.ac_monthly;
    const monthlyOutput = acAnnual / 12;
    const offset = ((monthlyOutput / usage) * 100).toFixed(1);
    const savings = ((monthlyOutput * 0.30) * 12).toFixed(2); // Assuming $0.30/kWh
    const roi = (cost / (savings || 1)).toFixed(1);

    const recommendedBattery = usage * 1.5;
    const sunlightGrading = gradeSunlight(lat, lon);

    document.getElementById('annualOutput').textContent = `Estimated Annual Solar Output: ${acAnnual.toFixed(0)} kWh`;
    document.getElementById('offset').textContent = `This offsets ~${offset}% of your monthly usage.`;
    document.getElementById('savings').textContent = `Estimated Annual Savings: $${savings}`;
    document.getElementById('roi').textContent = `Estimated Payback Period: ${roi} years`;
    document.getElementById('battery').textContent = `Recommended Battery Size: ${recommendedBattery.toFixed(0)} kWh`;
    document.getElementById('sunlightGrading').textContent = `Sunlight Grading for your location: ${sunlightGrading}`;

    drawChart(acMonthly, usage);

    return output;
  } catch (err) {
    console.error("PVWatts error:", err);
    return null;
  }
}

function drawChart(solarData, usage) {
  const userMonthly = Array(12).fill(usage);
  const ctx = document.getElementById('solarChart').getContext('2d');

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label
