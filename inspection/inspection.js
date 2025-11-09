

// Modal functions
function openModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
}


function updateMainRow(potentialRow) {
  // console.group("updateMainRow"); LOOOG
  
  // 1. First determine if we got a main row or need to find it
  const mainRow = potentialRow.classList?.contains("main-row") 
    ? potentialRow 
    : findMainRow(potentialRow);

  if (!mainRow) {
    console.error("Could not resolve main row from:", potentialRow);
    console.groupEnd();
    return;
  }

  // 2. Find all expandable rows under this main row
  const expandableRows = findAllExpandableRows(mainRow);

  if (expandableRows.length > 0) {
    // console.log(`${expandableRows.length} expandable rows found`); LOOOG

    // 3. Update main row with data from first defect
    const firstDefect = expandableRows[0];
    const mainCells = mainRow.querySelectorAll("td");
    
    mainCells[2].textContent = firstDefect.querySelector(".addSeverity")?.textContent || "";
    mainCells[3].textContent = firstDefect.querySelector(".addExtent")?.textContent || "";
    mainCells[4].textContent = firstDefect.querySelector(".addDefect")?.textContent || "";
  } else {
    // console.log("No defects - clearing main row"); LOOOG
    
    // 4. Clear if no defects exist
    const mainCells = mainRow.querySelectorAll("td");
    mainCells[2].textContent = "";
    mainCells[3].textContent = "";
    mainCells[4].textContent = "";
  }

  console.groupEnd();
}


// Add this at the top with other global variables
const rowDataMap = new Map(); // To store data for each row

let currentExpandableRow = null; // Track the expandable row being edited




