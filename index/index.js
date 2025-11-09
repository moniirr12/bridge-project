let map;
let bridgeMarkers = L.layerGroup(); // Layer group to hold all markers
let darkMap, openStreetMap, satelliteMap; // Base map layers
let bridgeData = []; // Store bridge data for search
let fuse; // Fuse.js instance for fuzzy search

// Load the bridge data from the JSON file
fetch('bridges.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        bridgeData = data;

        // Initialize Fuse.js for fuzzy search
        const options = {
            keys: ['name', 'location'], // Search by name and location
            threshold: 0.3 // Adjust sensitivity
        };
        fuse = new Fuse(bridgeData, options);

        // Initialize the map
        map = L.map('map').setView([54.0, -2.0], 6); // Centered on the UK

        // Define base map layers
        darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });

        openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        satelliteMap = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        });

        // Add the default base map (light mode)
        openStreetMap.addTo(map);

        // Add markers to the layer group
        data.forEach(bridge => {
            const marker = L.marker([bridge.latitude, bridge.longitude], { 
                type: bridge.type,
                structureId: bridge.id,          // ✅ Add structure ID
                structureName: bridge.name       // ✅ Add structure Name
            });
            
            marker.bindPopup(`
                <b>${bridge.name}</b><br>
                Location: ${bridge.location}<br>
                Span: ${bridge.span} meters<br>
                Length: ${bridge.length} meters<br>
                Built: ${bridge.built_year}
            `);

            // Hover events
            marker.on('mouseover', function(e) {
                this.openPopup();
            });

            marker.on('mouseout', function(e) {
                this.closePopup();
            });

            // Add a click event listener to the marker
            marker.on('click', function() {
                // Store the clicked marker's data in sessionStorage
                sessionStorage.setItem('structureId', bridge.id);
                sessionStorage.setItem('structureName', bridge.name);
                // Open the modal dialog box
                const modal = document.getElementById('bridgeModal');
                modal.style.display = 'block'; // Show the modal

                // Update the modal title dynamically
                updateModalTitle();
                // Fetch and display the bridge photo
                 fetchBridgePhoto(bridge.id);
            });

            bridgeMarkers.addLayer(marker);
        });


        // Close the modal when the close button is clicked
        const closeButton = document.querySelector('.close');
        closeButton.addEventListener('click', function() {
            const modal = document.getElementById('bridgeModal');
            modal.style.display = 'none'; // Hide the modal
        });

        // Close the modal when clicking outside of it
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('bridgeModal');
            if (event.target === modal) {
                modal.style.display = 'none'; // Hide the modal
            }
        });


        // Add the layer group to the map
        bridgeMarkers.addTo(map);

        // Define base maps and overlay layers for the layer control
        const baseMaps = {
            "OpenStreetMap": openStreetMap,
            "Satellite": satelliteMap,
            "Dark Mode": darkMap
        };

        const overlayMaps = {
            "Bridges": bridgeMarkers
        };

        // Add layer control to the map
        L.control.layers(baseMaps, overlayMaps).addTo(map);
    })
    .catch(error => {
        console.error('Error loading bridge data:', error);
        alert('Failed to load bridge data. Check the console for details.');
});

// Function to update the modal title
function updateModalTitle() {
    const structureName = sessionStorage.getItem('structureName');
    const structureId = sessionStorage.getItem('structureId');
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = `${structureName} (${structureId})`; // Update the title
}

