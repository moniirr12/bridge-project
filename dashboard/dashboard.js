document.addEventListener('DOMContentLoaded', function () {
    fetchTypeDistribution();
    const changePageButton = document.getElementById('toHome');

    changePageButton.addEventListener('click', function () {
        // Redirect to the new page
        window.location.href = "../index/index.html";  // Change this URL to your desired next page
    });
});



// Fetch total bridges count from your backend API
async function fetchBridgeCount() {
  const countElement = document.getElementById('bridge-count');
  
  try {
    countElement.textContent = 'Loading...';
    const response = await fetch('http://localhost:3000/api/debug/count-test');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    console.log('Full API response:', data); // Debug the complete response

    if (data.success && data.bridge_count !== undefined) {
      countElement.textContent = data.bridge_count;
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    console.error('Fetch error:', error);
    countElement.textContent = 'Error';
    countElement.className = 'error';
    setTimeout(fetchBridgeCount, 3000); // Retry after 3 seconds
  }
}

// Initial fetch when page loads
document.addEventListener('DOMContentLoaded', fetchBridgeCount);


async function fetchTypeDistribution() {
  try {
    const response = await fetch('http://localhost:3000/api/bridges/type-distribution');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    
    if (result.success && result.data) {
      renderPieChart(result.data);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching type distribution:', error);
    // Show error to user or retry
  }
}

function renderPieChart(typeData) {
  const ctx = document.getElementById('typeChart').getContext('2d');
  
  // Prepare data
  const labels = typeData.map(item => item.type || 'Unknown');
  const counts = typeData.map(item => item.count);
  
  // Colors for each type
  const backgroundColors = [
    'rgba(54, 162, 235, 0.7)',  // bridge - blue
    'rgba(75, 192, 192, 0.7)',  // footbridge - green
    'rgba(255, 159, 64, 0.7)',  // retaining wall - orange
    'rgba(153, 102, 255, 0.7)'  // any others - purple
  ];
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}