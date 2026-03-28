

document.addEventListener("DOMContentLoaded", function () {
    const structureId = sessionStorage.getItem('structureId');  
    const structureName = sessionStorage.getItem('structureName');

    if (structureId && structureName) {
        document.getElementById('bridgeHeader').textContent = `Inspection for ${structureName} (Bridge #${structureId})`;

        // ✅ Store structureId in a hidden form field
        const structureIdInput = document.createElement('input');
        structureIdInput.type = 'hidden';
        structureIdInput.name = 'structureId';
        structureIdInput.value = structureId;
        document.getElementById('inspectionForm').appendChild(structureIdInput);

    } else {
        document.getElementById('bridgeHeader').textContent = "No structure data found.";
    }
});



// Define the mapping of defectType to defectNumber options
const defectMapping = {
  1: [1, 2, 3, 4],
  2: [2, 3, 4, 5, 6],
  3: [1, 2, 3, 4, 5, 6, 7],
  4: [1],
  5: [1, 2],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2],
  8: [1, 2, 3, 4],
  9: [1, 2, 3, 4, 5, 6],
  10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  11: [1],
  12: [1, 2, 3, 4, 5, 6],
  13: [1],
  14: [1, 2],
  15: [1],
  16: [1, 2],
};

// Define the text to display for each defectNumber based on defectType
const defectNumberText = {
  1: {
    1: "Rusting",
    2: "Section loss",
    3: "Rusting or damage to bolts",
    4: "Damage to weld",
  },
  2: {
    2: "Spalling",
    3: "Cracking",
    4: "Prestressing damage",
    5: "Delamination",
    6: "Freeze thaw",
  },
  3: {
    1: "Deformation",
    2: "Pointing",
    3: "Arch ring damage",
    4: "Arch barrel crack",
    5: "Cracking",
    6: "Section loss",
    7: "Bulging or leaning",
  },
  4: {
    1: "Coating damage",
  },
  5: {
    1: "Structural damage",
    2: "Inspection obstruction",
  },
  6: {
    1: "Settlement",
    2: "Differential movement",
    3: "Sliding",
    4: "Rotation",
    5: "Scour",
    6: "Foundation falts",
  },
  7: {
    1: "Scour",
    2: "Vegetation or silt",
  },
  8: {
    1: "Blockage",
    2: "Causing stains",
    3: "Structural damage",
    4: "Weep hole blockage",
  },
  9: {
    1: "Wear and weathering",
    2: "Crazing, tracking & fretting",
    3: "Poor texture",
    4: "Cracking",
    5: "Slippery",
  },
  10: {
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "E",
    6: "F",
    7: "G",
    8: "H",
    9: "I",
    10: "J",
  },
  11: {
    1: "Deformation or settlement",
  },
  12: {
    1: "Rusting",
    2: "Offset or disloged",
    3: "Sliding",
    4: "Crazing",
    5: "Sliding plate damage",
    6: "Bearing damage",
  },
  13: {
    1: "Impact",
  },
  14: {
    1: "Non structural damage",
    2: "Structural damage",
  },
  15: {
    1: "Craking or displacement",
  },
  16: {
    1: "Damage",
    2: "Section loss",
  },

};

// Function to update defectNumber options based on selected defectType
function updateDefectNumbers() {
  const defectType = document.getElementById('defectType').value;
  const defectNumberSelect = document.getElementById('defectNumber');

  // Clear existing options
  defectNumberSelect.innerHTML = '';

  // Add new options based on the selected defectType
  defectMapping[defectType].forEach(number => {
      const option = document.createElement('option');
      option.value = number; // Keep the value as the number
      // Add text to the display based on defectType and defectNumber
      option.textContent = `${number} ${defectNumberText[defectType][number]}`;
      defectNumberSelect.appendChild(option);
  });
}

// Add event listener to defectType dropdown
document.getElementById('defectType').addEventListener('change', updateDefectNumbers);

// Initialize defectNumber options on page load
document.addEventListener('DOMContentLoaded', updateDefectNumbers);