function saveChanges() {
  console.group("===== SAVING DEFECT DATA =====");

  const structureId = sessionStorage.getItem('structureId');
  const inspectionDate = sessionStorage.getItem('inspectionDate');

  // 1. VALIDATE REQUIRED DATA
  const selectedSpan = sessionStorage.getItem('selectedSpan');
  if (!selectedSpan) {
    console.error("No span selected - aborting save");
    alert("No span selected! Please select a span first.");
    console.groupEnd();
    return;
  }

  // 2. RESOLVE MAIN ROW WITH SAFETY CHECKS
  let mainRow = null;
  let resolutionMethod = "";

  // Case 1: Editing existing defect
  if (currentExpandableRow?.classList?.contains("expandable-row")) {
    mainRow = findMainRow(currentExpandableRow);
    resolutionMethod = "from currentExpandableRow";
  } 
  // Case 2: Adding new defect - MODIFIED TO USE findMainRow
  else if (currentRow) {
    mainRow = findMainRow(currentRow);
    resolutionMethod = "from currentRow via findMainRow";
    
    // If findMainRow fails, try using currentRow directly (with validation)
    if (!mainRow && currentRow.classList?.contains("main-row")) {
      mainRow = currentRow;
      resolutionMethod = "from currentRow (direct fallback)";
    }
  }

  // 3. FALLBACK RECOVERY IF NEEDED
  if (!mainRow?.classList?.contains("main-row")) {
    console.warn("Primary resolution failed. Attempting recovery...");
    
    // Try to find main row via DOM search
    const allMainRows = document.querySelectorAll("tr.main-row");
    if (allMainRows.length > 0) {
      // Heuristic: Use the last interacted-with main row
      mainRow = allMainRows[allMainRows.length - 1];
      resolutionMethod = "DOM recovery";
      console.warn("Using recovered main row:", mainRow.dataset.rowId);
    }
  }

  // 4. STRICT VALIDATION
  if (!mainRow?.classList?.contains("main-row")) {
    console.error("CRITICAL: No valid main row found", {
      currentExpandableRow: currentExpandableRow,
      currentRow: currentRow,
      resolutionMethod: resolutionMethod
    });
    alert("System error: Could not determine element location.\nPlease refresh the page and try again.");
    console.groupEnd();
    return;
  }

  const elementNumber = mainRow.dataset.rowId;
  console.log("Using main row:", {
    source: resolutionMethod,
    elementNumber: elementNumber,
    row: mainRow
  });

  defectCombined = `${document.getElementById("defectType").value}.${document.getElementById("defectNumber").value}`;

  // 5. BUILD DEFECT DATA
  const defectData = {
    defectCombined: `${document.getElementById("defectType").value}.${document.getElementById("defectNumber").value}`,
    defectType: document.getElementById("defectType").value,
    defectNumber: document.getElementById("defectNumber").value,
    severity: document.getElementById("severity").value,
    extent: document.getElementById("extent").value,
    works: document.getElementById("works").value,
    priority: document.getElementById("priority").value,
    cost: document.getElementById("cost").value,

    remedialWorks: document.getElementById("remedialWorks").value,

    comment: document.getElementById("comment").value,
    spanNumber: selectedSpan,
    elementNumber: elementNumber,
    timestamp: currentExpandableRow?.dataset.timestamp || new Date().toISOString(),
    defectId: `${structureId}_${inspectionDate}_${selectedSpan}_${elementNumber}_${defectCombined}`
  };

  // 6. SAVE TO STORAGE
  let defects = JSON.parse(sessionStorage.getItem('defects')) || [];
  const isEditing = !!currentExpandableRow?.dataset.timestamp;

  if (isEditing) {
    const index = defects.findIndex(d => d.timestamp === currentExpandableRow.dataset.timestamp);
    if (index >= 0) {
      defectData.timestamp = defects[index].timestamp; // Preserve original timestamp
      defects[index] = defectData;
      console.log("Updated existing defect at index:", index);
    } else {
      console.error("Original defect not found in storage");
      alert("Error: Could not find original defect data.");
      console.groupEnd();
      return;
    }
  } else {
    defects.push(defectData);
    console.log("Added new defect");
  }

  sessionStorage.setItem('defects', JSON.stringify(defects));

  // 7. UPDATE UI
  if (isEditing && currentExpandableRow) {
    console.log("Updating existing defect row");
    
    // Safe field updates
    const updateField = (selector, value) => {
      const el = currentExpandableRow.querySelector(selector);
      if (el) el.textContent = value;
    };

    updateField(".addDefect", defectData.defectCombined);
    updateField(".addSeverity", defectData.severity);
    updateField(".addExtent", defectData.extent);
    updateField(".addWorks", defectData.works);
    updateField(".addPriority", defectData.priority);
    updateField(".addCost", defectData.cost);
    updateField(".addComment", defectData.comment);

    updateField(".defectId", defectData.defectId);
    
    currentExpandableRow.dataset.timestamp = defectData.timestamp;
  } else {
    console.log("Creating new defect row");
    addDefectToTable(mainRow, defectData, false, true);
  }

  // 8. CALCULATE & STORE BCI SCORES (NEW)
  const { bciAv, bciCrit } = updateBCIScores();

  // Convert selectedSpan to a number (since array indices are numbers)
  const spanIndex = Number(selectedSpan) - 1; // Assuming spanNumber starts at 1

  // Ensure the span exists
  if (!inspectionData.spans[spanIndex]) {
      inspectionData.spans[spanIndex] = {}; // Initialize if missing
  }

  // Update BCI scores
  inspectionData.spans[spanIndex].bciA = bciAv.toFixed(2);
  inspectionData.spans[spanIndex].bciC = bciCrit.toFixed(2);

  // Save the updated inspectionData back to sessionStorage
  sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));

  // 9. FINAL UPDATES
  updateMainRow(mainRow);
  closeModal();

  console.log("===== SAVE COMPLETE =====");
  console.groupEnd();
}


// Attach functions globally for button events
window.closeModal = closeModal;
window.saveChanges = saveChanges;


// Initialize
window.onload = async function () {
  await loadInspectionElements();
};


