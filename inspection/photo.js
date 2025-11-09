
// Add this at the end of your JavaScript code
document.getElementById('savePhotosBtn').addEventListener('click', async function(e) {
    e.preventDefault(); // Prevent default behavior
    await savePhotos(); // Call your upload function
});

// Open modal with defect ID context
// Store photos by defect_id { defect_id1: [photos], defect_id2: [photos] }
let photoData = JSON.parse(sessionStorage.getItem('photoData')) || {};

// Modified openPhotoModal to handle both viewing and adding photos
function openPhotoModal() {
  const target = event.target;
  const expandableRow = target.closest("tr.expandable-row");
  const defectIdElement = expandableRow.querySelector(".defectId");
  
  if (!defectIdElement) {
    console.error("No defect ID found in row");
    return;
  }

  const defectId = defectIdElement.textContent;
  console.log("Viewing photos for defect:", defectId);
  
  // Store current defect ID for photo uploads
  sessionStorage.setItem('currentDefectId', defectId);
  
  // Open the modal
  const modal = document.getElementById('uploadModal-photo');
  const container = document.getElementById('previewContainer-photo');
  modal.style.display = 'block';
  
  // Initialize UI based on whether we're viewing or adding photos
  if (target.classList.contains('view-photos')) {
    // View mode - show only existing photos
    container.innerHTML = '<div class="loading-spinner">Loading photos...</div>';
    loadAndDisplayDefectPhotos(defectId);
  } else {
    // Add mode - show upload interface
    initializeUploadInterface(defectId);
  }
}

// Initialize upload interface for adding new photos
function initializeUploadInterface(defectId) {
  const container = document.getElementById('previewContainer-photo');
  
  // Create basic upload UI
  container.innerHTML = `
    <label class="add-photo-photo" for="photoInput-photo">+</label>
    <input type="file" id="photoInput-photo" accept="image/*" onchange="previewImages()" multiple />
  `;
  
  // Initialize photoData for this defect if needed
  if (!photoData[defectId]) {
    photoData[defectId] = [];
  }
  
  // Show existing photos (both uploaded and local)
  if (photoData[defectId].length > 0) {
    photoData[defectId].forEach((photo, index) => {
      const div = document.createElement('div');
      div.classList.add('preview-item-photo');
      div.innerHTML = `
        <span class="remove-photo" onclick="removePhoto(this)">×</span>
        <img src="${photo.preview_url}" alt="Photo Preview">
        <textarea placeholder="Add description..." oninput="updatePhotoDescription(this, ${index})">${photo.photo_description || ''}</textarea>
      `;
      container.insertBefore(div, container.lastElementChild);
    });
  }
}

async function loadAndDisplayDefectPhotos() {
  try {
    const defectId = sessionStorage.getItem('currentDefectId');
    if (!defectId) throw new Error("No defect ID found");

    const container = document.getElementById('previewContainer-photo');
    container.innerHTML = '<div class="photo-grid"></div>';
    const grid = container.querySelector('.photo-grid');
    
    // 1. Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'photoInput-photo';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.onchange = previewImages;
    container.appendChild(fileInput);
    
    // 2. Add the "+ Add Photos" card that triggers file input
    const addCard = document.createElement('div');
    addCard.className = 'add-photo-card';
    addCard.innerHTML = `
      <div class="plus-sign">+</div>
      <div class="add-text">Add Photos</div>
    `;
    addCard.onclick = () => fileInput.click(); // Directly trigger file selection
    grid.appendChild(addCard);
    
    // 3. Add existing photos
    const allPhotos = await getAllPhotosForCurrentInspection();
    const defectPhotos = allPhotos.filter(photo => 
      photo.defect_id === defectId || photo.front_defectid === defectId
    );

    defectPhotos.forEach(photo => {
      const photoElement = document.createElement('div');
      photoElement.className = 'photo-card';
      photoElement.innerHTML = `
        <img src="${photo.preview_url}" loading="lazy">
        <div class="photo-description" title="${photo.photo_description || ''}">
          ${photo.photo_description || 'No description'}
        </div>
      `;
      grid.appendChild(photoElement);
    });

    if (!photoData[defectId]) photoData[defectId] = [];

  } catch (error) {
    console.error("Error loading photos:", error);
    container.innerHTML = `
      <div class="error-message">
        <p>${error.message}</p>
        <div class="photo-grid">
          <div class="add-photo-card" onclick="document.getElementById('photoInput-photo')?.click()">
            <div class="plus-sign">+</div>
            <div class="add-text">Add Photos</div>
          </div>
        </div>
      </div>
    `;
  }
}

