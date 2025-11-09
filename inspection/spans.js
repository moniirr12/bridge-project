

document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded - starting initialization");
  
  // Load data or handle error
  let inspectionData;
  try {
      const data = sessionStorage.getItem('inspectionData');
      if (!data) throw new Error("No inspection data found");
      inspectionData = JSON.parse(data);
      console.log("Successfully loaded inspection data:", inspectionData);
      
      // Ensure each span has a defects array
      inspectionData.spans.forEach(span => {
        span.defects = span.defects || [];
      });
      
      // Store globally if needed elsewhere
      window.inspectionData = inspectionData;
      
      // Initialize span buttons
      initializeSpanButtons(inspectionData);
      
  } catch (error) {
      console.error("Initialization error:", error);
      showError("Missing inspection data. Please start over.");
  }
});

function initializeSpanButtons(inspectionData) {
  const spanTogglesContainer = document.querySelector('.span-toggles');
  
  // Clear existing buttons
  spanTogglesContainer.innerHTML = '';
  
  // Create buttons for each span
  inspectionData.spans.forEach(span => {
      const button = createSpanButton(span);
      spanTogglesContainer.appendChild(button);
  });
  
  // Activate default/first span
  activateDefaultSpan(inspectionData);
}

function createSpanButton(span) {
  const btn = document.createElement('button');
  btn.className = 'span-toggle';
  btn.textContent = `Span ${span.spanNumber}`;
  btn.dataset.spanNumber = span.spanNumber;
  
  btn.addEventListener('click', handleSpanButtonClick);
  return btn;
}

function handleSpanButtonClick(event) {
  const clickedButton = event.currentTarget;
  const spanNumber = clickedButton.dataset.spanNumber;
  
  // 1. Update UI state
  updateActiveButtonState(clickedButton);
  
  // 2. Store selection
  sessionStorage.setItem('selectedSpan', spanNumber);
  
  // 3. Update title
  updateSpanTitle(spanNumber);
  
  // 4. Clear and reload everything (critical change)
  loadInspectionElements(); // This will rebuild the entire table

  // 5. Optional: Trigger date change if needed
  document.getElementById('inspectionDates')?.dispatchEvent(new Event('change'));
}




// Helper functions
function updateActiveButtonState(activeButton) {
  document.querySelectorAll('.span-toggle').forEach(btn => {
      btn.classList.remove('active');
  });
  activeButton.classList.add('active');
}



function updateSpanTitle(spanNumber) {
  const titleElement = document.getElementById('current-span-title');
  if (titleElement) {
      titleElement.textContent = `Span ${spanNumber} Elements`;
  }
}

function activateDefaultSpan(inspectionData) {
  const selectedSpan = sessionStorage.getItem('selectedSpan') || 
                      inspectionData.spans[0]?.spanNumber;
  
  if (selectedSpan) {
      const defaultButton = document.querySelector(
          `.span-toggle[data-span-number="${selectedSpan}"]`
      );
      
      if (defaultButton) {
          defaultButton.click();
      }
  }
}

function showError(message) {
    alert(message);
}






