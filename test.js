// Function to generate a PDF report for a bridge structure  
async function generatePDFReport(doc) {
    try {
        const structureId = sessionStorage.getItem('structureId');
        const structureName = sessionStorage.getItem('structureName');
        
        if (!structureId || !structureName) {
            throw new Error('Missing structure information');
        }

        // First fetch the photo URL
        let photoUrl = '';
        try {
            const response = await fetch(`http://localhost:3000/getBridgePhoto?bridgeId=${structureId}`);
            const data = await response.json();
            photoUrl = data.photo_url || '';
        } catch (error) {
            console.error('Error fetching bridge photo:', error);
        }

        // 1. Fetch complete bridge data including coordinates
        let bridgeData = {};
        try {
            const response = await fetch(`http://localhost:3000/api/bridges/${structureId}`);
            bridgeData = await response.json();
        } catch (error) {
            console.error('Error fetching bridge data:', error);
        }

        // 2. Fetch inspection data
        let inspectionData = {};
        try {
            const response = await fetch(`http://localhost:3000/api/inspections?structureId=${structureId}`);
            inspectionData = await response.json();
        } catch (error) {
            console.error('Error fetching inspection data:', error);
        }

        // 3. Fetch defects data
        let defectsData = [];
        try {
            const response = await fetch(`http://localhost:3000/api/defects?structureId=${structureId}`);
            defectsData = await response.json();
        } catch (error) {
            console.error('Error fetching defects data:', error);
        }

        const pdfWindow = window.open("", "PDF Report", "width=1200,height=800,scrollbars=yes");
        if (!pdfWindow) {
            throw new Error('Popup window was blocked. Please allow popups for this site.');
        }

        // Define the sections for the TOC (removed Condition Assessment, Recommendations, and Additional Notes)
        const sections = [
            { title: "Summary Information", page: 3 },
            { title: "Inspection Details", page: 4 },
            { title: "Defects Summary", page: 5 },
            { title: "Appendix A: BCI Proforma", page: 6 },
            { title: "Appendix B: Photographs", page: 7 }
        ];

        let htmlContent = `
            <html>
                <head>
                    <title>PDF Report - ${structureName}</title>
                    <style>
                        body { font-family: Arial; margin: 20px; }
                        .map-container {
                            width: 85%;
                            height: 400px;
                            margin: 20px 0;
                            border: 1px solid #ddd;
                            background-color: #f5f5f5;
                            align-items: center;
                        }
                        .page { 
                            height: 1122px;
                            page-break-after: always;
                            padding: 40px;
                            border: 1px dashed #ccc;
                            margin-bottom: 20px;
                        }
                        h1 { 
                            color: #333; 
                            font-size: 36px;
                            text-align: center;
                            margin-bottom: 10px;
                        }
                        h2 {
                            color: #444;
                            border-bottom: 1px solid #ddd;
                            padding-bottom: 5px;
                        }
                        h3 {
                            color: #555;
                            margin-top: 20px;
                        }
                        .structure-id {
                            font-size: 24px;
                            text-align: center;
                            margin-bottom: 30px;
                            color: #555;
                        }
                        .bridge-photo {
                            display: block;
                            max-width: 80%;
                            max-height: 400px;
                            margin: 0 auto;
                            border: 1px solid #ddd;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        }
                        .toc {
                            margin: 30px 0;
                        }
                        .toc-item {
                            margin: 10px 0;
                            font-size: 16px;
                        }
                        .toc-item a {
                            text-decoration: none;
                            color: #0066cc;
                        }
                        .toc-item .page-number {
                            float: right;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 20px 0; 
                            font-size: 14px;
                        }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 8px; 
                            text-align: left; 
                        }
                        th { 
                            background-color: #f2f2f2; 
                        }
                        .header-section {
                            margin-bottom: 40px;
                            text-align: center;
                        }
                        .severity-1 { background-color: #d4edda; }
                        .severity-2 { background-color: #fff3cd; }
                        .severity-3 { background-color: #f8d7da; }
                        .severity-4 { background-color: #dc3545; color: white; }
                        .severity-5 { background-color: #6c757d; color: white; }
                        .photo-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 15px;
                            margin-top: 20px;
                        }
                        .photo-item {
                            border: 1px solid #ddd;
                            padding: 10px;
                        }
                        .photo-item img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
                </head>
                <body>
                    <!-- Cover Page -->
                    <div class="page">
                        <div class="header-section">
                            <h1>${structureName}</h1>
                            <div class="structure-id">Structure ID: ${structureId}</div>
                            ${photoUrl ? `<img src="${photoUrl}" class="bridge-photo" alt="Bridge Photo" />` : 
                              '<p class="bridge-photo">No photo available</p>'}
                        </div>
                        <p><strong>Inspection Date:</strong> ${doc.date}</p>
                        <p><strong>Generated On:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>

                    <!-- Table of Contents Page -->
                    <div class="page">
                        <h1>Table of Contents</h1>
                        <div class="toc">
                            ${sections.map(section => `
                                <div class="toc-item">
                                    <a href="#section-${section.page}">${section.title}</a>
                                    <span class="page-number">Page ${section.page}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Summary Information Page -->
                    <div class="page" id="section-3">
                        <h2>Summary Information</h2>
                        <table>
                            <tr>
                                <th>Item</th>
                                <th>Value</th>
                            </tr>
                            <tr>
                                <td>Structure ID</td>
                                <td>${structureId}</td>
                            </tr>
                            <tr>
                                <td>Structure Name</td>
                                <td>${structureName}</td>
                            </tr>
                            <tr>
                                <td>Inspection Date</td>
                                <td>${doc.date}</td>
                            </tr>
                            ${bridgeData.location ? `
                            <tr>
                                <td>Location</td>
                                <td>${bridgeData.location}</td>
                            </tr>
                            ` : ''}
                            ${bridgeData.year_built ? `
                            <tr>
                                <td>Year Built</td>
                                <td>${bridgeData.year_built}</td>
                            </tr>
                            ` : ''}
                        </table>

                        ${bridgeData.latitude && bridgeData.longitude ? `
                        <h3>Bridge Location</h3>
                        <div class="map-container" id="bridgeMap"></div>
                        <div class="coordinates">
                            Coordinates: ${bridgeData.latitude.toFixed(6)}, ${bridgeData.longitude.toFixed(6)}
                        </div>
                        ` : '<p>No location data available</p>'}
                    </div>

                    <!-- Inspection Details Page -->
                    <div class="page" id="section-4">
                        <h2>Inspection Details</h2>
                        ${inspectionData.inspector_name ? `
                        <table>
                            <tr>
                                <th>Inspector Name</th>
                                <td>${inspectionData.inspector_name}</td>
                            </tr>
                            <tr>
                                <th>Inspection Type</th>
                                <td>${inspectionData.inspection_type || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Weather Conditions</th>
                                <td>${inspectionData.weather_conditions || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Overall Condition</th>
                                <td>${inspectionData.overall_condition || 'N/A'}</td>
                            </tr>
                        </table>
                        ` : '<p>No inspection details available</p>'}
                        
                        <h3>Inspection Notes</h3>
                        <p>${inspectionData.notes || 'No additional notes recorded for this inspection.'}</p>
                    </div>

                    <!-- Defects Summary Page (now page 5) -->
                    <div class="page" id="section-5">
                        <h2>Defects Summary</h2>
                        <table>
                            <tr>
                                <th>Defect ID</th>
                                <th>Element</th>
                                <th>Description</th>
                                <th>Severity</th>
                                <th>Recommended Action</th>
                            </tr>
                            ${defectsData.length > 0 ? defectsData.map(defect => `
                                <tr class="severity-${defect.severity}">
                                    <td>${defect.defect_type}.${defect.defect_number}</td>
                                    <td>Element ${defect.element_no}</td>
                                    <td>${defect.element_description || 'No description'}</td>
                                    <td>${defect.severity}</td>
                                    <td>${defect.remedial_works || 'None specified'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5">No defects recorded</td></tr>'}
                        </table>
                        
                        <h3>Defects by Severity</h3>
                        <table>
                            <tr>
                                <th>Severity Level</th>
                                <th>Count</th>
                                <th>Description</th>
                            </tr>
                            <tr>
                                <td>1 (Minor)</td>
                                <td>${defectsData.filter(d => d.severity === 1).length}</td>
                                <td>Cosmetic issues, no structural impact</td>
                            </tr>
                            <tr>
                                <td>2 (Moderate)</td>
                                <td>${defectsData.filter(d => d.severity === 2).length}</td>
                                <td>Minor structural issues, monitor condition</td>
                            </tr>
                            <tr>
                                <td>3 (Significant)</td>
                                <td>${defectsData.filter(d => d.severity === 3).length}</td>
                                <td>Structural deterioration, plan repairs</td>
                            </tr>
                            <tr>
                                <td>4 (Severe)</td>
                                <td>${defectsData.filter(d => d.severity === 4).length}</td>
                                <td>Serious structural issues, urgent repairs needed</td>
                            </tr>
                            <tr>
                                <td>5 (Critical)</td>
                                <td>${defectsData.filter(d => d.severity === 5).length}</td>
                                <td>Immediate safety concern, restrict use</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Appendix A: BCI Proforma Page (now page 6) -->
                    <div class="page" id="section-6">
                        <h2>Appendix A: BCI Proforma</h2>
                        <h3>Bridge Condition Index</h3>
                        <table>
                            <tr>
                                <th>Component</th>
                                <th>Score</th>
                                <th>Weighting</th>
                                <th>Weighted Score</th>
                            </tr>
                            ${inspectionData.bci_components ? inspectionData.bci_components.map(comp => `
                                <tr>
                                    <td>${comp.name}</td>
                                    <td>${comp.score}</td>
                                    <td>${comp.weighting}%</td>
                                    <td>${(comp.score * comp.weighting/100).toFixed(2)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4">No BCI component data available</td></tr>'}
                            <tr>
                                <th colspan="3">Total BCI Score</th>
                                <th>${inspectionData.bci_score || 'N/A'}</th>
                            </tr>
                        </table>
                        
                        <h3>BCI Interpretation</h3>
                        <table>
                            <tr>
                                <th>Score Range</th>
                                <th>Condition Rating</th>
                                <th>Recommended Action</th>
                            </tr>
                            <tr>
                                <td>85-100</td>
                                <td>Excellent</td>
                                <td>Routine maintenance</td>
                            </tr>
                            <tr>
                                <td>70-84</td>
                                <td>Good</td>
                                <td>Preventative maintenance</td>
                            </tr>
                            <tr>
                                <td>50-69</td>
                                <td>Fair</td>
                                <td>Planned repairs needed</td>
                            </tr>
                            <tr>
                                <td>25-49</td>
                                <td>Poor</td>
                                <td>Urgent repairs needed</td>
                            </tr>
                            <tr>
                                <td>0-24</td>
                                <td>Critical</td>
                                <td>Immediate action required</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Appendix B: Photographs Page (now page 7) -->
                    <div class="page" id="section-7">
                        <h2>Appendix B: Photographs</h2>
                        <div class="photo-grid">
                            ${inspectionData.photos && inspectionData.photos.length > 0 ? 
                              inspectionData.photos.map(photo => `
                                <div class="photo-item">
                                    <img src="${photo.url}" alt="${photo.description || 'Defect photo'}">
                                    <p>${photo.description || 'No description'}</p>
                                    <p><small>Defect: ${photo.defect_id || 'N/A'}</small></p>
                                </div>
                              `).join('') : 
                              '<p>No photographs available for this inspection</p>'}
                        </div>
                    </div>

                    <!-- Leaflet JS for interactive map -->
                    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
                    <script>
                        if (${bridgeData.latitude && bridgeData.longitude ? 'true' : 'false'}) {
                            const map = L.map('bridgeMap').setView(
                                [${bridgeData.latitude || 0}, ${bridgeData.longitude || 0}], 
                                15
                            );
                            
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            }).addTo(map);
                            
                            L.marker([${bridgeData.latitude || 0}, ${bridgeData.longitude || 0}])
                                .addTo(map)
                                .bindPopup('${structureName.replace(/'/g, "\\'")}')
                                .openPopup();
                        }
                    </script>
                </body>
            </html>
        `;

        pdfWindow.document.open();
        pdfWindow.document.write(htmlContent);
        pdfWindow.document.close();
        pdfWindow.focus();

    } catch (error) {
        console.error('PDF generation failed:', error);
        alert(`Error: ${error.message}`);
    }
}