// Function to fetch and populate element number and description
async function loadInspectionElements() {
  try {
    // 1. Load and create main element rows
    const elementsResponse = await fetch("http://localhost:3000/get_elements");
    const elementsData = await elementsResponse.json();
    const tableBody = document.querySelector("#inspectionElementsTable tbody");
    tableBody.innerHTML = "";

    // Create main rows
    elementsData.forEach(item => {
      const row = document.createElement("tr");
      row.dataset.rowId = item.no;
      row.classList.add("main-row");
      row.innerHTML = `
        <td class="itemno">${item.no || ''}</td>
        <td class="description">${item.description || ''}</td>
        <td class="severity"></td>
        <td class="extent"></td>
        <td></td>
      `;
      tableBody.appendChild(row);
    });

    // 2. Check for current span
    const currentSpan = sessionStorage.getItem('selectedSpan');
    if (!currentSpan) {
      console.warn("No span selected - not loading any defects");
      return;
    }

    // 3. Determine data source based on inspection mode
    const inspectionMode = sessionStorage.getItem('inspectionMode');
    const structureId = sessionStorage.getItem('structureId');
    const inspectionDate = sessionStorage.getItem('inspectionDate');

    if (inspectionMode === 'edit' && structureId && inspectionDate) {
      // Load defects from API
      await loadDefectsFromAPI(structureId, inspectionDate, currentSpan);
    } else {
      // Load from sessionStorage (new inspection)
      loadDefectsFromSession(currentSpan);
    }

    // 4. Update UI
    updateAllMainRows();
    updateBCIScores();

  } catch (error) {
    console.error("Error loading inspection elements:", error);
  }
}