// Specialized renderer for defect photos
function renderDefectPhotos(container, photos, defectId) {
  container.innerHTML = '';
  
  // Add header and action buttons
  container.innerHTML = `
    <div class="defect-photo-header">
      <h3>Photos for Defect ${defectId}</h3>
      <div class="photo-actions">
        <button onclick="initializeUploadInterface('${defectId}')" class="normal-btn">
          Add More Photos
        </button>
        <button onclick="loadAndDisplayDefectPhotos('${defectId}')" class="normal-btn">
          Refresh
        </button>
      </div>
    </div>
    <div class="photo-grid"></div>
  `;
  
  const grid = container.querySelector('.photo-grid');
  
  photos.forEach(photo => {
    const photoElement = document.createElement('div');
    photoElement.className = 'preview-item-photo';
    photoElement.innerHTML = `
      <img src="${photo.preview_url}" loading="lazy">
      <div class="photo-info">
        <div class="photo-description">${photo.photo_description || 'No description'}</div>
        <div class="photo-meta ${photo.source}-photo">
          ${photo.source === 'server' 
            ? `Uploaded: ${new Date(photo.uploaded_at).toLocaleString() || ''}`
            : '(Not yet uploaded)'}
        </div>
      </div>
    `;
    grid.appendChild(photoElement);
  });
}


// Close modal with confirmation
function closePhotoModal() {
  const shouldProceed = confirm("If you proceed to cancel, all progress will be lost. Continue?");
  
  if (shouldProceed) {
    document.getElementById('uploadModal-photo').style.display = 'none';
    document.getElementById('photoInput-photo').value = '';
    document.getElementById('previewContainer-photo').innerHTML =
      '<label class="add-photo-photo" for="photoInput-photo">+</label><input type="file" id="photoInput-photo" accept="image/*" onchange="previewImages()" multiple />';
    //photoData = {};  // Reset as object to match your declaration
  }
}

// Update previewImages to store by defect_id
async function previewImages() {
  const input = document.getElementById('photoInput-photo');
  const defectId = sessionStorage.getItem('currentDefectId');
  const container = document.getElementById('previewContainer-photo');
  
  if (!defectId) return;

  // Initialize array if needed
  if (!photoData[defectId]) {
    photoData[defectId] = [];
  }

  // Get existing photos from database
  const allPhotos = await getAllPhotosForCurrentInspection();
  const existingPhotos = allPhotos.filter(photo => 
    photo.defect_id === defectId || photo.front_defectid === defectId
  );

  // Clear and rebuild the container
  container.innerHTML = '<div class="photo-grid"></div>';
  const grid = container.querySelector('.photo-grid');

  // 1. Add the "+ Add Photos" card
  const addCard = document.createElement('div');
  addCard.className = 'add-photo-card';
  addCard.innerHTML = `
    <div class="plus-sign">+</div>
    <div class="add-text">Add Photos</div>
  `;
  addCard.onclick = () => input.click();
  grid.appendChild(addCard);

  // 2. Add existing photos from database
  existingPhotos.forEach(photo => {
    const photoElement = document.createElement('div');
    photoElement.className = 'photo-card';
    photoElement.innerHTML = `
      <img src="${photo.preview_url || photo.photo_url}" loading="lazy">
      <div class="photo-description" title="${photo.photo_description || ''}">
        ${photo.photo_description || 'No description'}
      </div>
    `;
    grid.appendChild(photoElement);
  });

  // 3. Process and add new files
  Array.from(input.files).forEach((file) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const photoObj = {
          defect_id: defectId,
          preview_url: e.target.result,
          photo_description: "",
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_object: file,
          source: 'local' // Mark as local upload
        };
        
        photoData[defectId].push(photoObj);
        
        // Create and add new photo element
        const photoElement = document.createElement('div');
        photoElement.className = 'photo-card';
        photoElement.innerHTML = `
          <span class="remove-photo" onclick="removePhoto(this)">×</span>
          <img src="${e.target.result}" alt="Preview">
          <textarea placeholder="Add description..." 
                    oninput="updatePhotoDescription(this, ${photoData[defectId].length - 1})"></textarea>
        `;
        grid.appendChild(photoElement);

        sessionStorage.setItem('photoData', JSON.stringify(photoData));
      };
      reader.readAsDataURL(file);
    }
  });

  input.value = '';
}


// Update description when user types
function updatePhotoDescription(textarea, index) {
  const defectId = sessionStorage.getItem('currentDefectId');
  if (defectId && photoData[defectId] && index >= 0 && index < photoData[defectId].length) {
    photoData[defectId][index].photo_description = textarea.value;
  }
  sessionStorage.setItem('photoData', JSON.stringify(photoData));
}

