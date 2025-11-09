
document.addEventListener("DOMContentLoaded", function () {
    const structureId = sessionStorage.getItem('structureId');  
    const structureName = sessionStorage.getItem('structureName');

    if (structureId && structureName) {
        // Update the header
        document.getElementById('bridgeHeader').textContent = `Inspection for ${structureName} (Bridge #${structureId})`;

        // ✅ Store structureId in a hidden form field (if needed)
        const structureIdInput = document.createElement('input');
        structureIdInput.type = 'hidden';
        structureIdInput.name = 'structureId';
        structureIdInput.value = structureId;
        document.getElementById('inspectionForm').appendChild(structureIdInput);

        // ✅ Fetch spans for the current structureId
        fetchSpans(structureId); // Pass structureId to fetchSpans
    } else {
        document.getElementById('bridgeHeader').textContent = "No structure data found.";
    }
});





document.addEventListener('DOMContentLoaded', async () => {
  const isEditMode = sessionStorage.getItem('inspectionMode') === 'edit';

  // Only fetch existing data in edit mode
  if (isEditMode) {
    const structureId = sessionStorage.getItem('inspectionStructureNumber');
    const inspectionDate = sessionStorage.getItem('inspectionDate');
    console.log('🏗️ Loading EXISTING inspection for editing:', { structureId, inspectionDate });

    if (!structureId || !inspectionDate) {
      console.error('❌ Edit mode missing required references');
      alert('Cannot edit - missing structure ID or inspection date. Please restart from reports list.');
      return;
    }

    try {
      console.time('🕒 Existing inspection fetch');
      const apiUrl = `http://localhost:3000/api/inspection/full?structure_id=${structureId}&date=${inspectionDate}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const inspectionData = await response.json();
      console.log('📊 Loaded existing inspection:', inspectionData);
      
      populateInspectionForm(inspectionData);
      console.timeEnd('🕒 Existing inspection fetch');

    } catch (error) {
      console.error('💥 Failed loading existing inspection:', error);
      alert(`Edit failed: ${error.message}\nPlease try reloading.`);
    }
  } else {
    console.log('🆕 Starting NEW inspection');
    // Initialize empty form for new inspection
    populateInspectionForm({
      structureId: sessionStorage.getItem('inspectionStructureNumber'),
      spans: [] // Empty array for new inspection
    });
  }
});



function populateInspectionForm(data) {
  // Merge fetched data into the global inspectionData
  inspectionData = {
    ...inspectionData, // Preserve any existing live updates
    ...data,           // Overwrite with fetched data
    spans: data.spans.map(span => ({
      ...span,
      // Ensure spans have all required fields
      elementsInspected: span.elementsInspected ?? null,
      photographsTaken: span.photographsTaken ?? null,
      comments: span.comments || ""
    }))
  };

  // Update UI fields
  document.getElementById('inspectorName').value = inspectionData.inspectorName;
  document.getElementById('inspectionDate').value = inspectionData.inspectionDate;
  
  // Update inspection type button selection
  document.querySelectorAll('.inspection-type-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === inspectionData.inspectionType);
  });

  // Update spans UI
  inspectionData.spans.forEach((span, index) => {
    completed[index] = true; // Mark spans as completed if editing
    responses[index] = {
      inspection: span.elementsInspected,
      photos: span.photographsTaken,
      comments: span.comments
    };
  });

  // Refresh UI
  renderSpanTabs();
  renderStep(currentIndex);
  updateProgress();
}





const structureId = parseInt(sessionStorage.getItem('structureId'), 10); // Convert to number
if (!isNaN(structureId)) {
    fetchSpans(structureId); // Pass structureId to fetchSpans
} else {
    console.error('Invalid structureId');
}



//function to navigate back to index.html and clear localStorage and sessionStorage
document.addEventListener('DOMContentLoaded', function() {
  const backButton = document.getElementById('toIndex');

  backButton.addEventListener('click', function() {
    // Show a confirmation pop-up
    const confirmBack = confirm("If you continue, you'll lose the progress on the inspection. Are you sure?");

    // If the user confirms, clear storage and navigate back
    if (confirmBack) {
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      console.log("Before clearing localStorage:", localStorage);
      console.log("Before clearing sessionStorage:", sessionStorage);

      // Navigate back to index.html
      window.location.href = "../index/index.html"; // Redirects to a new page
    } else {
      // If the user cancels, do nothing
      console.log("User canceled the action.");
    }
  });
});







// In inspection1.js
function date() {
  const inspectionDateCell = document.getElementById("inspectionDate");
  if (!inspectionDateCell) return;

  const input = document.createElement("input");
  input.type = "text";
  inspectionDateCell.innerHTML = "";
  inspectionDateCell.appendChild(input);

  const picker = flatpickr(input, {
    dateFormat: "Y-m-d",
    defaultDate: sessionStorage.getItem('inspectionDate') || "today",
    onChange: function(selectedDates) {
      if (selectedDates.length > 0) {
        const isoDate = selectedDates[0].toISOString().split('T')[0];
        sessionStorage.setItem('inspectionDate', isoDate);
        inspectionData.inspectionDate = isoDate; // Update the object
        console.log("Updated inspectionData:", inspectionData);
      }
    },
    onClose: function(selectedDates) {
      if (!selectedDates || selectedDates.length === 0) {
        inspectionDateCell.innerHTML = "Add";
        sessionStorage.removeItem('inspectionDate');
        inspectionData.inspectionDate = null; // Clear if no date
      }
    }
  });

  picker.open();
}








//NEW LAYOUT
// Initialize variables
let currentIndex = 0;
let spanNumber = 0;
let spans = [];
let completed = [];
let responses = [];
let selectedInspectionType = null;
const inspectionDate = sessionStorage.getItem('inspectionDate'); 

let inspectionData = {
    structureId: null,
    structureName: null,
    inspectionDate: inspectionDate, // YYYY-MM-DD format
    inspectionType: null,
    inspectorName: null,
    totalSpans: 0,
    spans: [],
};

// DOM elements
const progressBar = document.getElementById('progress');
const spanTabs = document.getElementById('span-tabs');
const formContent = document.getElementById('form-content');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const inspectionTypeButtons = document.querySelectorAll('.inspection-type-btn');
const inspectorNameInput = document.getElementById('inspectorName');

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('toBCI').addEventListener('click', navigateToNextPage);
    const structureId = sessionStorage.getItem('structureId');  
    const structureName = sessionStorage.getItem('structureName');

    // Event listeners
    prevBtn.addEventListener('click', handlePrev);
    nextBtn.addEventListener('click', handleNext);

    if (structureId && structureName) {
        document.getElementById('bridgeHeader').textContent = `Inspection for ${structureName} (Bridge #${structureId})`;
        
        // Store in inspection data
        inspectionData.structureId = structureId;
        inspectionData.structureName = structureName;

        // Fetch spans for the current structureId
        fetchSpans(structureId);
    } else {
        document.getElementById('bridgeHeader').textContent = "No structure data found.";
    }

    // Set up inspector name tracking
    inspectorNameInput.addEventListener('input', function() {
        inspectionData.inspectorName = this.value;
    });

    // Set up inspection type buttons
    inspectionTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            inspectionTypeButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedInspectionType = button.getAttribute('data-type');
            inspectionData.inspectionType = selectedInspectionType;
        });
    });
});

