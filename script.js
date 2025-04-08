const apiKey = 'WiWq6RjGPS1kjDgdecSXkeKRSpGVyQCL4y46CetC'; // Replace with your actual PVWatts API key
let chartInstance;

document.getElementById('calculatorForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const location = document.getElementById('location').value;
  const usage = parseFloat(document.getElementById('usage').value);
  const systemSize = 5; // 5kW system

  const coords = await getLatLon(location);
  if (!coords) {
    alert('Could not find location.');
    return;
  }

  const { lat, lon } = coords;
  const output = await getPVWattsData(lat, lon, systemSize, usage);

  if (output) {
    document.getElementById('results').classList.remove('hidden');
  }
});

async function getLatLon(place) {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`);
    const data = await resp.json();
    if (data.length > 0) {
      return { lat: data[0].lat, lon: data[0].lon };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function getPVWattsData(lat, lon, systemSize, usage) {
  const url = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${apiKey}&lat=${lat}&lon=${lon}&system_capacity=${systemSize}&azimuth=0&tilt=20&array_type=1&module_type=1&losses=14`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const output = json.outputs;

    const acAnnual = output.ac_annual;
    const acMonthly = output.ac_monthly;

    // Update text results
    const monthlyOutput = acAnnual / 12;
    const offset = ((monthlyOutput / usage) * 100).toFixed(1);
    const savings = ((monthlyOutput * 0.30) * 12).toFixed(2); // $0.30/kWh

    document.getElementById('annualOutput').textContent = `Estimated Annual Solar Output: ${acAnnual.toFixed(0)} kWh`;
    document.getElementById('offset').textContent = `This offsets ~${offset}% of your monthly usage.`;
    document.getElementById('savings').textContent = `Estimated Annual Bill Savings: $${savings}`;

    // Chart
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
      labels: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],
      datasets: [
        {
          label: 'Solar Output (kWh)',
          backgroundColor: '#4CAF50',
          data: solarData
        },
        {
          label: 'Your Monthly Usage (kWh)',
          backgroundColor: '#f39c12',
          data: userMonthly
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: 'Monthly Solar Output vs. Usage'
        }
      }
    }
  });
}
