// BCI Form Generator - extracted as a standalone function
async function generateBCIForm(doc) {
    try {
        // 1. Get structure info
        const structureId = sessionStorage.getItem('structureId');
        const structureName = sessionStorage.getItem('structureName');
        const inspectionDate = doc.date;
        
        if (!structureId || !structureName) {
            throw new Error('Missing structure information');
        }

        // 2. Fetch bridge data to get span count
        const bridgeResponse = await fetch(`http://localhost:3000/api/bridges/${structureId}`);
        if (!bridgeResponse.ok) throw new Error('Failed to fetch bridge data');
        const bridge = await bridgeResponse.json();
        const totalSpans = bridge.span_number || 1;

        // 3. Fetch ALL defects for this structure and date
        const defectsResponse = await fetch(
            `http://localhost:3000/api/defectsbci?structureId=${structureId}&date=${inspectionDate}`
        );
        if (!defectsResponse.ok) throw new Error('Failed to fetch defects');
        const allSpansWithDefects = await defectsResponse.json();

        // 4. Fetch defects for works required
        const worksResponse = await fetch(
            `http://localhost:3000/api/worksrequired?structureId=${structureId}&date=${inspectionDate}`
        );
        if (!worksResponse.ok) throw new Error('Failed to fetch works required');
        const worksRequired = await worksResponse.json();

        // 5. Create BCI window
        const bciWindow = window.open("", "BCI Report", "width=1200,height=800,scrollbars=yes");
        if (!bciWindow) {
            throw new Error('Popup window was blocked. Please allow popups for this site.');
        }

        // 6. Generate HTML header
        let htmlContent = `
            <html>
                <head>
                    <title>BCI Report - ${structureName}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                        }
                        .span-section {
                            margin-bottom: 50px;
                            page-break-after: always;
                        }
                        .span-header {
                            font-size: 24px;
                            margin: 20px 0;
                            color: #2c3e50;
                            border-bottom: 2px solid #3498db;
                            padding-bottom: 10px;
                        }
                        .fixed-table {
                            width: 900px;
                            border-collapse: collapse;
                            margin-bottom: 0px;
                            table-layout: fixed;
                            font-size: 0.9em;
                        }
                        .variable-table {
                            width: 900px;
                            border-collapse: collapse;
                            margin-bottom: 10px;
                            table-layout: auto;
                            font-size: 0.9em;
                        }
                        th, td {
                            border: 1px solid black;
                            padding: 4px;
                            text-align: left;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                        .vertical-text {
                            writing-mode: vertical-rl;
                            transform: rotate(180deg);
                            text-align: center;
                            font-weight: bold;
                        }
                        .variable-table th:nth-child(9),
                        .variable-table td:nth-child(9) {
                            width: 250px;
                        }
                        .bci-results {
                            justify-content: center;
                            align-items: center;
                            gap: 50px;
                            margin-top: 0px;
                            font-size: 1.0em;
                        }
                        .bci-table{
                            width: 900px;
                            border-collapse: collapse;
                            margin-bottom: 0px;
                            table-layout: fixed;
                            font-size: 0.9em;
                            padding: 5px;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <h1>BCI Report - ${structureName}</h1>
                    <h2>Inspection Date: ${inspectionDate}</h2>
        `;

        // 7. Add content for each span
        for (let spanNum = 1; spanNum <= totalSpans; spanNum++) {
            // Find data for this span
            const spanData = allSpansWithDefects.find(s => s.span_number == spanNum);
            const spanDefects = spanData?.defects || [];

            // Get elements
            const elementsResponse = await fetch('http://localhost:3000/api/elements');
            if (!elementsResponse.ok) throw new Error('Failed to fetch elements');
            const elements = await elementsResponse.json();
            const spanElements = elements.filter(el => 
                el.span_number == null || el.span_number == spanNum
            );

            if (spanElements.length > 0 || spanDefects.length > 0) {
                const combinedData = combineData(spanElements, spanDefects);
                
                const inspectorName = spanData?.inspector_name || 'Not Recorded';
                const bciCrit = spanData?.bci_crit || 'N/A';
                const bciAv = spanData?.bci_av || 'N/A';
                const comments = spanData?.comments || 'N/A';

                // Filter works for current span only
                const spanWorks = worksRequired.worksRequired?.filter(item => 
                    item.spanNumber == spanNum
                ) || [];

                const photo = spanData?.photographs_taken !== undefined 
                    ? (spanData.photographs_taken ? 'Yes' : 'No') 
                    : 'N/A';
                    
                const inspected = spanData?.elements_inspected !== undefined 
                    ? (spanData.elements_inspected ? 'Yes' : 'No') 
                    : 'N/A';

                htmlContent += `
                    <div class="span-section">
                        <div class="span-header">Span ${spanNum}</div>
                        <div class="fixed-values">
                            <table class="fixed-table">
                                <tr>
                                    <td colspan="3">Superficial</td>
                                    <td colspan="3">General</td>
                                    <td colspan="3">Principal</td>
                                    <td colspan="3">Special</td>
                                    <td colspan="12">Form</td>
                                </tr>
                                <tr>
                                    <td colspan="6">Inspector: ${inspectorName}</td>
                                    <td colspan="4">Date: ${inspectionDate}</td>
                                    <td colspan="6">Next inspection: </td>
                                    <td colspan="8">Road Ref:</td>
                                </tr>
                                <tr>
                                    <td colspan="10">Bridge name: ${structureName}</td>
                                    <td colspan="6">Bridge Ref: ${structureId}</td>
                                    <td rowspan="4" colspan="1" class="vertical-text">Bridge code</td>
                                    <td colspan="7"><div style="display: flex; justify-content: space-between;"><span>Primary deck form</span><span>${bridge.primary_form || 'N/A'}</span></div></td>
                                </tr>
                                <tr>
                                    <td colspan="5">Map Ref: ${bridge.latitude?.toFixed(3) || 'N/A'}, ${bridge.longitude?.toFixed(3) || 'N/A'}</td>
                                    <td colspan="5">OSE: ${bridge.OSE || 'N/A'}</td>
                                    <td colspan="7">OSN: ${bridge.OSN || 'N/A'}</td>
                                    <td colspan="7"><div style="display: flex; justify-content: space-between;"><span>Primary deck material</span><span>${bridge.primary_material || 'N/A'}</span></div></td>
                                </tr>
                                <tr>
                                    <td colspan="4">Span: ${spanNum} of ${totalSpans}</td>
                                    <td colspan="6">Span Width (m): ${bridge.span || 'N/A'}</td>
                                    <td colspan="6">Span Length (m): ${bridge.length || 'N/A'}</td>
                                    <td colspan="7"><div style="display: flex; justify-content: space-between;"><span>Secondary deck form</span><span>${bridge.secondary_form || 'N/A'}</span></div></td>
                                </tr>
                                <tr>
                                    <td colspan="10">All above ground elements inspected: ${inspected}</td>
                                    <td colspan="6">Photograph: ${photo}</td>
                                    <td colspan="7"><div style="display: flex; justify-content: space-between;"><span>Secondary deck material</span><span>${bridge.secondary_material || 'N/A'}</span></div></td>
                                </tr>
                            </table>
                        </div>
                        <div class="bci-results">
                            <table class="bci-table">
                                <tr>
                                    <td><strong>BCI crit</strong>: ${bciCrit} <strong>BCI ave</strong>: ${bciAv}</td>
                                </tr>
                            </table>
                        </div>
                        <table class="variable-table">
                            <thead>
                                <tr>
                                    <th>Set</th>
                                    <th>No</th>
                                    <th>Description</th>
                                    <th>S</th>
                                    <th>Ex</th>
                                    <th>Def</th>
                                    <th>W</th>
                                    <th>P</th>
                                    <th>Cost</th>
                                    <th>Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${generateBCITableRows(combinedData)}
                            </tbody>
                        </table>
                    </div>
                `;

                // Add EMPTY second page with identical table structure
                htmlContent += `
                <div class="span-section">
                    <div class="span-header">Span ${spanNum} - Notes</div>
                    
                    <!-- Empty version of the main table -->
                    <table style="width: 900px; height: 1248px; table-layout: fixed; border-collapse: collapse; border: 1px solid black; font-size: 0.9em;">
                        <colgroup>
                            <col style="width: 3.4%; border: 1px solid black;"> <!-- Column 1 -->
                            <col style="width: 15.5%; border: 1px solid black;"> <!-- Column 2 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 3 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 4 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 5 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 6 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 7 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 8 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 9 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 10 -->
                            <col style="width: 4.4%; border: 1px solid black;"> <!-- Column 11 -->
                            <col style="width: 2.0%; border: 1px solid black;"> <!-- Column 12 -->
                            <col style="width: 2.0%; border: 1px solid black;"> <!-- Column 13 -->
                            <col style="width: 2.0%; border: 1px solid black;"> <!-- Column 14 -->
                            <col style="width: 2.0%; border: 1px solid black;"> <!-- Column 15 -->
                            <col style="width: 10.4%; border: 1px solid black;"> <!-- Column 16 -->
                            <col style="width: 9.0%; border: 1px solid black;"> <!-- Column 17 -->
                            <col style="width: 13.7%; border: 1px solid black;"> <!-- Column 18 -->
                        </colgroup>

                        </tbody>
                        <thead>
                            <!-- MULTIPLE DEFECTS Header -->
                            <tr>
                                <td colspan="18" style="text-align: center; font-weight: bold; border: 1px solid black;">MULTIPLE DEFECTS</td>
                            </tr>
                            <!-- Defect Columns Header -->
                            <tr>
                                <td colspan="2" rowspan="2" style="text-align: center; font-weight: bold; border: 1px solid black;">Element No.</td>
                                <td colspan="3" style="text-align: center; font-weight: bold; border: 1px solid black;">Defect 1</td>
                                <td colspan="3" style="text-align: center; font-weight: bold; border: 1px solid black;">Defect 2</td>
                                <td colspan="3" style="text-align: center; font-weight: bold; border: 1px solid black;">Defect 3</td>
                                <td colspan="7" rowspan="2" style="text-align: center; font-weight: bold; border: 1px solid black;">Comments</td>
                            </tr>
                            <!-- Sub-Headers (S, Ex, Def) -->
                            <tr>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">S</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">Ex</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">Def</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">S</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">Ex</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">Def</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">S</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">Ex</td>
                                <td style="text-align: center; font-weight: bold; border: 1px solid black;">Def</td>
                            </tr>
                            <!-- Empty Rows for Data (Elements 4-8) -->
                            ${generateMultipleDefectsRows(allSpansWithDefects)}
                        </thead>

                        <tbody>
                            <!-- INSPECTOR'S COMMENTS -->
                            <tr>
                                <td colspan="18" style="text-align: center; font-weight: bold; border: 1px solid black;">INSPECTOR'S COMMENTS</td>
                            </tr>
                            <tr>
                                <td colspan="18" style="border: 1px solid black; height: 400px;">${comments}</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="border: 1px solid black;">Name:</td>
                                <td colspan="5" style="border: 1px solid black;">${inspectorName}</td>
                                <td colspan="2" style="border: 1px solid black;">Signed:</td>
                                <td colspan="6" style="border: 1px solid black;">${inspectorName}</td>
                                <td colspan="1" style="border: 1px solid black;">Date:</td>
                                <td colspan="2" style="border: 1px solid black;">${inspectionDate}</td>
                            </tr>

                            <!-- ENGINEER'S COMMENTS -->
                            <tr>
                                <td colspan="18" style="text-align: center; font-weight: bold; border: 1px solid black;">ENGINEER'S COMMENTS</td>
                            </tr>
                            <tr>
                                <td colspan="18" style="border: 1px solid black; height: 400px;"></td>
                            </tr>
                            <tr>
                                <td colspan="2" style="border: 1px solid black;">Name:</td>
                                <td colspan="5" style="border: 1px solid black;">[Insert name]</td>
                                <td colspan="2" style="border: 1px solid black;">Signed:</td>
                                <td colspan="6" style="border: 1px solid black;">[Insert sign]</td>
                                <td colspan="1" style="border: 1px solid black;">Date:</td>
                                <td colspan="2" style="border: 1px solid black;">${inspectionDate}</td>
                            </tr>

                            <!-- WORK REQUIRED TABLE FOR THIS SPAN -->
                            <tr>
                                <td colspan="18" style="text-align: center; font-weight: bold; border: 1px solid black;">
                                    WORK REQUIRED - SPAN ${spanNum}
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" style="text-align: center; border: 1px solid black;">Ref.</td>
                                <td colspan="9" style="text-align: center; border: 1px solid black;">Suggested Remedial Work</td>
                                <td colspan="3" style="text-align: center; border: 1px solid black;">Priority</td>
                                <td colspan="2" style="text-align: center; border: 1px solid black;">Estimated Cost</td>
                                <td colspan="2" style="text-align: center; border: 1px solid black;">Action</td>
                            </tr>
                            ${generateWorkRequiredRowsForSpan(spanWorks)}

                            <tr>
                                <td colspan="2" style="border: 1px solid black;">Name:</td>
                                <td colspan="5" style="border: 1px solid black;">${inspectorName}</td>
                                <td colspan="2" style="border: 1px solid black;">Signed:</td>
                                <td colspan="6" style="border: 1px solid black;">${inspectorName}</td>
                                <td colspan="1" style="border: 1px solid black;">Date:</td>
                                <td colspan="2" style="border: 1px solid black;">${inspectionDate}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            }
        }

        // 8. Close HTML and write to window
        htmlContent += `</body></html>`;
        
        bciWindow.document.open();
        bciWindow.document.write(htmlContent);
        bciWindow.document.close();
        bciWindow.focus();

    } catch (error) {
        console.error('BCI generation failed:', error);
        alert(`Error: ${error.message}`);
    }
}

// Simplified createActionButtons function using the extracted generateBCIForm
function createActionButtons(doc) {
    const actionsCell = document.createElement('td');
  
    // Edit Button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.classList.add('normal-btn');
    editButton.title = 'Edit Report';
    editButton.onclick = function () {
        sessionStorage.setItem('inspectionStructureNumber', doc.structure_id);
        sessionStorage.setItem('inspectionDate', doc.date);
        sessionStorage.setItem('inspectionMode', 'edit');
        window.open('../inspection1/inspection1.html', '_blank');
    };
    actionsCell.appendChild(editButton);

    // Report Button (PDF)
    const reportButton = document.createElement('button');
    reportButton.textContent = 'Report';
    reportButton.classList.add('report-button');
    reportButton.title = 'Generate PDF Report';
    reportButton.addEventListener('click', async function() {
        await generatePDFReport(doc);
        sessionStorage.setItem('inspectionDate', doc.date);
    });
    actionsCell.appendChild(reportButton);

    // Create BCI button
    const bciButton = document.createElement('button');
    bciButton.textContent = 'BCI';
    bciButton.classList.add('bci-button');
    bciButton.addEventListener('click', async function() {
        await generateBCIForm(doc);
    });
    actionsCell.appendChild(bciButton);
  
    return actionsCell;
}

// Helper functions (keep these as they are used by both generateBCIForm and generatePDFReport)
function combineData(elements, defects) {
    return elements.map(element => {
        const defect = defects.find(defect => 
            defect.element_no === element.element_number
        );
  
        return {
            ...element,
            inspection_date: defect ? defect.inspection_date : '-',
            s: defect ? defect.s : '-',
            ex: defect ? defect.ex : '-',
            def: defect ? defect.def : '-',
            defN: defect ? defect.defN : '-',
            w: defect ? defect.w : '-',
            p: defect ? defect.p : '-',
            cost: defect ? defect.cost : '',
            comments_remarks: defect ? defect.comments_remarks : '',
            bci_crit: defect ? defect.bci_crit : '-',
            bci_av: defect ? defect.bci_av : '-'
        };
    });
}

function generateBCITableRows(data) {
    let rows = "";
    const mergePattern = [7, 7, 7, 4, 9, 4];
    let currentPatternIndex = 0;
    let rowsRemainingInCurrentGroup = 0;
    let groupLabel = "";
    const groupLabels = [
        "Deck Elements",
        "Load-bearing Substructure",
        "Durability Elements",
        "Safety Elements",
        "Other Bridge Elements",
        "Ancillary Elements"
    ];

    data.forEach((item, index) => {
        if (rowsRemainingInCurrentGroup === 0) {
            rowsRemainingInCurrentGroup = mergePattern[currentPatternIndex];
            groupLabel = groupLabels[currentPatternIndex];
            currentPatternIndex++;
        }

        let defDisplay;
        if (item.def === undefined || item.def === null || item.def === '-') {
            if (item.defN === undefined || item.defN === null || item.defN === '-') {
                defDisplay = '-';
            } else {
                defDisplay = item.defN;
            }
        } else {
            defDisplay = item.defN 
                ? `${item.def}.${item.defN}`
                : item.def;
        }

        const isFirstRowOfGroup = rowsRemainingInCurrentGroup === mergePattern[currentPatternIndex - 1];
        
        rows += `
            <tr>
                ${isFirstRowOfGroup ? `
                <td rowspan="${mergePattern[currentPatternIndex - 1]}" class="set-cell">
                    <div class="vertical-text">${groupLabel}</div>
                </td>
                ` : ''}
                <td>${item.element_number}</td>
                <td>${item.description}</td>
                <td>${item.s}</td>
                <td>${item.ex}</td>
                <td>${defDisplay}</td>
                <td>${item.w}</td>
                <td>${item.p}</td>
                <td>${item.cost}</td>
                <td>${item.comments_remarks}</td>
            </tr>
        `;

        rowsRemainingInCurrentGroup--;
        
        if (currentPatternIndex === mergePattern.length && rowsRemainingInCurrentGroup === 0) {
            currentPatternIndex = 0;
        }
    });

    return rows;
}

function generateWorkRequiredRowsForSpan(spanWorks) {
    let rows = '';
    
    spanWorks.forEach((item, index) => {
        const formattedCost = item.cost === 'Not specified' ? '' : item.cost;
        const formattedAction = item.worksRequired === 'Y' ? '✓' : 
                              item.worksRequired === 'M' ? '?' : '';
        
        // Use elementNumber if available, otherwise use sequential number
        const rowNumber = item.elementNumber ? item.elementNumber : index + 1;

        rows += `
            <tr>
                <td colspan="2" style="text-align: center; border: 1px solid black;">${rowNumber}</td>
                <td colspan="9" style="border: 1px solid black;">${item.remedialWorks || ''}</td>
                <td colspan="3" style="text-align: center; border: 1px solid black;">${item.priority || ''}</td>
                <td colspan="2" style="text-align: center; border: 1px solid black;">${formattedCost}</td>
                <td colspan="2" style="text-align: center; border: 1px solid black;">${formattedAction}</td>
            </tr>
        `;
    });

    // Fill remaining rows (up to 7 per span)
    for (let i = spanWorks.length; i < 7; i++) {
        rows += `
            <tr>
                <td colspan="2" style="text-align: center; border: 1px solid black;">${i + 1}</td>
                <td colspan="9" style="border: 1px solid black;"></td>
                <td colspan="3" style="border: 1px solid black;"></td>
                <td colspan="2" style="border: 1px solid black;"></td>
                <td colspan="2" style="border: 1px solid black;"></td>
            </tr>
        `;
    }

    return rows;
}

function generateMultipleDefectsRows(allSpansWithDefects) {
    // Collect all defects with defect_no > 1 across all spans
    const multipleDefects = allSpansWithDefects.flatMap(span => 
        span.defects.filter(defect => defect.defect_no > 1)
    );

    // Group by element (span + element number)
    const defectsByElement = multipleDefects.reduce((acc, defect) => {
        const key = `${defect.span_number}-${defect.element_no}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(defect);
        return acc;
    }, {});

    let rows = '';
    
    // Generate rows for elements with multiple defects
    Object.entries(defectsByElement).forEach(([key, elementDefects]) => {
        const [spanNumber, elementNumber] = key.split('-');
        
        rows += `
            <tr>
                <td colspan="2" style="text-align: center; border: 1px solid black;">${elementNumber}</td>
        `;
        
        // Add up to 3 defects
        for (let i = 0; i < 3; i++) {
            const defect = elementDefects[i];
            rows += defect ? `
                <td style="text-align: center; border: 1px solid black;">${defect.s || ''}</td>
                <td style="text-align: center; border: 1px solid black;">${defect.ex || ''}</td>
                <td style="text-align: center; border: 1px solid black;">${defect.def}.${defect.defN}</td>
            ` : `
                <td style="border: 1px solid black;"></td>
                <td style="border: 1px solid black;"></td>
                <td style="border: 1px solid black;"></td>
            `;
        }
        
        // Add comments (from first defect)
        rows += `
                <td colspan="7" style="border: 1px solid black;">${elementDefects[0]?.comments_remarks || ''}</td>
            </tr>
        `;
    });

    // Fill remaining rows (4-8) if needed
    const rowsNeeded = Math.max(0, 5 - Object.keys(defectsByElement).length);
    for (let i = 0; i < rowsNeeded; i++) {
        const rowNum = i + 4;
        rows += `
            <tr>
                <td colspan="2" style="text-align: center; border: 1px solid black;">${rowNum}</td>
                ${'<td style="border: 1px solid black;"></td>'.repeat(9)}
                <td colspan="7" style="border: 1px solid black;"></td>
            </tr>
        `;
    }

    return rows;
}