document.getElementById('previewInspection').addEventListener('click', function() {
  // Get data from sessionStorage
  const inspectionData = JSON.parse(sessionStorage.getItem('inspectionData')) || {};
  const defects = JSON.parse(sessionStorage.getItem('defects')) || [];
  const photoData = JSON.parse(sessionStorage.getItem('photoData')) || {};
  
  // Group defects by span
  const defectsBySpan = {};
  defects.forEach(defect => {
    const span = defect.spanNumber || 'Unknown';
    if (!defectsBySpan[span]) {
      defectsBySpan[span] = [];
    }
    defectsBySpan[span].push(defect);
  });

  // Calculate BCI scores per span
  const spanBCIs = {};
  Object.keys(defectsBySpan).forEach(span => {
    const spanDefects = defectsBySpan[span];
    const severityValues = spanDefects.map(d => parseInt(d.severity, 10));
    const extentValues = spanDefects.map(d => d.extent);
    const itemNumbers = spanDefects.map(d => d.elementNumber);
    
    spanBCIs[span] = calculateBCI(severityValues, extentValues, itemNumbers);
  });

  // Generate span summary HTML
  const spanSummaryHTML = Object.keys(spanBCIs).map(span => `
    <div class="span-summary">
      <h3>Span ${span}</h3>
      <div class="bci-scores">
        <div class="bci-score">
          <span>BCI Average: </span>
          <span>${spanBCIs[span].bciAv.toFixed(2)}</span>
        </div>
        <div class="bci-score">
          <span>BCI Critical: </span>
          <span>${spanBCIs[span].bciCrit.toFixed(2)}</span>
        </div>
      </div>
      <p>Defects: ${defectsBySpan[span].length}</p>
    </div>
  `).join('');

  // Create formatted preview content
  let previewContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inspection Preview</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        h2 { margin-top: 30px; color: #444; }
        .span-summary {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #007bff;
        }
        .bci-scores {
          display: flex;
          gap: 20px;
          margin: 10px 0;
        }
        .bci-score {
          font-weight: bold;
        }
        pre { 
          background: #f5f5f5; 
          padding: 15px; 
          border-radius: 5px; 
          overflow-x: auto;
        }
        .container { max-width: 900px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${inspectionData.structureName || 'Structure'} Inspection</h1>
        <p><strong>Date:</strong> ${inspectionData.inspectionDate || 'N/A'}</p>
        
        <h2>Span Summary</h2>
        ${spanSummaryHTML}
        
        <h2>Inspection Details</h2>
        <pre>${JSON.stringify(inspectionData, null, 2)}</pre>
        
        <h2>All Defects (${defects.length})</h2>
        <pre>${JSON.stringify(defects, null, 2)}</pre>
        
        <h2>All Photos (${photoData.length})</h2>
        <pre>${JSON.stringify(photoData, null, 2)}</pre>
      </div>
    </body>
    </html>
  `;
  
  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(previewContent);
  previewWindow.document.close();
});






//SAVE INTO DATABASE
document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveInspection');
  let photoData = JSON.parse(sessionStorage.getItem('photoData')) || {};

  // Function to generate temporary defect key
  function generateTempDefectKey(defect) {
    const inspectionData = JSON.parse(sessionStorage.getItem('inspectionData')) || {};
    const date = new Date(inspectionData.inspectionDate);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `${inspectionData.structureId}_${formattedDate}_${defect.spanNumber}_${defect.elementNumber}_${defect.defectNo}`;
  }

  // Function to add photo to session storage
  function addPhotoToSession(defect, photoInfo) {
    const tempDefectKey = generateTempDefectKey(defect);
    
    if (!photoData[tempDefectKey]) {
      photoData[tempDefectKey] = [];
    }
    
    photoData[tempDefectKey].push(photoInfo);
    sessionStorage.setItem('photoData', JSON.stringify(photoData));
    console.log('Added photo to session:', photoData);
  }

  saveButton.addEventListener('click', async function() {
    try {
      // 1. Get data from sessionStorage
      const inspectionData = JSON.parse(sessionStorage.getItem('inspectionData')) || {};
      const defects = JSON.parse(sessionStorage.getItem('defects')) || [];
      const isEditMode = sessionStorage.getItem('inspectionMode') === 'edit';
      photoData = JSON.parse(sessionStorage.getItem('photoData')) || {};

      // 2. Validate data
      if (!inspectionData.structureId || defects.length === 0) {
        throw new Error("Incomplete inspection data. Please complete the inspection first.");
      }
      
      console.log("Current photoData:", photoData);

      // 3. Prepare data for backend
      const payload = {
        inspection: {
          structure_id: inspectionData.structureId,
          structure_name: inspectionData.structureName,
          inspection_date: inspectionData.inspectionDate,
          inspection_type: inspectionData.inspectionType,
          inspector_name: inspectionData.inspectorName,
          total_spans: inspectionData.totalSpans,
          spans: inspectionData.spans.map(span => ({
            ...span,
            spanNumber: Number(span.spanNumber),
            elementsInspected: Boolean(span.elementsInspected),
            photographsTaken: Boolean(span.photographsTaken),
            bciAv: span.bciA,
            bciCrit: span.bciC
          }))
        },
        defects: defects.map(defect => ({
          ...defect,
          spanNumber: Number(defect.spanNumber),
          elementNumber: Number(defect.elementNumber),
          worksRequired: defect.works_required,
          comments: defect.comments || ''
        })),
        photoData: photoData
      };

      let inspectionId;
      
      // 4. If in edit mode, fetch the inspectionId first
      if (isEditMode) {
        try {
          const findResponse = await fetch('http://localhost:3000/find-inspection-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structure_id: inspectionData.structureId,
              inspection_date: inspectionData.inspectionDate
            })
          });

          const findResult = await findResponse.json();

          if (!findResponse.ok) {
            throw new Error(findResult.message || "Failed to find inspection");
          }

          inspectionId = findResult.inspectionId;
          payload.inspectionId = inspectionId;
        } catch (error) {
          console.error("Error finding inspection ID:", error);
          throw new Error("Could not identify which inspection to update. Please try again.");
        }
      }

      // 5. Determine which endpoint to use
      const endpoint = isEditMode ? 'http://localhost:3000/update-inspection' : 'http://localhost:3000/save-inspection';
      const method = isEditMode ? 'PUT' : 'POST';

      // 6. Send to backend
      console.log("Sending payload to backend:", payload);
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to ${isEditMode ? 'update' : 'save'} inspection`);
      }

      alert(`Inspection ${isEditMode ? 'updated' : 'saved'} successfully! ID: ${isEditMode ? inspectionId : result.inspectionId}`);
      
      // 7. Clear session storage if not in edit mode
      if (!isEditMode) {
        sessionStorage.removeItem('inspectionData');
        sessionStorage.removeItem('defects');
        sessionStorage.removeItem('photoData');
      }
      
      // 8. Redirect
      if (isEditMode) {
        window.location.href = `inspection-details.html?id=${inspectionId}`;
      } else {
        window.location.href = 'inspections-list.html';
      }
      
    } catch (error) {
      console.error("Save error:", error);
      alert(`Save failed: ${error.message}`);
    }
  });
});