function prepareUploadData() {
  const defectId = sessionStorage.getItem('currentDefectId');
  if (!defectId || !photoData[defectId]) return [];
  
  return photoData[defectId].map(photo => ({
    defect_id: photo.defect_id,
    photo_url: photo.photo_url, // Now contains proper server URL
    photo_description: photo.photo_description,
    display_order: photo.display_order,
    file_name: photo.file_name,
    file_size: photo.file_size,
    file_type: photo.file_type,
    // Don't include temporary fields
  }));
}

// Remove photo from preview and array
function removePhoto(element) {
  const previewItem = element.closest('.preview-item-photo');
  const container = previewItem.parentNode;
  const index = Array.from(container.children).indexOf(previewItem) - 1; // -1 for the input
  const defectId = sessionStorage.getItem('currentDefectId');
  
  if (index >= 0 && defectId && photoData[defectId] && index < photoData[defectId].length) {
    previewItem.remove();
    photoData[defectId].splice(index, 1);
    
    // Update display orders after removal
    photoData[defectId].forEach((photo, i) => {
      photo.display_order = i;
    });
  }
  console.log("Current photoData contents:", photoData);
  sessionStorage.setItem('photoData', JSON.stringify(photoData));
}

// Prepare data for database submission
function prepareUploadData() {
  const defectId = sessionStorage.getItem('currentDefectId');
  if (!defectId || !photoData[defectId]) return [];
  return photoData[defectId].map(photo => ({
    defect_id: photo.defect_id,
    photo_url: photo.photo_url,
    photo_description: photo.photo_description,
    display_order: photo.display_order,
    file_name: photo.file_name,
    file_size: photo.file_size,
    file_type: photo.file_type
  }));
}

// Upload photos to server
async function savePhotos() {
  try {
    // 1. Validate inputs
    const defectId = sessionStorage.getItem('currentDefectId');
    const bridgeId = sessionStorage.getItem('structureId');
    const inspectionDate = sessionStorage.getItem('inspectionDate');
    
    console.log('[1/8] Validating inputs...', {
      defectId,
      bridgeId, 
      inspectionDate
    });

    if (!defectId || !bridgeId) {
      throw new Error('Missing defect or bridge information');
    }
    if (!inspectionDate) {
      throw new Error('No inspection date found');
    }

    // 2. Initialize defect entry if it doesn't exist
    if (!photoData[defectId]) {
      photoData[defectId] = [];
      console.log(`Created new photo array for defect ${defectId}`);
    }

    // 3. Check if there are photos to upload
    console.log('[2/8] Checking existing photos for defect:', defectId, photoData[defectId]);
    if (!photoData[defectId].length) {
      throw new Error('No photos to upload for this defect');
    }

    // 4. Prepare FormData
    const formData = new FormData();
    formData.append('defectId', defectId);
    formData.append('inspectionDate', inspectionDate);

    // 5. Add only new photos (without URLs) to FormData
    console.log('[3/8] Preparing upload payload...');
    const photosToUpload = photoData[defectId].filter(photo => !photo.photo_url);
    
    if (!photosToUpload.length) {
      throw new Error('All photos already have URLs - nothing to upload');
    }

    photosToUpload.forEach((photo, index) => {
      const file = photo.file_object || dataURLtoFile(photo.preview_url, photo.file_name, photo.file_type);
      formData.append('photos', file);
      formData.append(`descriptions[${index}]`, photo.photo_description || '');
      formData.append(`displayOrders[${index}]`, photo.display_order ?? index);
      
      console.log(`  Photo ${index}:`, {
        name: photo.file_name,
        size: photo.file_size,
        type: photo.file_type,
        description: photo.photo_description
      });
    });

    // 6. Show loading state
    console.log('[4/8] Starting upload...');
    document.getElementById('uploadModal-photo')?.classList.add('uploading');

    // 7. Upload to server
    const response = await fetch(`http://localhost:3000/api/bridges/${bridgeId}/inspection-photos`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const result = await response.json();
    console.log('[5/8] Server response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Server reported upload failure');
    }

    // 8. Update local photoData with server URLs
    console.log('[6/8] Merging server response with local data...');
    if (result.photos && result.photos.length === photosToUpload.length) {
      // Find the indices of the photos we just uploaded
      const uploadIndices = [];
      photoData[defectId].forEach((photo, index) => {
        if (!photo.photo_url) uploadIndices.push(index);
      });

      // Update only the photos that were uploaded
       result.photos.forEach((serverPhoto, i) => {
        const targetIndex = uploadIndices[i];
        if (photoData[defectId][targetIndex]) {
          console.log(`Updating photo at index ${targetIndex} with URL: ${serverPhoto.url}`);
          photoData[defectId][targetIndex] = {
            ...photoData[defectId][targetIndex],
            photo_url: serverPhoto.url, // Use the URL from server response
            preview_url: serverPhoto.url,
            file_object: undefined // Remove the file object
          };
        }
      });

      console.log('[7/8] Updated photoData:', JSON.parse(JSON.stringify(photoData)));
      sessionStorage.setItem('photoData', JSON.stringify(photoData));
    } else {
      console.warn('Server response does not match uploaded photos count');
    }

    // 9. Close modal and notify
    console.log('[8/8] Upload complete!');
    alert('Photos uploaded successfully!');
    document.getElementById('uploadModal-photo').style.display = 'none';

  } catch (error) {
    console.error('Upload failed:', {
      error: error.message,
      stack: error.stack
    });
    alert(`Upload failed: ${error.message}`);
  } finally {
    document.getElementById('uploadModal-photo')?.classList.remove('uploading');
  }
}

