document.getElementById("solarForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const postcode = document.getElementById("postcode").value;
  const systemSize = parseFloat(document.getElementById("systemSize").value);
  const systemCost = parseFloat(document.getElementById("systemCost").value);
  const monthlyUsage = parseFloat(document.getElementById("monthlyUsage").value);
  const annualUsage = monthlyUsage * 12;
  const electricityRate = 0.30;

  // Use Nominatim to get lat/lon from postcode or suburb
  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${postcode}`);
  const geoData = await geoRes.json();
  const lat = geoData[0]?.lat;
  const lon = geoData[0]?.lon;

  if (!lat || !lon) {
    alert("Could not find location.");
    return;
  }

  const pvWattsUrl = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=WiWq6RjGPS1kjDgdecSXkeKRSpGVyQCL4y46CetC&system_capacity=${systemSize}&module_type=1&losses=14&array_type=1&tilt=20&azimuth=180&lat=${lat}&lon=${lon}`;

  try {
    const res = await fetch(pvWattsUrl);
    const data = await res.json();
    const annualGeneration = data.outputs.ac_annual;
    const monthlyGen = data.outputs.ac_monthly;
    const annualSavings = Math.min(annualGeneration, annualUsage) * electricityRate;

    // Summary
    document.getElementById("summary").innerText = `
      Estimated Annual Generation: ${annualGeneration.toFixed(0)} kWh
      Estimated Annual Usage: ${annualUsage.toFixed(0)} kWh
      Estimated Annual Savings: $${annualSavings.toFixed(0)}
    `;

    // Battery sizing (assume 1.5 days of average use)
    const avgDailyUsage = annualUsage / 365;
    const recommendedBatterySize = avgDailyUsage * 1.5;

    document.getElementById("batteryRecommendation").innerText = 
      `Recommended Battery Size: ${recommendedBatterySize.toFixed(1)} kWh`;

    drawGenerationChart(monthlyGen);
    drawDCFChart(systemCost, annualSavings);
    drawAssumptions();

  } catch (err) {
    console.error("Error:", err);
  }
});

function drawGenerationChart(monthlyData) {
  const ctx = document.getElementById("generationChart").getContext("2d");
  if (window.generationChart) window.generationChart.destroy();

  window.generationChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        label: "Monthly Generation (kWh)",
        backgroundColor: "#4CAF50",
        data: monthlyData
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function drawDCFChart(initialCost, annualSavings) {
  const discountRate = 0.05;
  const degradation = 0.005;
  const years = 20;

  let cumulative = [];
  let sum = -initialCost;
  cumulative.push({ year: 0, value: sum });

  for (let t = 1; t <= years; t++) {
    let yearSavings = annualSavings * Math.pow(1 - degradation, t - 1);
    let discounted = yearSavings / Math.pow(1 + discountRate, t);
    sum += discounted;
    cumulative.push({ year: t, value: sum });
  }

  const ctx = document.getElementById("dcfChart").getContext("2d");
  if (window.dcfChart) window.dcfChart.destroy();

  window.dcfChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: cumulative.map(c => `Year ${c.year}`),
      datasets: [{
        label: "Cumulative Cash Flow ($)",
        data: cumulative.map(c => c.value),
        borderColor: "#2196F3",
        backgroundColor: "rgba(33, 150, 243, 0.1)",
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'AUD' }
        }
      }
    }
  });
}

function drawAssumptions() {
  document.getElementById("assumptions").innerHTML = `
    <h3>Assumptions</h3>
    <ul>
      <li>Electricity Rate: $0.30/kWh</li>
      <li>Discount Rate: 5%</li>
      <li>Degradation: 0.5%/year</li>
      <li>System Lifetime: 20 years</li>
      <li>Battery size based on 1.5× daily usage</li>
    </ul>
  `;
}
