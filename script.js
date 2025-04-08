document.getElementById("solarForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const size = parseFloat(document.getElementById("systemSize").value);
  const cost = parseFloat(document.getElementById("systemCost").value);
  const [lat, lon] = document.getElementById("location").value.split(",").map(Number);

  const pvWattsUrl = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=WiWq6RjGPS1kjDgdecSXkeKRSpGVyQCL4y46CetC&system_capacity=${size}&module_type=1&losses=14&array_type=1&tilt=20&azimuth=180&lat=${lat}&lon=${lon}`;

  try {
    const res = await fetch(pvWattsUrl);
    const data = await res.json();
    const annualGeneration = data.outputs.ac_annual;
    const monthly = data.outputs.ac_monthly;

    const electricityRate = 0.30; // $/kWh
    const annualSavings = annualGeneration * electricityRate;

    // Display results
    document.getElementById("summary").innerText = `
      Estimated Annual Generation: ${annualGeneration.toFixed(0)} kWh
      Estimated Annual Savings: $${annualSavings.toFixed(0)}
    `;

    drawGenerationChart(monthly);
    drawDCFChart(cost, annualSavings);

    document.getElementById("assumptions").innerHTML = `
      <h3>Assumptions</h3>
      <ul>
        <li>Electricity Rate: $0.30/kWh</li>
        <li>Discount Rate: 5%</li>
        <li>Degradation: 0.5%/year</li>
        <li>System Lifetime: 20 years</li>
      </ul>
    `;
  } catch (err) {
    console.error("Error fetching PVWatts data:", err);
  }
});

function drawGenerationChart(monthlyData) {
  const ctx = document.getElementById("generationChart").getContext("2d");
  if (window.generationChart) window.generationChart.destroy();

  window.generationChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ],
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

function drawDCFChart(initialCost, annualSavings, years = 20) {
  const discountRate = 0.05;
  const degradation = 0.005;

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