// Helper function to convert base64 to File
function dataURLtoFile(dataURL, filename, type) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: type || mime });
}


// Helper function to log photo data
function logPhotoData() {
  const defectId = sessionStorage.getItem('currentDefectId');
  if (!defectId || !photoData[defectId]) {
    console.log('No photos for current defect');
    return;
  }

  console.log('Current photoData contents for defect', defectId, ':');
  
  photoData[defectId].forEach((photo, index) => {
    console.group(`Photo ${index + 1}:`);
    console.log('Database-ready data:', {
      defect_id: photo.defect_id,
      photo_url: photo.photo_url,
      photo_description: photo.photo_description,
      display_order: photo.display_order,
      file_name: photo.file_name,
      file_size: photo.file_size + ' bytes',
      file_type: photo.file_type
    });
    console.groupEnd();
  });
  
  console.log('Total photos for this defect:', photoData[defectId].length);
}



















// 1. First define all functions at the top level
async function getAllPhotosForCurrentInspection() {
    // Get and validate parameters
    const bridgeId = sessionStorage.getItem('structureId');
    let inspectionDate = sessionStorage.getItem('inspectionDate');
    
    // Format date if needed
    if (inspectionDate && !/^\d{4}-\d{2}-\d{2}$/.test(inspectionDate)) {
        inspectionDate = new Date(inspectionDate).toISOString().split('T')[0];
    }

    console.log('Fetching photos for:', { bridgeId, inspectionDate });

    if (!bridgeId || !inspectionDate) {
        console.error('Missing required parameters');
        return [];
    }

    try {
        // Build URL with proper encoding
        const apiUrl = new URL(`http://localhost:3000/api/bridges/${bridgeId}/inspection-photos`);
        apiUrl.searchParams.append('inspectionDate', inspectionDate);

        const response = await fetch(apiUrl.toString());
        console.log('Response status:', response.status);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch photos');
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Server returned unsuccessful response');
        }

        // Get photoData from sessionStorage
        let photoData = JSON.parse(sessionStorage.getItem('photoData')) || {};
        
        // Convert server photos to the sessionStorage format and add them to photoData
        if (result.photos && Array.isArray(result.photos)) {
            result.photos.forEach(serverPhoto => {
                // Use the inspectionDate from parameters if serverPhoto doesn't have it
                const photoDate = serverPhoto.inspection_date || inspectionDate;
                
                // Create the defect key using the same format as your system
                // Use fallback values for any missing properties
                const defectKey = `${serverPhoto.bridge_id || bridgeId}_${photoDate.replace(/-/g, '_')}_${serverPhoto.span_number || 1}_${serverPhoto.element_number || 1}_${serverPhoto.defect_id || serverPhoto.front_defectid || 'unknown'}`;
                
                if (!photoData[defectKey]) {
                    photoData[defectKey] = [];
                }
                
                // Check if this photo already exists to avoid duplicates
                const photoExists = photoData[defectKey].some(photo => 
                    photo.photo_url === serverPhoto.photo_url
                );
                
                if (!photoExists) {
                    photoData[defectKey].push({
                        data: serverPhoto.photo_url, // Store the URL
                        description: serverPhoto.photo_description || '',
                        timestamp: serverPhoto.uploaded_at || new Date().toISOString(),
                        photo_url: serverPhoto.photo_url,
                        preview_url: serverPhoto.photo_url,
                        photo_description: serverPhoto.photo_description || '',
                        file_name: serverPhoto.file_name || `server_photo_${Date.now()}`,
                        file_size: serverPhoto.file_size || 0,
                        file_type: serverPhoto.file_type || 'image/jpeg',
                        source: 'server'
                    });
                }
            });
        }

        // Save the updated photoData (now containing both local and server photos) back to sessionStorage
        sessionStorage.setItem('photoData', JSON.stringify(photoData));
        console.log('Updated sessionStorage with server photos:', photoData);

        // Process photos - combine server and local photos for return
        const allPhotos = [
            // Server photos (from API)
            ...(result.photos || []).map(p => ({
                ...p,
                source: 'server',
                preview_url: p.photo_url,
                // Ensure defect_id is properly formatted
                defect_id: p.defect_id || p.front_defectid || 'unknown'
            })),
            
            // Local photos (from sessionStorage)
            ...Object.entries(photoData)
                .flatMap(([defectKey, photos]) => 
                    photos
                        .filter(p => p.preview_url && !p.photo_url) // Only local photos that haven't been uploaded
                        .map(p => {
                            // Extract defect_id from the defectKey format: structureId_date_span_element_defect
                            const keyParts = defectKey.split('_');
                            const defectId = keyParts.length >= 6 ? keyParts[5] : defectKey;
                            
                            return {
                                ...p,
                                defect_id: defectId,
                                source: 'local',
                                // Ensure we have the essential fields
                                photo_url: p.photo_url || null,
                                preview_url: p.preview_url,
                                photo_description: p.photo_description || p.description || '',
                                file_name: p.file_name || `local_photo_${Date.now()}`,
                                file_size: p.file_size || 0,
                                file_type: p.file_type || 'image/jpeg'
                            };
                        })
                )
        ];

        return allPhotos;

    } catch (error) {
        console.error('Error loading photos:', error);
        
        // Fallback: Return only local photos from sessionStorage
        const photoData = JSON.parse(sessionStorage.getItem('photoData')) || {};
        
        return Object.entries(photoData)
            .flatMap(([defectKey, photos]) => 
                photos
                    .filter(p => p.preview_url)
                    .map(p => {
                        const keyParts = defectKey.split('_');
                        const defectId = keyParts.length >= 6 ? keyParts[5] : defectKey;
                        
                        return {
                            ...p,
                            defect_id: defectId,
                            source: 'local',
                            photo_url: p.photo_url || null,
                            preview_url: p.preview_url,
                            photo_description: p.photo_description || p.description || '',
                            file_name: p.file_name || `local_photo_${Date.now()}`,
                            file_size: p.file_size || 0,
                            file_type: p.file_type || 'image/jpeg'
                        };
                    })
            );
    }
}