// Function to fetch and display the bridge photo
function fetchBridgePhoto(bridgeId) {
    // Fetch the photo URL from the backend server
    fetch(`http://localhost:3000/getBridgePhoto?bridgeId=${bridgeId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const bridgePhoto = document.getElementById('bridgePhoto');
            bridgePhoto.src = data.photo_url; // Set the photo URL
        })
        .catch(error => {
            console.error('Error fetching bridge photo:', error);
        });
}

// Toggle sidebar when "Menu" is clicked
document.querySelector('.navbar .menu a').addEventListener('click', function (e) {
    e.preventDefault(); // Prevent default link behavior
    const sidebar = document.getElementById('sidebar');
    const map = document.getElementById('map');

    sidebar.classList.toggle('active');
    map.classList.toggle('shifted');
});

// Toggle submenu when "View" is clicked
document.getElementById('viewLink').addEventListener('click', function (e) {
    e.preventDefault(); // Prevent default link behavior
    const submenu = document.getElementById('viewOptions');
    submenu.classList.toggle('active');
});

// Toggle submenu when "Type" is clicked
document.getElementById('typeLink').addEventListener('click', function (e) {
    e.preventDefault(); // Prevent default link behavior
    const submenu = document.getElementById('typeOptions');
    submenu.classList.toggle('active');
});

// Filter markers by structure type
document.querySelectorAll('#typeOptions input[name="structureType"]').forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        const selectedTypes = Array.from(document.querySelectorAll('#typeOptions input[name="structureType"]:checked'))
            .map(checkbox => checkbox.value.replace('_', ' ')); // Replace underscores with spaces

        // Hide or show markers based on selected types
        bridgeMarkers.eachLayer(marker => {
            const type = marker.options.type; // Assuming each marker has a `type` property
            if (selectedTypes.includes(type)) {
                marker.addTo(map);
            } else {
                marker.remove();
            }
        });
    });
});

// Night mode toggle
const nightModeToggle = document.getElementById('nightModeToggle');
nightModeToggle.addEventListener('click', function () {
    const body = document.body;
    body.classList.toggle('dark-mode');

    // Toggle between light and dark map
    if (body.classList.contains('dark-mode')) {
        darkMap.addTo(map);
        openStreetMap.remove();
        nightModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for light mode
    } else {
        openStreetMap.addTo(map);
        darkMap.remove();
        nightModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for night mode
    }
});

//dashboard page redirect
document.addEventListener('DOMContentLoaded', function () {
    const changePageButton = document.getElementById('dashboardLink');

    changePageButton.addEventListener('click', function () {
        // Redirect to the new page
        window.location.href = "../dashboard/dashboard.html";  // Change this URL to your desired next page
    });
});


// Search functionality
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim();
    if (query.length === 0) {
        searchResults.style.display = 'none';
        return;
    }

    // Perform fuzzy search
    const results = fuse.search(query).slice(0, 5); // Limit to 5 results

    // Display results
    searchResults.innerHTML = results.map(result => `
        <div data-lat="${result.item.latitude}" data-lng="${result.item.longitude}">
            ${result.item.name} - ${result.item.location}
        </div>
    `).join('');

    searchResults.style.display = results.length ? 'block' : 'none';
});

// Handle click on search results
searchResults.addEventListener('click', function (e) {
    if (e.target.tagName === 'DIV') {
        const lat = parseFloat(e.target.getAttribute('data-lat'));
        const lng = parseFloat(e.target.getAttribute('data-lng'));

        // Pan the map to the selected bridge
        map.setView([lat, lng], 15); // Zoom level 15

        // Close the search results dropdown
        searchResults.style.display = 'none';
        searchInput.value = ''; // Clear the search input
    }
});

// Close search results when clicking outside
document.addEventListener('click', function (e) {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.style.display = 'none';
    }
});



// Open the bridge options modal
function openBridgeModal() {
    bridgeModal.style.display = 'block';
}


document.getElementById("addInspection").addEventListener("click", function() {
    window.location.href = "../inspection1/inspection1.html"; // Redirects to a new page
});




// Chat Toggle
const chatToggle = document.querySelector('.chat-toggle');
const chatBox = document.querySelector('.chat-box');
const chatClose = document.querySelector('.chat-close');

chatToggle.addEventListener('click', () => {
    chatBox.classList.toggle('active');
});

chatClose.addEventListener('click', () => {
    chatBox.classList.remove('active');
});

// Send Message
const chatInput = document.querySelector('.chat-input input');
const chatSend = document.querySelector('.chat-send');

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user');
        messageDiv.textContent = message;
        document.querySelector('.chat-messages').appendChild(messageDiv);
        chatInput.value = '';
        // Here you would typically add your bot response logic
        autoScroll();
    }
}

function autoScroll() {
    const messages = document.querySelector('.chat-messages');
    messages.scrollTop = messages.scrollHeight;
}


// Function to fetch previous documents from the database
function fetchPreviousDocuments(structureId) {
    console.log('Fetching documents for structureId:', structureId);
    
    return fetch(`http://localhost:3000/api/previousInspections?structureId=${structureId}`, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('API response:', data);
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch documents');
        }
        return data.documents;
    })
    .catch(error => {
        console.error('Error fetching documents:', error);
        throw error; // Re-throw to let calling code handle it
    });
}