async function loadDefectsFromAPI(structureId, inspectionDate, currentSpan) {
  console.log("Loading defects for span:", currentSpan);
  
  try {
    // 1. Fetch ALL defects from API (don't filter by span yet)
    const url = `http://localhost:3000/api/inspection/full?structure_id=${structureId}&date=${inspectionDate}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const inspectionData = await response.json();

    // 2. Get current defects from sessionStorage
    const currentDefects = JSON.parse(sessionStorage.getItem('defects')) || [];

    // 3. Process ALL API defects first (no span filtering yet)
    const allApiDefects = (inspectionData.defects || []).map(defect => {
      // Get frontDefectId from the first photo if available
      const frontDefectId = defect.photos && defect.photos.length > 0 
        ? defect.photos[0].frontDefectId 
        : null;
      
      return {
        defectCombined: defect.defectId,
        defectType: defect.defectId.split('.')[0],
        defectNumber: defect.defectId.split('.')[1],
        severity: defect.severity,
        extent: defect.extent,
        works: defect.worksRequired,
        priority: defect.priority,
        cost: defect.cost,
        comment: defect.comments,
        spanNumber: defect.spanNumber,
        elementNumber: defect.elementNumber,
        timestamp: defect.timestamp,
        remedialWorks: defect.remedialWorks,
        frontDefectId: frontDefectId,  // Add the frontDefectId here
        isFromAPI: true
      };
    });

    // 4. Merge strategy: Keep local versions of defects that match API defects
    const mergedDefects = [
      ...allApiDefects.filter(apiDefect => 
        !currentDefects.some(localDefect => 
          localDefect.elementNumber === apiDefect.elementNumber && 
          localDefect.defectCombined === apiDefect.defectCombined
        )
      ),
      ...currentDefects.map(localDefect => {
        // Preserve frontDefectId from local defects if they have one
        if (!localDefect.frontDefectId) {
          // Try to find matching API defect to get frontDefectId
          const matchingApiDefect = allApiDefects.find(apiDefect =>
            apiDefect.elementNumber === localDefect.elementNumber &&
            apiDefect.defectCombined === localDefect.defectCombined
          );
          if (matchingApiDefect) {
            return { ...localDefect, frontDefectId: matchingApiDefect.frontDefectId };
          }
        }
        return localDefect;
      })
    ];

    // 5. Save COMPLETE merged defects to sessionStorage
    sessionStorage.setItem('defects', JSON.stringify(mergedDefects));

    // 6. Now filter for current span and update UI
    const spanDefects = mergedDefects.filter(defect => defect.spanNumber == currentSpan);
    document.querySelectorAll("tr.expandable-row").forEach(row => row.remove());
    spanDefects.forEach(defect => {
      const mainRow = document.querySelector(`tr.main-row[data-row-id="${defect.elementNumber}"]`);
      if (mainRow) {
        addDefectToTable(mainRow, defect, defect.isFromAPI, false);
      }
    });

  } catch (error) {
    console.error("Defect loading failed:", error);
    // Fallback to existing defects if API fails
    const currentDefects = JSON.parse(sessionStorage.getItem('defects')) || [];
    const spanDefects = currentDefects.filter(defect => defect.spanNumber == currentSpan);
    spanDefects.forEach(defect => {
      const mainRow = document.querySelector(`tr.main-row[data-row-id="${defect.elementNumber}"]`);
      if (mainRow) addDefectToTable(mainRow, defect, defect.isFromAPI, false);
    });
  }
}

function loadDefectsFromSession(currentSpan) {
  const defectsData = JSON.parse(sessionStorage.getItem('defects')) || [];
  
  if (defectsData.length > 0) {
    // Clear existing expandable rows
    document.querySelectorAll("tr.expandable-row").forEach(row => row.remove());

    // Filter and add defects
    defectsData
      .filter(defect => defect.spanNumber === currentSpan)
      .forEach(defect => {
        const mainRow = document.querySelector(`tr.main-row[data-row-id="${defect.elementNumber}"]`);
        if (mainRow) {
          addDefectToTable(mainRow, defect, false, true); // isRetrieved=false, isEditable=true
        }
      });
  }
}

// Helper function to update all main row summaries
function updateAllMainRows() {
  document.querySelectorAll("tr.main-row").forEach(mainRow => {
    updateMainRow(mainRow);
  });
}

let currentRow = null; // Track the currently active row

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded. Initializing event listeners...");

  // Add click event listener to the table for row toggling
  document.getElementById('inspectionElementsTable').addEventListener('click', function (event) {
    const target = event.target;
    const mainRow = target.closest('tr.main-row'); // Find the closest main row

    // Ensure the click is on a main row
    if (mainRow) {
      console.log("Main row clicked:", mainRow);
      toggleButtonRow(mainRow);
    }
  });

  // Add event listener for "Add Defect" button
  document.getElementById('inspectionElementsTable').addEventListener('click', function (event) {
    const target = event.target;
  
    // Handle "Add Defect" button click
    if (target.classList.contains('btn-add-defect')) {
      console.log("Add Defect button clicked");
  
      // Find the associated main row
      const buttonRow = target.closest('tr.button-row');
      if (buttonRow) {
        currentRow = buttonRow.previousElementSibling; // Set the main row as active
        currentExpandableRow = null; // Reset since we're adding a new defect
        openModal();
      }
    }
  });
});




// Helper function to find all expandable rows under a main row
function findAllExpandableRows(mainRow) {
  const expandableRows = [];
  let sibling = mainRow.nextElementSibling;

  // Traverse all siblings after the main row
  while (sibling) {
    // Stop if we encounter another main row
    if (sibling.classList.contains("main-row")) {
      break;
    }

    // If the sibling is an expandable row, add it to the array
    if (sibling.classList.contains("expandable-row")) {
      expandableRows.push(sibling);
    }

    // Move to the next sibling
    sibling = sibling.nextElementSibling;
  }

  return expandableRows;
}


document.getElementById('inspectionElementsTable').addEventListener('click', function (event) {
  const target = event.target;

  // Handle "Add Defect" button click
  if (target.classList.contains('btn-add-defect')) {
    handleAddDefectClick(target);
  }
});

function handleAddDefectClick(target) {
  const buttonRow = target.closest('tr.button-row');
  if (buttonRow) {
    // Find the main row by traversing upwards
    const mainRow = findMainRow(buttonRow);

    if (mainRow) {
      console.log("Main row found for Add Defect:", mainRow);
      openModal();
    } else {
      console.error("Main row not found for Add Defect!");
    }
  }
}

document.getElementById('inspectionElementsTable').addEventListener('click', function (event) {
  const target = event.target;

  // Handle "Edit" button click
  if (target.closest("button[title='Edit']")) {
    handleEditClick(target);
  }
});

function handleEditClick(target) {
  const expandableRow = target.closest("tr.expandable-row");

  // Check if the row is a retrieved defect
  if (expandableRow && expandableRow.classList.contains("retrieved-defect")) {
    alert("Retrieved defects cannot be edited. Please copy the defect to create a new editable version.");
    return; // Stop further execution (prevent modal from opening)
  }

  // Proceed with editing for non-retrieved defects
  if (expandableRow) {
    // Find the main row by traversing upwards
    const mainRow = findMainRow(expandableRow);

    if (mainRow) {
      console.log("Main row found for Edit Defect:", mainRow);
      openModal();
    } else {
      console.error("Main row not found for Edit Defect!");
    }
  }
}




document.getElementById("inspectionElementsTable").addEventListener("click", function(event) {
  const target = event.target;

  // Handle "Copy" button click
  if (target.closest("button[title='Copy']")) {
    const expandableRow = target.closest("tr.expandable-row");

    // Check if the row is a retrieved defect
    if (expandableRow && expandableRow.classList.contains("retrieved-defect")) {
      console.log("Copying a retrieved defect.");

      // Get data from the retrieved defect
      const defectCombined = expandableRow.querySelector(".addDefect").textContent;
      const [defectType, defectNumber] = defectCombined.split('.');
      const severity = expandableRow.querySelector(".addSeverity").textContent;
      const extent = expandableRow.querySelector(".addExtent").textContent;
      const works = expandableRow.querySelector(".addWorks").textContent;
      const priority = expandableRow.querySelector(".addPriority").textContent;
      const cost = expandableRow.querySelector(".addCost").textContent;
      const comment = expandableRow.querySelector(".addComment").textContent;

      const remedialWorks = expandableRow.querySelector(".addRemedialWorks").textContent;

      // Get the currently selected span and element number
      const selectedSpan = sessionStorage.getItem('selectedSpan');
      if (!selectedSpan) {
        alert("No span selected! Please select a span first.");
        return;
      }
      
      // Find the main row to get the element number
      let mainRow = expandableRow;
      while (mainRow && !mainRow.classList.contains("main-row")) {
        mainRow = mainRow.previousElementSibling;
      }
      const elementNumber = mainRow ? mainRow.dataset.rowId : null;

      // Create defect data object with proper timestamp
      const defectData = {
        defectCombined: defectCombined,
        defectType: defectType,
        defectNumber: defectNumber,
        severity: severity,
        extent: extent,
        works: works,
        priority: priority,
        cost: cost,
        comment: comment,
        spanNumber: selectedSpan,
        elementNumber: elementNumber,
        timestamp: new Date().toISOString(), // New unique timestamp for the copy
        remedialWorks: remedialWorks
      };

      // Save to sessionStorage using 'defects' key
      let defects = JSON.parse(sessionStorage.getItem('defects')) || [];
      defects.push(defectData);
      sessionStorage.setItem('defects', JSON.stringify(defects));
      console.log("Copied defect saved to defects data:", defectData);

      // Create a new expandable row (editable)
      const template = document.getElementById("templateRow");
      const clone = template.content.cloneNode(true);
      const newExpandableRow = clone.querySelector("tr.expandable-row");

      // Populate the new row with the copied data
      newExpandableRow.querySelector(".addDefect").textContent = defectCombined;
      newExpandableRow.querySelector(".addSeverity").textContent = severity;
      newExpandableRow.querySelector(".addExtent").textContent = extent;
      newExpandableRow.querySelector(".addWorks").textContent = works;
      newExpandableRow.querySelector(".addPriority").textContent = priority;
      newExpandableRow.querySelector(".addCost").textContent = cost;
      newExpandableRow.querySelector(".addComment").textContent = comment;
      
      // Set the timestamp as data attribute (important for future edits)
      newExpandableRow.dataset.timestamp = defectData.timestamp;

      if (mainRow) {
        // Find all existing expandable rows
        const allRows = Array.from(mainRow.parentNode.children);
        const mainRowIndex = allRows.indexOf(mainRow);
        
        // Find position to insert (after main row but before first retrieved defect)
        let insertPosition = mainRow.nextSibling;
        for (let i = mainRowIndex + 1; i < allRows.length; i++) {
          if (allRows[i].classList.contains("retrieved-defect")) {
            insertPosition = allRows[i];
            break;
          }
        }

        // Insert the new row
        if (insertPosition) {
          mainRow.parentNode.insertBefore(newExpandableRow, insertPosition);
        } else {
          mainRow.parentNode.appendChild(newExpandableRow);
        }

        // Ensure the new row is visible
        newExpandableRow.style.display = "table-row";

        // Update the main row and BCI scores
        updateMainRow(mainRow);
        updateBCIScores();

        alert("Defect copied successfully. You can now edit the new defect.");
      } else {
        console.error("Main row not found for copied defect");
      }
    } else {
      console.log("Copying is only allowed for retrieved defects.");
      alert("Copying is only allowed for retrieved defects.");
    }
  }
});



// Helper function to find the main row
function findMainRow(startRow) {
  // If the startRow is already a main row, return it
  if (startRow.classList.contains("main-row")) {
    return startRow;
  }

  let currentRow = startRow.previousElementSibling;

  while (currentRow) {
    console.log("Checking row:", currentRow.className);

    // Skip expandable rows
    if (currentRow.classList.contains("expandable-row")) {
      currentRow = currentRow.previousElementSibling;
      continue;
    }

    // If we find the main row, return it
    if (currentRow.classList.contains("main-row")) {
      console.log("Main row found:", currentRow);
      return currentRow;
    }

    currentRow = currentRow.previousElementSibling;
  }

  console.error("No main row found!");
  return null;
}


// Attach the event listener to the table (or a parent element)
document.getElementById("inspectionElementsTable").addEventListener("click", function (event) {
  // Check if the clicked element is a delete button
  if (event.target.closest("button[title='Delete']")) {
    deleteDefect(event); // Call the delete function
  }
});

// Function to delete a defect
function deleteDefect(event) {
  // 1. Confirm deletion
  if (!confirm("Are you sure you want to delete this defect?")) return;

  // 2. Find the expandable row (FIXED THE TYPO IN CLASS NAME)
  const expandableRow = event.target.closest("tr.expandable-row"); // Fixed from "expandable-row"
  if (!expandableRow) {
    console.error("No expandable row found!");
    return;
  }

  // 3. Get the defect's unique timestamp
  const defectTimestamp = expandableRow.dataset.timestamp;
  if (!defectTimestamp) {
    console.error("Defect has no timestamp identifier!");
    return;
  }

  // 4. Remove from session storage
  let defects = JSON.parse(sessionStorage.getItem('defects')) || [];
  const initialLength = defects.length;
  
  // Filter out the defect to delete
  defects = defects.filter(defect => defect.timestamp !== defectTimestamp);
  
  if (defects.length < initialLength) {
    sessionStorage.setItem('defects', JSON.stringify(defects));
    console.log("Defect removed from session storage. Remaining defects:", defects.length);
  } else {
    console.warn("Defect not found in session storage, but removing from UI anyway");
  }

  // 5. Find the associated main row
  const mainRow = findMainRow(expandableRow);
  
  // 6. Remove from UI
  expandableRow.remove();
  console.log("Defect removed from UI");

  // 7. Update the main row if found
  if (mainRow) {
    updateMainRow(mainRow);
  }

  // 8. Update BCI scores
  updateBCIScores();
}




document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded. Initializing event listeners...");

  // Event listener for the table
  document.getElementById("inspectionElementsTable").addEventListener("click", function(event) {
    const target = event.target;
    console.log("Clicked element:", target);

    // Check if the clicked element is an Edit button
    if (target.closest("button[title='Edit']")) {
      console.log("Edit button clicked!");

      // Get the expandable row containing the clicked button
      const expandableRow = target.closest("tr.expandable-row");
      if (expandableRow) {
        console.log("Expandable row found:", expandableRow);

        // Check if the row is a retrieved defect
        if (expandableRow.classList.contains("retrieved-defect")) {
          alert("Retrieved defects cannot be edited. Create a copy instead.");
          return;
        }

        // Find the main row for this expandable row
        currentRow = findMainRow(expandableRow);
        if (!currentRow) {
          console.error("Could not find main row for expandable row!");
          return;
        }

        // Set the currentExpandableRow to the row being edited
        currentExpandableRow = expandableRow;

        // Retrieve data from the expandable row
        const defectCombined = expandableRow.querySelector(".addDefect").textContent;
        const severity = expandableRow.querySelector(".addSeverity").textContent;
        const extent = expandableRow.querySelector(".addExtent").textContent;
        const works = expandableRow.querySelector(".addWorks").textContent;
        const priority = expandableRow.querySelector(".addPriority").textContent;
        const cost = expandableRow.querySelector(".addCost").textContent;
        const comment = expandableRow.querySelector(".addComment").textContent;

        const remedialWorks = expandableRow.querySelector(".addRemedialWorks").textContent;

        // Split defectCombined into defectType and defectNumber
        const [defectType, defectNumber] = defectCombined.split('.');

        // Pre-fill the modal with the retrieved data
        document.getElementById("defectType").value = defectType;
        document.getElementById("defectNumber").value = defectNumber;
        document.getElementById("severity").value = severity;
        document.getElementById("extent").value = extent;
        document.getElementById("works").value = works;
        document.getElementById("priority").value = priority;
        document.getElementById("cost").value = cost;
        document.getElementById("comment").value = comment;

        document.getElementById("remedialWorks").value = remedialWorks;

        // Update the modal title
        document.getElementById("modalTitle").textContent = "Edit Defect";

        // Open the modal
        openModal();
      } else {
        console.error("Expandable row not found for the clicked button:", target);
      }
    }
  });
});



function addDefectToTable(mainRow, defectData, isRetrieved, isEditable = false) {
  // ===== PHASE 1: VALIDATION =====
  console.group('addDefectToTable Debug');
  
  // 1.1 Validate span context
  const currentSpan = sessionStorage.getItem('selectedSpan');
  if (!currentSpan) {
    console.error("❌ No span selected - cannot add defect");
    console.groupEnd();
    return null;
  }
  console.log("✅ Current span:", currentSpan);

  // 1.2 Validate defect data
  if (!defectData || typeof defectData !== 'object') {
    console.error("❌ Invalid defect data");
    console.groupEnd();
    return null;
  }
  console.log("📋 Defect data:", JSON.parse(JSON.stringify(defectData)));

  // ===== PHASE 2: TEMPLATE HANDLING =====
  console.log("🔍 Looking for template...");
  const template = document.getElementById("templateRow");
  if (!template) {
    console.error("❌ Template not found");
    console.groupEnd();
    return null;
  }
  console.log("✅ Template found");

  // 2.1 Clone template
  console.log("⚙️ Cloning template...");
  const clone = template.content.cloneNode(true);
  const expandableRow = clone.querySelector("tr.expandable-row");
  if (!expandableRow) {
    console.error("❌ Expandable row not found in template");
    console.groupEnd();
    return null;
  }
  console.log("✅ Template cloned");

  // ===== PHASE 3: DATA POPULATION =====
  console.log("🖊️ Populating data...");
  
  // 3.1 Set metadata
  expandableRow.dataset.timestamp = defectData.timestamp || new Date().toISOString();
  expandableRow.dataset.span = currentSpan;
  expandableRow.dataset.element = mainRow.dataset.rowId;

  // 3.2 Field mapping with validation
  const fieldMap = {
    '.addDefect': 'defectCombined',
    '.addSeverity': 'severity',
    '.addExtent': 'extent',
    '.addWorks': 'works',
    '.addPriority': 'priority',
    '.addCost': 'cost',
    '.addComment': 'comment',
    '.addRemedialWorks': 'remedialWorks'
  };

  // First populate all standard fields
  Object.entries(fieldMap).forEach(([selector, dataKey]) => {
    const element = expandableRow.querySelector(selector);
    if (!element) {
      console.error(`❌ Element ${selector} not found`);
      return;
    }

    const value = defectData[dataKey];
    console.log(`Setting ${selector} (${dataKey}) to:`, value);
    
    if (element.textContent === "Add" && !value) {
      console.warn(`⚠️ No value for ${dataKey}, keeping "Add" placeholder`);
    }
    
    element.textContent = value || '';
  });

  // SPECIAL HANDLING FOR DEFECT ID
  const defectIdElement = expandableRow.querySelector('.defectId');
  if (defectIdElement) {
    // For retrieved defects, prefer frontDefectId if available
    if (isRetrieved) {
      defectIdElement.textContent = defectData.frontDefectId || defectData.defectId || '';
      console.log(`Setting .defectId to (retrieved):`, defectIdElement.textContent);
    } 
    // For new defects, use defectId
    else {
      defectIdElement.textContent = defectData.defectId || '';
      console.log(`Setting .defectId to (new):`, defectIdElement.textContent);
    }
  }

  // ===== PHASE 4: ROW INSERTION =====
  console.log("📌 Preparing to insert row...");
  
  // 4.1 Set initial state
  // expandableRow.classList.toggle("retrieved-defect", isRetrieved);
  expandableRow.classList.toggle("editable", isEditable);
  expandableRow.style.display = ""; // Make visible immediately for debugging

  // 4.2 Find insertion point
  let insertBeforeRow = null;
  let nextRow = mainRow.nextElementSibling;
  
  while (nextRow && !nextRow.classList.contains("main-row")) {
    if (nextRow.classList.contains("retrieved-defect") && nextRow.dataset.span === currentSpan) {
      insertBeforeRow = nextRow;
      break;
    }
    nextRow = nextRow.nextElementSibling;
  }

  // 4.3 Insert the row
  try {
    const insertionPoint = insertBeforeRow || mainRow.nextSibling;
    console.log("Inserting before:", insertionPoint);
    
    mainRow.parentNode.insertBefore(expandableRow, insertionPoint);
    console.log("✅ Row inserted successfully");
  } catch (e) {
    console.error("❌ Insertion failed:", e);
    console.groupEnd();
    return null;
  }

  // ===== PHASE 5: POST-INSERTION =====
  // 5.1 Verify DOM update
  setTimeout(() => {
    const insertedRow = mainRow.nextElementSibling;
    //console.log("INSERTED ROW:", insertedRow?.outerHTML);
  }, 100);

  // 5.2 Update main row
  if (typeof updateMainRow === 'function') {
    updateMainRow(mainRow);
  } else {
    console.warn("updateMainRow function not found");
  }

  console.groupEnd();
  return expandableRow;
}







document.getElementById('works').addEventListener('change', function() {
    const showFields = this.value === 'Y';
    
    // Get all three field groups
    const remedialWorksGroup = document.getElementById('remedialWorksGroup');
    const priorityGroup = document.getElementById('priorityGroup');
    const costGroup = document.getElementById('costGroup');
    
    // Show/hide all fields based on selection
    remedialWorksGroup.style.display = showFields ? 'flex' : 'none';
    priorityGroup.style.display = showFields ? 'flex' : 'none';
    costGroup.style.display = showFields ? 'flex' : 'none';
    
    // Optional: Clear fields when hiding them
    if (!showFields) {
        document.getElementById('remedialWorks').value = '';
        document.getElementById('priority').value = '';
        document.getElementById('cost').value = '';
    }
});