// Function to update extent options based on selected severity
function updateExtentOptions() {
    const severity = document.getElementById('severity').value;
    const extentSelect = document.getElementById('extent');

    // Get all extent options
    const extentOptions = Array.from(extentSelect.options);

    // Enable or disable options based on severity
    extentOptions.forEach(option => {
        if (severity === '1') {
            // Only A is allowed for severity 1
            option.disabled = option.value !== 'A';
        } else {
            // A is not allowed for severity 2, 3, 4, 5
            option.disabled = option.value === 'A';
        }
    });

    // If the currently selected extent is disabled, reset to the first enabled option
    if (extentSelect.options[extentSelect.selectedIndex].disabled) {
        extentSelect.value = extentOptions.find(option => !option.disabled).value;
    }
}

// Add event listener to severity dropdown
document.getElementById('severity').addEventListener('change', updateExtentOptions);

// Initialize extent options on page load
document.addEventListener('DOMContentLoaded', updateExtentOptions);

// Track the current view state
let showOnlyNonEmptyRows = false;

//function to expand and collapse correctly the rows
function toggleButtonRow(row) {
  console.log("toggleButtonRow called for row:", row);

  // Collapse all other open rows (keep this existing functionality)
  const allRows = document.querySelectorAll("#inspectionElementsTable tbody tr.main-row");
  allRows.forEach((otherRow) => {
      if (otherRow !== row && otherRow.classList.contains("expanded")) {
          otherRow.classList.remove("expanded");
          const otherButtonRow = findButtonRow(otherRow);
          if (otherButtonRow) {
              otherButtonRow.style.display = "none";
          }
          const otherExpandableRows = findAllExpandableRows(otherRow);
          otherExpandableRows.forEach((expandableRow) => {
              expandableRow.style.display = "none";
          });
      }
  });

  // Toggle the clicked row
  if (row.classList.contains("expanded")) {
      console.log("Row is expanded. Collapsing...");
      row.classList.remove("expanded");
      const buttonRow = findButtonRow(row);
      if (buttonRow) {
          console.log("Hiding button row:", buttonRow);
          buttonRow.style.display = "none";
      }
      // Collapse all expandable rows
      const expandableRows = findAllExpandableRows(row);
      expandableRows.forEach((expandableRow) => {
          expandableRow.style.display = "none";
      });
  } else {
      console.log("Row is not expanded. Expanding...");
      row.classList.add("expanded");

      // Find or create the button row (keep existing logic)
      let buttonRow = findButtonRow(row);
      if (!buttonRow) {
          const template = document.getElementById("templateButtonRow");
          if (!template) {
              console.error("Template with ID 'templateButtonRow' not found!");
              return;
          }
          const clone = template.content.cloneNode(true);
          buttonRow = clone.querySelector("tr.button-row");
          if (!buttonRow) {
              console.error("Button row not found in template!");
              return;
          }
          buttonRow.style.display = "table-row";

          // Insert the button row after the last expandable row (or main row if none)
          const expandableRows = findAllExpandableRows(row);
          if (expandableRows.length > 0) {
              const lastExpandableRow = expandableRows[expandableRows.length - 1];
              lastExpandableRow.parentNode.insertBefore(buttonRow, lastExpandableRow.nextSibling);
          } else {
              row.parentNode.insertBefore(buttonRow, row.nextSibling);
          }
          console.log("Button row added:", buttonRow);
      } else {
          buttonRow.style.display = "table-row";
      }

      // Show expandable rows (modified to respect initial collapsed state)
      const expandableRows = findAllExpandableRows(row);
      expandableRows.forEach((expandableRow) => {
          expandableRow.style.display = "table-row"; // Show when expanded
      });
  }
}
  