document.addEventListener('DOMContentLoaded', function () {
    const seeDocumentsButton = document.getElementById('seeDocuments');
    const documentsModal = document.getElementById('documentsModal');
    const documentsTableBody = document.getElementById('documentsTableBody');
    const closeButtons = document.querySelectorAll('.close'); // Select all close buttons

    // Bridge ID and Name elements
    const bridgeIdElement = document.getElementById('bridgeId');
    const bridgeNameElement = document.getElementById('bridgeName');


    console.log('Close buttons:', closeButtons); // Debugging

    // Add event listener for "See Documents" button
    seeDocumentsButton.addEventListener('click', function () {
        const structureId = sessionStorage.getItem('structureId'); // Retrieve structureId from sessionStorage
        const bridgeName = sessionStorage.getItem('structureName'); // Retrieve structureId from sessionStorage
        console.log('structureId:', structureId);

        if (!structureId) {
            alert('No structure selected. Please click on a bridge marker first.');
            return;
        }

        // Populate bridge ID and name in the modal
        bridgeIdElement.textContent = structureId;
        bridgeNameElement.textContent = bridgeName;

        // Fetch and display previous documents
        fetchPreviousDocuments(structureId)
            .then(documents => {
                console.log('Documents to display:', documents);

                // Filter documents to include only unique dates
                const uniqueDates = new Set(); // Track unique dates
                const uniqueDocuments = documents.filter(doc => {
                    if (!uniqueDates.has(doc.date)) {
                        uniqueDates.add(doc.date); // Add date to the Set
                        return true; // Include this document
                    }
                    return false; // Skip this document (duplicate date)
                });

                console.log('Unique documents:', uniqueDocuments); // Debugging

                // Clear previous content
                documentsTableBody.innerHTML = '';

                // Add rows to the table
                uniqueDocuments.forEach(doc => {
                    console.log('Adding row for document:', doc);
                    const row = document.createElement('tr');

                    // Add Date
                    const dateCell = document.createElement('td');
                    dateCell.textContent = doc.date; // Use the date field
                    row.appendChild(dateCell);

                    // Add Inspection Type (static value for now)
                    const inspectionTypeCell = document.createElement('td');
                    inspectionTypeCell.textContent = doc.inspection_type || 'N/A'; // Use dynamic value or 'N/A' if missing
                    row.appendChild(inspectionTypeCell);

                    // Add BCIcrit (dynamic value from the database)
                    const bciCritCell = document.createElement('td');
                    bciCritCell.textContent = doc.bci_crit || 'N/A'; // Use dynamic value or 'N/A' if missing
                    row.appendChild(bciCritCell);

                    // Add BCIav (dynamic value from the database)
                    const bciAvCell = document.createElement('td');
                    bciAvCell.textContent = doc.bci_av || 'N/A'; // Use dynamic value or 'N/A' if missing
                    row.appendChild(bciAvCell);

                    // Add Actions (buttons for Edit and BCI)
                    const actionsCell = createActionButtons(doc); // Call the function to create buttons
                    row.appendChild(actionsCell);

                    documentsTableBody.appendChild(row);
                });

                // Open the modal
                documentsModal.style.display = 'block';
            })
            .catch(error => {
                console.error('Error fetching documents:', error);
                alert('Failed to fetch documents. Please try again.');
            });
    });

    // Add event listeners to all close buttons
    closeButtons.forEach(closeButton => {
        closeButton.addEventListener('click', function () {
            console.log('Close button clicked'); // Debugging
            documentsModal.style.display = 'none';
        });
    });

    // Close the modal when clicking outside the modal content
    window.addEventListener('click', function (event) {
        console.log('Clicked target:', event.target); // Debugging
        if (event.target === documentsModal) {
            console.log('Clicked outside the modal'); // Debugging
            documentsModal.style.display = 'none';
        }
    });

    // Function to fetch previous documents from the backend
    async function fetchPreviousDocuments(structureId) {
        const response = await fetch(`http://localhost:3000/api/previousInspections?structureId=${structureId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }
        const data = await response.json();
        return data.documents; // Return the documents array
    }
});