async function fetchSpans(bridgeId) {
    try {
        console.log("Fetching spans for bridgeId:", bridgeId);

        const response = await fetch(`http://localhost:3000/get-spans?bridgeId=${bridgeId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched data:", data);

        if (data.error) {
            console.error('Error from server:', data.error);
            return;
        }

        // Initialize the new layout with the fetched span number
        initializeNewLayout(data.span_number);
    } catch (error) {
        console.error('Error fetching spans:', error);
    }
}

function initializeNewLayout(numberOfSpans) {
    spanNumber = numberOfSpans;
    spans = Array.from({ length: spanNumber }, (_, i) => `Span ${i + 1}`);
    completed = new Array(spans.length).fill(false);

    // Update inspectionData with total spans count
    inspectionData.totalSpans = spanNumber;
    
    // Initialize responses array with empty objects for each span
    responses = new Array(spans.length).fill(null).map(() => ({
        inspection: null,
        photos: null,
        comments: ""
    }));
    
    // Initialize inspection data spans array
    inspectionData.spans = spans.map((span, index) => ({
        spanNumber: index + 1,
        elementsInspected: null,
        photographsTaken: null,
        comments: "",
        bciC: null,
        bciA: null
    }));
    
    // Set initial state
    renderSpanTabs();
    renderStep(currentIndex);
    updateButtons();
}

function updateProgress() {
    const progress = (completed.filter(Boolean).length / spans.length) * 100;
    progressBar.style.width = `${progress}%`;
}

function renderSpanTabs() {
    spanTabs.innerHTML = spans.map((span, index) => `
        <div class="span-tab ${index === currentIndex ? 'active' : ''} ${completed[index] ? 'completed' : ''}" onclick="setCurrentIndex(${index})">
            ${span}
        </div>
    `).join('');
}

function renderStep(index) {
  const response = responses[index];
  formContent.innerHTML = `
      <div class="step ${index === currentIndex ? 'active' : ''}">
          <h2>${spans[index]}</h2>
          <div class="question">
              <p>All above ground elements inspected?</p>
              <div class="options">
                  <button class="inspection ${response.inspection === true ? 'selected' : ''}" onclick="handleResponse('inspection', ${index}, true)">Yes</button>
                  <button class="inspection ${response.inspection === false ? 'selected' : ''}" onclick="handleResponse('inspection', ${index}, false)">No</button>
              </div>
          </div>
          <div class="question">
              <p>Photographs?</p>
              <div class="options">
                  <button class="photos ${response.photos === true ? 'selected' : ''}" onclick="handleResponse('photos', ${index}, true)">Yes</button>
                  <button class="photos ${response.photos === false ? 'selected' : ''}" onclick="handleResponse('photos', ${index}, false)">No</button>
              </div>
          </div>
          <textarea id="comments-${index}" placeholder="Enter comments...">${response.comments || ''}</textarea>
          <div class="mark-complete">
              <button onclick="markComplete(${index})">${completed[index] ? 'Update' : 'Mark Complete'}</button>
          </div>
      </div>
  `;
}

function handleResponse(type, index, value) {
  // Get the current comments before updating
  const commentsTextarea = document.getElementById(`comments-${index}`);
  const currentComments = commentsTextarea ? commentsTextarea.value : responses[index].comments;
  
  // Update responses
  responses[index] = {
      ...responses[index],
      [type]: value,
      comments: currentComments
  };
  
  // Update the inspection data
  if (type === 'inspection') {
      inspectionData.spans[index].elementsInspected = value;
  } else if (type === 'photos') {
      inspectionData.spans[index].photographsTaken = value;
  }
  
  // Update comments in inspection data
  inspectionData.spans[index].comments = currentComments;
  
  renderStep(index);
}

function setCurrentIndex(index) {
    // Save current comments before switching
    if (currentIndex >= 0 && currentIndex < spans.length) {
        const commentsTextarea = document.getElementById(`comments-${currentIndex}`);
        if (commentsTextarea) {
            responses[currentIndex].comments = commentsTextarea.value;
            inspectionData.spans[currentIndex].comments = commentsTextarea.value;
        }
    }
    
    currentIndex = index;
    renderSpanTabs();
    renderStep(currentIndex);
    updateButtons();
}

function handleNext() {
    if (currentIndex < spans.length - 1) {
        setCurrentIndex(currentIndex + 1);
    }
}

function handlePrev() {
    if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
    }
}

function markComplete(index) {
    // Save comments before marking complete
    const commentsTextarea = document.getElementById(`comments-${index}`);
    if (commentsTextarea) {
        responses[index].comments = commentsTextarea.value;
        inspectionData.spans[index].comments = commentsTextarea.value;
    }
    
    completed[index] = true;
    updateProgress();
    renderSpanTabs();
    
    // Log the complete inspection data
    console.log("Current inspection data:", inspectionData);

    if (currentIndex < spans.length - 1) {
        handleNext();
    }
}

// Helper function to download JSON
function downloadJSON(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function updateButtons() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === spans.length - 1;
}

// Initial render
renderSpanTabs();
renderStep(currentIndex);
updateButtons();



// Function to validate and proceed to next page
function navigateToNextPage() {
  // 1. STRICT CHECKS (block if missing)
  const missingCriticalFields = [];
  
  if (!inspectionData.inspectionType) {
    missingCriticalFields.push("Inspection Type");
  }
  
  if (!inspectionData.inspectorName) {
    missingCriticalFields.push("Inspector Name");
  }
  
  if (!inspectionData.inspectionDate) {
    missingCriticalFields.push("Inspection Date");
  }

  // Block if critical fields are missing
  if (missingCriticalFields.length > 0) {
    alert(`Cannot proceed:\n${missingCriticalFields.join("\n")} is required.`);
    return; // Stop here
  }

  // 2. SOFT CHECKS for spans (warn but allow proceed)
  const incompleteSpans = inspectionData.spans.filter((span, index) => 
    !completed[index] || 
    span.elementsInspected === null || 
    span.photographsTaken === null
  ).length;

  if (incompleteSpans > 0) {
    if (!confirm(`${incompleteSpans} span(s) are incomplete. Proceed anyway?`)) {
      return; // User chose "Cancel"
    }
  }

  // Save to sessionStorage (optional, if needed for next page)
  sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));

  // 3. ALL VALID - Proceed
  window.location.href = "../inspection/inspection.html";
}