// Helper function to find the button row
function findButtonRow(mainRow) {
    let sibling = mainRow.nextElementSibling;
    while (sibling) {
      // Stop if we encounter another main row
      if (sibling.classList.contains("main-row")) {
        break;
      }
      // Return the button row if found
      if (sibling.classList.contains("button-row")) {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
}


// retrieve inspection date
document.addEventListener("DOMContentLoaded", function () {
  const inspectionDate = sessionStorage.getItem("inspectionDate");

  if (inspectionDate) {
    console.log("Retrieved inspection date:", inspectionDate);
    document.getElementById("displayDate").textContent = inspectionDate;
  } else {
    console.log("No inspection date found in sessionStorage.");
  }
});
  
  
  
//Function for the date dropdown
document.addEventListener("DOMContentLoaded", async () => {
  const structureId = sessionStorage.getItem('structureId');
  const structureName = sessionStorage.getItem('structureName');

  let dropdown;

  if (structureId && structureName) {
    document.getElementById('bridgeHeader').textContent = `Inspection for ${structureName} (Bridge #${structureId})`;
    
    try {
      const response = await fetch(`http://localhost:3000/api/inspection-dates/${structureId}`);
      const dates = await response.json();
      
      dropdown = document.getElementById('inspectionDates');
      dropdown.innerHTML = '<option value="">-- Select inspection date --</option>';
      
      // Modified date handling - use raw dates without formatting
      dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;  // Preserve original format
        option.textContent = date;  // Display original format
        dropdown.appendChild(option);
      });
      
    } catch (error) {
      console.error('Failed to load dates:', error);
      if (dropdown) {
        dropdown.innerHTML = '<option value="" disabled>No previous inspections found</option>';
      } else {
        console.error('Dropdown element not found!');
      }
    }
  }
});  
  