function renderPhotos(container, allPhotos) {
    container.innerHTML = '';
    
    if (!allPhotos?.length) {
        container.innerHTML = '<div class="no-photos">No photos found</div>';
        return;
    }

    // Group by defect
    const photosByDefect = allPhotos.reduce((acc, photo) => {
        (acc[photo.defect_id] = acc[photo.defect_id] || []).push(photo);
        return acc;
    }, {});

    // Render each group
    Object.entries(photosByDefect).forEach(([defectId, photos]) => {
        const section = document.createElement('div');
        section.className = 'defect-photo-section';
        
        photos.forEach(photo => {
            section.innerHTML += `
                <div class="preview-item-photo">
                    <img src="${photo.preview_url}" loading="lazy">
                    <div class="photo-info">
                        <div class="photo-description">${photo.photo_description || 'No description'}</div>
                        <div class="photo-meta ${photo.source}-photo">
                            ${photo.source === 'server' 
                                ? `Uploaded: ${new Date(photo.uploaded_at).toLocaleString() || ''}`
                                : '(Not yet uploaded)'}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.appendChild(section);
    });
}

async function openGalleryModal() {
    const modal = document.getElementById('uploadModal-photo');
    const container = document.getElementById('previewContainer-photo');
    
    if (!modal || !container) {
        console.error('Modal elements not found');
        return;
    }

    modal.style.display = 'block';
    container.innerHTML = '<div class="loading-spinner">Loading photos...</div>';

    try {
        const allPhotos = await getAllPhotosForCurrentInspection();
        renderPhotos(container, allPhotos);
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="error-message">Error loading photos</div>';
    }
}

// 2. Initialize after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Verify elements exist
    if (!document.querySelector('.hello') || 
        !document.getElementById('uploadModal-photo')) {
        console.error('Required elements missing from DOM');
        return;
    }
    
    document.querySelector('.hello').addEventListener('click', function(e) {
        e.preventDefault();
        openGalleryModal();
    });
});