/*
document.getElementById('inspectionDates').addEventListener('change', async (e) => {
  const date = e.target.value;
  const structureId = sessionStorage.getItem('structureId');
  const selectedSpan = sessionStorage.getItem('selectedSpan');
  const tableBody = document.querySelector('#inspectionElementsTable tbody');
  
  console.log('Loading defects with:', { date, structureId, selectedSpan });

  // [Keep your existing JSON display container setup...]

  try {
    document.getElementById('jsonDefectContent').textContent = 'Loading defects...';
    console.log('Fetching defects from API...');
    
    const response = await fetch(
      `http://localhost:3000/api/defects-by-date?structure_number=${structureId}&date=${date}`
    );
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const historicalDefects = await response.json();
    let defectsArray = Array.isArray(historicalDefects) ? historicalDefects : [];
    console.log('Raw defects data:', defectsArray);

    // ENHANCED SPAN FILTERING - FIXED HERE
    if (selectedSpan) {
      console.log(`Filtering for span ${selectedSpan}`);
      defectsArray = defectsArray.filter(defect => {
        // Check for span_number explicitly since we know the API returns it
        const hasSpan = defect.hasOwnProperty('span_number');
        console.log(`Defect ${defect.element_no} has span_number:`, hasSpan, 'Value:', defect.span_number);
        
        if (!hasSpan) {
          console.warn('Defect missing span_number:', defect);
          return false;
        }
        
        const matches = defect.span_number.toString() === selectedSpan.toString();
        console.log(`Span match: ${defect.span_number} === ${selectedSpan} -> ${matches}`);
        return matches;
      });
      console.log(`Filtered defects for span ${selectedSpan}:`, defectsArray);
      
      // Update title to show filtering
      const title = document.querySelector('#jsonDefectDisplay h3');
      if (title) title.textContent = `Defect Data (JSON) - Span ${selectedSpan}`;
    }

    // [Rest of your existing code...]

  } catch (error) {
    console.error('Error loading defects:', error);
    document.getElementById('jsonDefectContent').textContent = 
      `Error: ${error.message.includes('HTTP error') 
        ? "Failed to load from server" 
        : "Error processing data"}`;
  }
});
*/






  
//Function for the date dropdown to populate the table
document.getElementById('inspectionDates').addEventListener('change', async (e) => {
  const date = e.target.value;
  const structureId = sessionStorage.getItem('structureId');
  const selectedSpan = sessionStorage.getItem('selectedSpan');
  const tableBody = document.querySelector('#inspectionElementsTable tbody');
  
  console.log('Loading defects with:', { date, structureId, selectedSpan });


  if (!date || !structureId) {
    console.log('No date or structureId - loading basic elements');
    await loadInspectionElements();
    document.getElementById('jsonDefectContent').textContent = 'Select an inspection date to view defects';
    return;
  }

  try {
    document.getElementById('jsonDefectContent').textContent = 'Loading defects...';
    console.log('Fetching defects from API...');
    
    const response = await fetch(
      `http://localhost:3000/api/defects-by-date?structure_number=${structureId}&date=${date}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const historicalDefects = await response.json();
    console.log("Complete API response:", historicalDefects);  // Check if remedial_works exists here
    let defectsArray = Array.isArray(historicalDefects) ? historicalDefects : [];
    console.log('Raw defects data:', defectsArray);

    // FILTER DEFECTS BY SELECTED SPAN
    if (selectedSpan) {
      console.log(`Filtering for span ${selectedSpan}`);
      defectsArray = defectsArray.filter(defect => {
        // Check for span_number explicitly since we know the API returns it
        const hasSpan = defect.hasOwnProperty('span_number');
        console.log(`Defect ${defect.element_no} has span_number:`, hasSpan, 'Value:', defect.span_number);
        
        if (!hasSpan) {
          console.warn('Defect missing span_number:', defect);
          return false;
        }
        
        const matches = defect.span_number.toString() === selectedSpan.toString();
        console.log(`Span match: ${defect.span_number} === ${selectedSpan} -> ${matches}`);
        return matches;
      });
      console.log(`Filtered defects for span ${selectedSpan}:`, defectsArray);
      
      // Update title to show filtering
      const title = document.querySelector('#jsonDefectDisplay h3');
      if (title) title.textContent = `Defect Data (JSON) - Span ${selectedSpan}`;
    }

    // Display raw JSON
    document.getElementById('jsonDefectContent').textContent = 
      JSON.stringify(defectsArray, null, 2);

    // Clear existing historical defects from table
    document.querySelectorAll('.retrieved-defect').forEach(row => row.remove());

    // Group defects by element_no
    const defectsByElement = defectsArray.reduce((acc, defect) => {
      const elementNo = defect.element_no || defect.elementNumber;
      if (elementNo) {
        if (!acc[elementNo]) acc[elementNo] = [];
        acc[elementNo].push(defect);
      }
      return acc;
    }, {});
    console.log('Defects grouped by element:', defectsByElement);

    // Load base table if needed
    if (tableBody.querySelectorAll('tr.main-row').length === 0) {
      console.log('Loading base table elements');
      await loadInspectionElements();
    }

    // Merge historical data into table rows
    Object.entries(defectsByElement).forEach(([element_no, defects]) => {
      const mainRow = tableBody.querySelector(`tr[data-row-id="${element_no}"]`);
      if (!mainRow) {
        console.log(`No main row found for element ${element_no}`);
        return;
      }

      console.log(`Adding ${defects.length} defects for element ${element_no}`);
      defects.forEach((defect) => {
        const template = document.getElementById("templateRow");
        if (!template) {
          console.error('Template row not found');
          return;
        }
        
        const clone = template.content.cloneNode(true);
        const expandableRow = clone.querySelector("tr.expandable-row");
        if (!expandableRow) {
          console.error('Expandable row not found in template');
          return;
        }

        expandableRow.classList.add("retrieved-defect");
        
        // Populate defect data with logging
        const populateField = (selector, value, defaultValue = '') => {
          const el = expandableRow.querySelector(selector);
          if (el) {
            el.textContent = value || defaultValue;
          } else {
            console.warn(`Element not found: ${selector}`);
          }
        };
        
        populateField(".addDefect", defect.def);
        populateField(".addSeverity", defect.s);
        populateField(".addExtent", defect.ex);
        populateField(".addWorks", defect.w, 'No');
        populateField(".addPriority", defect.p);
        populateField(".addCost", defect.cost);
        populateField(".addComment", defect.comments_remarks);

        populateField(".addRemedialWorks", defect.remedial_works);
        
        if (defect.timestamp) {
          expandableRow.dataset.timestamp = defect.timestamp;
        }

        mainRow.parentNode.insertBefore(expandableRow, mainRow.nextSibling);
        expandableRow.style.display = "none";
      });

      if (typeof updateMainRow === 'function') {
        updateMainRow(mainRow);
      }

      mainRow.style.backgroundColor = '#f8f9fa';
      mainRow._isHistorical = true;
    });

    if (defectsArray.length > 0 && typeof updateBCIScores === 'function') {
      console.log('Updating BCI scores');
      const firstDefect = defectsArray[0];
      updateBCIScores(firstDefect.bci_av, firstDefect.bci_crit);
    }

    console.log('Defect loading completed successfully');

  } catch (error) {
    console.error('Error loading defects:', error);
    document.getElementById('jsonDefectContent').textContent = 
      `Error: ${error.message.includes('HTTP error') 
        ? "Failed to load from server" 
        : "Error processing data"}`;
  }
});

document.addEventListener("DOMContentLoaded", function () {
    // Get the modal and its elements
    const photoModal = document.getElementById("photoModal");
    const closeModalBtn = photoModal.querySelector(".close");
    const modalElement = document.getElementById("modalElement");
    const modalStructure = document.getElementById("modalStructure");
  
    // Retrieve structure data from sessionStorage
    const structureId = sessionStorage.getItem('structureId');  
    const structureName = sessionStorage.getItem('structureName');
  
    // Function to open the modal with structure data
    function openPhotoModal() {
        if (structureId && structureName) {
            // Update the modal content with structure data
            modalElement.textContent = structureName; // Set the structure name
  
            // Combine structure name and ID into a single string
            const structureInfo = `${structureName} (#${structureId})`;
            modalStructure.textContent = structureInfo; // Set the structure name and number
            photoModal.style.display = "block"; // Open the modal
        } else {
            console.error("No structure data found in sessionStorage.");
        }
    }
  
    // Function to close the modal
    function closePhotoModal() {
        photoModal.style.display = "none";
    }
  
    // Event listener for Photo buttons
    document.getElementById("inspectionElementsTable").addEventListener("click", function (event) {
        const target = event.target;
  
        // Check if the clicked element is a Photo button
        if (target.closest("button[title='View']")) {
            openPhotoModal(); // Open the modal with structure data
        }
    });
  
    // Close the modal when the close button is clicked
    closeModalBtn.addEventListener("click", closePhotoModal);
  
    // Close the modal when clicking outside the modal
    window.addEventListener("click", function (event) {
        if (event.target === photoModal) {
            closePhotoModal();
        }
    });
});
  


document.getElementById('photoInput').addEventListener('change', function() {
  const fileName = this.files[0] ? this.files[0].name : 'No file chosen';
  document.querySelector('.file-name').textContent = fileName;
});


// Function to open the modal
function openPhoModal() {
  const modal = document.getElementById('photoModal');
  modal.style.display = 'block';
  fetchPhotos(); // Fetch and display photos when the modal opens
}

// Function to close the modal
function closePhoModal() {
  const modal = document.getElementById('photoModal');
  modal.style.display = 'none';
}

// Function to fetch and display photos
async function fetchPhotos() {
  const response = await fetch('http://localhost:3000/photos');
  const photos = await response.json();

  const photosContainer = document.getElementById('photos-container');
  photosContainer.innerHTML = ''; // Clear previous content

  photos.forEach(photo => {
      const imgContainer = document.createElement('div');
      imgContainer.style.position = 'relative';
      imgContainer.style.display = 'inline-block';
      imgContainer.style.margin = '10px';

      const img = document.createElement('img');
      img.src = photo.filepath;
      img.style.width = '200px';

      const description = document.createElement('p');
      description.textContent = photo.description || 'No description';
      description.style.textAlign = 'center';

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '×';
      deleteButton.style.position = 'absolute';
      deleteButton.style.top = '0';
      deleteButton.style.right = '0';
      deleteButton.style.background = 'red';
      deleteButton.style.color = 'white';
      deleteButton.style.border = 'none';
      deleteButton.style.borderRadius = '50%';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.padding = '5px 10px';
      deleteButton.style.fontSize = '16px';

      deleteButton.addEventListener('click', async () => {
          try {
              const deleteResponse = await fetch(`http://localhost:3000/delete-photo/${photo.id}`, {
                  method: 'DELETE',
              });

              if (deleteResponse.ok) {
                  imgContainer.remove(); // Remove the image container from the DOM
                  alert('Photo deleted successfully!');
              } else {
                  alert('Failed to delete photo.');
              }
          } catch (error) {
              console.error('Error deleting photo:', error);
              alert('An error occurred while deleting the photo.');
          }
      });

      imgContainer.appendChild(img);
      imgContainer.appendChild(description);
      imgContainer.appendChild(deleteButton);
      photosContainer.appendChild(imgContainer);
  });
}

// Handle photo upload form submission
document.getElementById('photoUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const fileInput = document.getElementById('photoInput');
  const descriptionInput = document.getElementById('photoDescription');

  // Append the file and description to the FormData object
  formData.append('photo', fileInput.files[0]);
  formData.append('description', descriptionInput.value); // Ensure this line is present
  
  
  try {
      const response = await fetch('http://localhost:3000/upload', {
          method: 'POST',
          body: formData, // Send FormData
      });

      if (response.ok) {
          alert('Photo uploaded successfully!');
          fetchPhotos(); // Refresh the list of photos
          document.getElementById('photoUploadForm').reset(); // Clear the form
      } else {
          alert('Failed to upload photo.');
      }
  } catch (error) {
      console.error('Error uploading photo:', error);
      alert('An error occurred while uploading the photo.');
  }
});

// Close the modal when clicking the close button
document.querySelector('.close').addEventListener('click', closePhoModal);

// Close the modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById('photoModal');
  if (event.target === modal) {
      closePhoModal();
  }
};












// Function to toggle between showing only non-empty rows or all rows
function view() {
    showOnlyNonEmptyRows = !showOnlyNonEmptyRows; // Toggle the state
    updateTableVisibility();
}

// Function to update table visibility based on the toggle state
function updateTableVisibility() {
  const tableBody = document.querySelector("#inspectionElementsTable tbody");
  const rows = tableBody.querySelectorAll("tr");

  rows.forEach(row => {
      if (row.classList.contains("main-row")) {
          // Handle main rows
          const severity = parseInt(row.querySelector(".severity")?.textContent.trim() || 0);
          const extent = parseInt(row.querySelector(".extent")?.textContent.trim() || 0);

          // If showing only non-empty rows, hide rows where severity and extent are both 0
          if (showOnlyNonEmptyRows) {
              if (severity === 0 && extent === 0) {
                  row.style.display = "none"; // Hide the main row
              } else {
                  row.style.display = ""; // Show the main row
              }
          } else {
              row.style.display = ""; // Show all main rows
          }

          // Handle expandable rows for this main row
          if (row.classList.contains("expanded")) {
              const expandableRows = findAllExpandableRows(row);
              expandableRows.forEach(expandableRow => {
                  if (showOnlyNonEmptyRows) {
                      // Show expandable rows only if the main row is visible
                      expandableRow.style.display = row.style.display === "none" ? "none" : "table-row";
                  } else {
                      // Show all expandable rows
                      expandableRow.style.display = "table-row";
                  }
              });
          }
      }
  });

  // Update the button text to reflect the current state
  const button = document.querySelector(".load-btn");
  button.textContent = showOnlyNonEmptyRows ? "Show All" : "Show Non-Empty Rows";
}