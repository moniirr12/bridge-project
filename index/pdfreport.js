// Wait for the jsPDF library to be fully loaded before using it
document.addEventListener('DOMContentLoaded', function() {
    // Get the jsPDF constructor from the global scope
    const { jsPDF } = window.jspdf;
    
    // Function to generate a PDF report for a bridge structure using jsPDF
    async function generatePDFReport(doc) {
        try {
            const structureId = sessionStorage.getItem('structureId');
            const structureName = sessionStorage.getItem('structureName');
            const inspectionDate = doc.date;
            
            if (!structureId || !structureName || !doc.date) {
                throw new Error('Missing structure information or inspection date');
            }

            // Initialize jsPDF document with A4 format
            const pdfDoc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            // Set default font
            pdfDoc.setFont("helvetica");
            pdfDoc.setFontSize(10);

            // Fetch all data including photos and BCI form in parallel
            const [bridgePhoto, bridgeData, inspectionData, defectsData, photosResponse, bciFormData] = await Promise.all([
                fetch(`http://localhost:3000/getBridgePhoto?bridgeId=${structureId}`)
                    .then(res => res.json())
                    .catch(() => ({ photo_url: '' })),
                fetch(`http://localhost:3000/api/bridges/${structureId}`)
                    .then(res => res.json())
                    .catch(() => ({})),
                fetch(`http://localhost:3000/api/inspections?structureId=${structureId}`)
                    .then(res => res.json())
                    .catch(() => ({})),
                fetch(`http://localhost:3000/api/defects?structureId=${structureId}`)
                    .then(res => res.json())
                    .catch(() => []),
                fetch(`http://localhost:3000/api/bridges/${structureId}/inspection-photos?inspectionDate=${encodeURIComponent(inspectionDate)}`)
                    .then(res => res.ok ? res.json() : { success: false, photos: [] })
                    .catch(() => ({ success: false, photos: [] })),
                generateBCIFormForPDF(doc)
            ]);

            // Extract photos from response
            const allPhotos = photosResponse.success ? photosResponse.photos : [];
            
            // Group photos by defect_id and include defect information
            const defectInfo = {};
            defectsData.forEach(defect => {
                defectInfo[defect.id] = {
                    type: defect.defect_type,
                    number: defect.defect_number,
                    description: defect.element_description
                };
            });

            const photosByDefect = allPhotos.reduce((acc, photo) => {
                const defectId = photo.defect_id;
                if (defectId) {
                    if (!acc[defectId]) acc[defectId] = [];
                    acc[defectId].push({
                        ...photo,
                        defectInfo: defectInfo[defectId] || {}
                    });
                }
                return acc;
            }, {});

            // Add Cover Page
            addCoverPage(pdfDoc, structureName, structureId, inspectionDate, bridgePhoto);
            
            // Add Table of Contents
            addTableOfContents(pdfDoc);
            
            // Add Structure Details
            addStructureDetails(pdfDoc, structureName, structureId, bridgeData);
            
            // Add Inspection Details
            addInspectionDetails(pdfDoc, inspectionData);
            
            // Add Defects Summary
            addDefectsSummary(pdfDoc, defectsData);
            
            // Add BCI Form
            addBCIForm(pdfDoc, bciFormData);
            
            // Add Photographs
            addPhotographs(pdfDoc, photosByDefect);

            // Save the PDF
            pdfDoc.save(`${structureName.replace(/[^a-z0-9]/gi, '_')}_Inspection_Report.pdf`);

        } catch (error) {
            console.error('PDF generation failed:', error);
            alert(`Error: ${error.message}`);
        }
    }

    // Helper functions for each section

    function addCoverPage(pdfDoc, structureName, structureId, inspectionDate, bridgePhoto) {
        pdfDoc.setFontSize(20);
        pdfDoc.text(`Bridge Inspection Report`, 105, 30, { align: 'center' });
        
        pdfDoc.setFontSize(16);
        pdfDoc.text(structureName, 105, 45, { align: 'center' });
        
        pdfDoc.setFontSize(14);
        pdfDoc.text(`Structure ID: ${structureId}`, 105, 55, { align: 'center' });
        
        // Add bridge photo if available
        if (bridgePhoto.photo_url) {
            try {
                const img = new Image();
                img.src = bridgePhoto.photo_url;
                pdfDoc.addImage(img, 'JPEG', 30, 70, 150, 100);
            } catch (e) {
                pdfDoc.text('Bridge photo not available', 105, 100, { align: 'center' });
            }
        }
        
        pdfDoc.setFontSize(12);
        pdfDoc.text(`Inspection Date: ${inspectionDate}`, 105, 190, { align: 'center' });
        pdfDoc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 105, 200, { align: 'center' });
        
        pdfDoc.addPage();
    }

    function addTableOfContents(pdfDoc) {
        pdfDoc.setFontSize(16);
        pdfDoc.text('Table of Contents', 105, 30, { align: 'center' });
        
        pdfDoc.setFontSize(12);
        const sections = [
            { title: "Details of Structure", page: 3 },
            { title: "Inspection Details", page: 4 },
            { title: "Defects Summary", page: 5 },
            { title: "Appendix A: BCI Proforma", page: 6 },
            { title: "Appendix B: Photographs", page: 7 }
        ];
        
        let y = 50;
        sections.forEach(section => {
            pdfDoc.text(section.title, 30, y);
            pdfDoc.text(`Page ${section.page}`, 180, y);
            y += 10;
        });
        
        pdfDoc.addPage();
    }

    function addStructureDetails(pdfDoc, structureName, structureId, bridgeData) {
        pdfDoc.setFontSize(14);
        pdfDoc.text('2 Details of Structure', 20, 30);
        
        pdfDoc.setFontSize(12);
        pdfDoc.text('2.1 General Details', 20, 40);
        
        // Structure details table
        const structureDetails = [
            ['Structure Name:', structureName],
            ['Structure Number:', structureId],
            ['Date of Construction:', bridgeData.year_built || 'Unknown'],
            ['Crosses:', bridgeData.crosses || 'Not specified'],
            ['Carries:', bridgeData.carries || 'Not specified']
        ];
        
        let y = 50;
        structureDetails.forEach(row => {
            pdfDoc.text(row[0], 25, y);
            pdfDoc.text(row[1], 70, y);
            y += 8;
        });
        
        // Location details
        pdfDoc.text('2.2 Location', 20, y + 10);
        pdfDoc.text(`The structure provides vehicular access across ${bridgeData.crosses || 'a watercourse'} in ${bridgeData.location || 'the specified location'}.`, 25, y + 20, { maxWidth: 160 });
        
        // Coordinates
        pdfDoc.text('Grid Reference:', 20, y + 35);
        pdfDoc.text(bridgeData.grid_reference || 'Not available', 25, y + 45);
        
        const coordinates = [
            ['Easting:', bridgeData.easting || 'N/A', 'Northing:', bridgeData.northing || 'N/A'],
            ['Latitude:', bridgeData.latitude ? bridgeData.latitude.toFixed(6) : 'N/A', 'Longitude:', bridgeData.longitude ? bridgeData.longitude.toFixed(6) : 'N/A']
        ];
        
        y += 55;
        coordinates.forEach(row => {
            pdfDoc.text(row[0], 25, y);
            pdfDoc.text(row[1], 45, y);
            pdfDoc.text(row[2], 100, y);
            pdfDoc.text(row[3], 120, y);
            y += 8;
        });
        
        pdfDoc.addPage();
    }

    function addInspectionDetails(pdfDoc, inspectionData) {
        pdfDoc.setFontSize(14);
        pdfDoc.text('3 Inspection Details', 20, 30);
        
        if (inspectionData.inspector_name) {
            const inspectionDetails = [
                ['Inspector Name:', inspectionData.inspector_name],
                ['Inspection Type:', inspectionData.inspection_type || 'N/A'],
                ['Weather Conditions:', inspectionData.weather_conditions || 'N/A'],
                ['Overall Condition:', inspectionData.overall_condition || 'N/A']
            ];
            
            let y = 40;
            inspectionDetails.forEach(row => {
                pdfDoc.text(row[0], 25, y);
                pdfDoc.text(row[1], 70, y);
                y += 8;
            });
            
            pdfDoc.text('Inspection Notes:', 20, y + 10);
            pdfDoc.text(inspectionData.notes || 'No additional notes recorded for this inspection.', 25, y + 20, { maxWidth: 160 });
        } else {
            pdfDoc.text('No inspection details available', 25, 40);
        }
        
        pdfDoc.addPage();
    }

    function addDefectsSummary(pdfDoc, defectsData) {
        pdfDoc.setFontSize(14);
        pdfDoc.text('4 Defects Summary', 20, 30);
        
        // Defects table
        pdfDoc.setFontSize(10);
        const defectsHeaders = ['Defect ID', 'Element', 'Description', 'Severity', 'Recommended Action'];
        const defectsRows = defectsData.map(defect => [
            `${defect.defect_type}.${defect.defect_number}`,
            `Element ${defect.element_no}`,
            defect.element_description || 'No description',
            defect.severity.toString(),
            defect.remedial_works || 'None specified'
        ]);
        
        pdfDoc.autoTable({
            head: [defectsHeaders],
            body: defectsRows,
            startY: 40,
            styles: {
                cellPadding: 2,
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 20 },
                2: { cellWidth: 50 },
                3: { cellWidth: 15 },
                4: { cellWidth: 45 }
            },
            didDrawCell: (data) => {
                if (data.column.index === 3 && data.cell.raw) {
                    const severity = parseInt(data.cell.raw);
                    const colors = {
                        1: '#d4edda',
                        2: '#fff3cd',
                        3: '#f8d7da',
                        4: '#dc3545',
                        5: '#6c757d'
                    };
                    if (colors[severity]) {
                        pdfDoc.setFillColor(colors[severity]);
                        if (severity >= 4) pdfDoc.setTextColor(255, 255, 255);
                        pdfDoc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        if (severity >= 4) pdfDoc.setTextColor(0, 0, 0);
                    }
                }
            }
        });
        
        // Severity summary
        pdfDoc.setFontSize(12);
        pdfDoc.text('Defects by Severity:', 20, pdfDoc.autoTable.previous.finalY + 15);
        
        const severitySummary = [
            ['1 (Minor)', defectsData.filter(d => d.severity === 1).length, 'Cosmetic issues, no structural impact'],
            ['2 (Moderate)', defectsData.filter(d => d.severity === 2).length, 'Minor structural issues, monitor condition'],
            ['3 (Significant)', defectsData.filter(d => d.severity === 3).length, 'Structural deterioration, plan repairs'],
            ['4 (Severe)', defectsData.filter(d => d.severity === 4).length, 'Serious structural issues, urgent repairs needed'],
            ['5 (Critical)', defectsData.filter(d => d.severity === 5).length, 'Immediate safety concern, restrict use']
        ];
        
        pdfDoc.autoTable({
            head: [['Severity Level', 'Count', 'Description']],
            body: severitySummary,
            startY: pdfDoc.autoTable.previous.finalY + 25,
            styles: {
                cellPadding: 2,
                fontSize: 8
            }
        });
        
        pdfDoc.addPage();
    }

    async function addBCIForm(pdfDoc, bciFormData) {
        try {
            const { structureName, structureId, bridgeData, totalSpans, spansData, worksRequired } = bciFormData;
            
            // Set initial layout
            pdfDoc.setFontSize(14);
            pdfDoc.text('Appendix A: BCI Proforma', 105, 20, { align: 'center' });
            
            // Process each span
            for (let spanNum = 1; spanNum <= totalSpans; spanNum++) {
                const spanData = spansData.find(s => s.span_number == spanNum);
                const spanDefects = spanData?.defects || [];
                const spanWorks = worksRequired.worksRequired?.filter(w => w.spanNumber == spanNum) || [];
                
                // Check if we need a new page
                if (pdfDoc.internal.pageNumber > 1 || (spanNum > 1 && pdfDoc.internal.getCurrentPageInfo().pageNumber > 1)) {
                    pdfDoc.addPage();
                }
                
                // Span Header
                pdfDoc.setFontSize(12);
                pdfDoc.text(`Span ${spanNum} of ${totalSpans}`, 20, 30);
                
                // Main Bridge Information Table
                pdfDoc.autoTable({
                    startY: 40,
                    head: [['Bridge Information', 'Value']],
                    body: [
                        ['Bridge Name', structureName],
                        ['Bridge Ref', structureId],
                        ['Primary Deck Form', bridgeData.primary_form || 'N/A'],
                        ['Primary Deck Material', bridgeData.primary_material || 'N/A'],
                        ['Secondary Deck Form', bridgeData.secondary_form || 'N/A'],
                        ['Secondary Deck Material', bridgeData.secondary_material || 'N/A'],
                        ['Map Ref', `${bridgeData.latitude?.toFixed(6) || 'N/A'}, ${bridgeData.longitude?.toFixed(6) || 'N/A'}`],
                        ['Span Width', bridgeData.span ? `${bridgeData.span}m` : 'N/A'],
                        ['Span Length', bridgeData.length ? `${bridgeData.length}m` : 'N/A']
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                    margin: { top: 10 }
                });
                
                // BCI Results
                const bciCrit = spanData?.bci_crit || 'N/A';
                const bciAv = spanData?.bci_av || 'N/A';
                pdfDoc.setFontSize(11);
                pdfDoc.text(`BCI crit: ${bciCrit}  BCI ave: ${bciAv}`, 20, pdfDoc.lastAutoTable.finalY + 10);
                
                // Main Defects Table
                if (spanDefects.length > 0) {
                    pdfDoc.autoTable({
                        startY: pdfDoc.lastAutoTable.finalY + 20,
                        head: [['Set', 'No', 'Description', 'S', 'Ex', 'Def', 'W', 'P', 'Cost', 'Comments']],
                        body: spanDefects.map(defect => [
                            defect.set || '',
                            defect.element_no || '',
                            defect.element_description || '',
                            defect.s || '',
                            defect.ex || '',
                            defect.def ? (defect.defN ? `${defect.def}.${defect.defN}` : defect.def) : '',
                            defect.w || '',
                            defect.p || '',
                            defect.cost || '',
                            defect.comments_remarks || ''
                        ]),
                        styles: { 
                            fontSize: 7,
                            cellPadding: 1.5,
                            overflow: 'linebreak'
                        },
                        columnStyles: {
                            0: { cellWidth: 12 },
                            1: { cellWidth: 8 },
                            2: { cellWidth: 30 },
                            3: { cellWidth: 6 },
                            4: { cellWidth: 6 },
                            5: { cellWidth: 8 },
                            6: { cellWidth: 6 },
                            7: { cellWidth: 6 },
                            8: { cellWidth: 12 },
                            9: { cellWidth: 20 }
                        },
                        didParseCell: (data) => {
                            // Handle vertical text for Set column
                            if (data.column.index === 0 && data.cell.raw) {
                                data.cell.styles.fontStyle = 'bold';
                                data.cell.styles.halign = 'center';
                            }
                        }
                    });
                }
                
                // Add empty page for notes (matching your template)
                pdfDoc.addPage();
                
                // Multiple Defects Table
                const multipleDefects = spanDefects.filter(d => d.defect_no > 1);
                if (multipleDefects.length > 0) {
                    pdfDoc.setFontSize(12);
                    pdfDoc.text(`Span ${spanNum} - Multiple Defects`, 20, 20);
                    
                    pdfDoc.autoTable({
                        startY: 30,
                        head: [[
                            {content: 'Element No.', colSpan: 2, rowSpan: 2},
                            {content: 'Defect 1', colSpan: 3},
                            {content: 'Defect 2', colSpan: 3},
                            {content: 'Defect 3', colSpan: 3},
                            {content: 'Comments', colSpan: 7, rowSpan: 2}
                        ], [
                            'S', 'Ex', 'Def', 'S', 'Ex', 'Def', 'S', 'Ex', 'Def'
                        ]],
                        body: groupMultipleDefects(multipleDefects),
                        styles: { fontSize: 7 },
                        columnStyles: {
                            0: { cellWidth: 12 },
                            1: { cellWidth: 12 },
                            2: { cellWidth: 6 },
                            3: { cellWidth: 6 },
                            4: { cellWidth: 6 },
                            // ... other column styles
                        }
                    });
                }
                
                // Inspector Comments
                if (spanData?.comments) {
                    pdfDoc.setFontSize(11);
                    pdfDoc.text('Inspector Comments:', 20, pdfDoc.lastAutoTable.finalY + 10);
                    
                    const splitComments = pdfDoc.splitTextToSize(spanData.comments, 170);
                    pdfDoc.text(splitComments, 20, pdfDoc.lastAutoTable.finalY + 20);
                    
                    // Inspector signature
                    pdfDoc.text(`Name: ${spanData.inspector_name || ''}`, 20, pdfDoc.lastAutoTable.finalY + 40);
                    pdfDoc.text(`Signed:`, 100, pdfDoc.lastAutoTable.finalY + 40);
                    pdfDoc.text(`Date: ${spanData.inspection_date || ''}`, 170, pdfDoc.lastAutoTable.finalY + 40);
                }
                
                // Work Required Table
                if (spanWorks.length > 0) {
                    pdfDoc.setFontSize(12);
                    pdfDoc.text(`Work Required - Span ${spanNum}`, 20, pdfDoc.lastAutoTable.finalY + 60);
                    
                    pdfDoc.autoTable({
                        startY: pdfDoc.lastAutoTable.finalY + 70,
                        head: [['Ref.', 'Suggested Remedial Work', 'Priority', 'Estimated Cost', 'Action']],
                        body: spanWorks.map(work => [
                            work.elementNumber || work.reference || '',
                            work.remedialWorks || '',
                            work.priority || '',
                            work.cost === 'Not specified' ? '' : work.cost,
                            work.worksRequired === 'Y' ? '✓' : work.worksRequired === 'M' ? '?' : ''
                        ]),
                        styles: { fontSize: 8 }
                    });
                }
                
                // Add final page if needed
                if (spanNum < totalSpans) {
                    pdfDoc.addPage();
                }
            }
            
        } catch (error) {
            console.error('Error adding BCI form:', error);
            pdfDoc.setFontSize(10);
            pdfDoc.text('Error generating BCI form content', 20, 40);
        }
    }

    // Helper function to group multiple defects by element
    function groupMultipleDefects(defects) {
        const grouped = defects.reduce((acc, defect) => {
            const key = `${defect.span_number}-${defect.element_no}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(defect);
            return acc;
        }, {});
        
        return Object.entries(grouped).map(([key, defects]) => {
            const row = [defects[0].element_no, ''];
            
            // Add up to 3 defects
            for (let i = 0; i < 3; i++) {
                const defect = defects[i];
                if (defect) {
                    row.push(defect.s || '', defect.ex || '', defect.def + (defect.defN ? `.${defect.defN}` : ''));
                } else {
                    row.push('', '', '');
                }
            }
            
            // Add comments from first defect
            row.push(defects[0].comments_remarks || '');
            
            return row;
        });
    }

    async function addPhotographs(pdfDoc, photosByDefect) {
        pdfDoc.setFontSize(14);
        pdfDoc.text('Appendix B: Photographs', 105, 20, { align: 'center' });
        
        if (Object.keys(photosByDefect).length === 0) {
            pdfDoc.setFontSize(12);
            pdfDoc.text('No photographs available for this inspection', 105, 40, { align: 'center' });
            return;
        }
        
        let y = 40;
        let photoCounter = 1;
        
        for (const [defectId, photos] of Object.entries(photosByDefect)) {
            const defect = photos[0].defectInfo;
            
            pdfDoc.setFontSize(12);
            if (defect.description) {
                pdfDoc.text(defect.description, 20, y);
                y += 8;
            }
            
            // Add photos (2 per row)
            for (let i = 0; i < photos.length; i += 2) {
                if (y > 250) { // Check if we need a new page
                    pdfDoc.addPage();
                    y = 20;
                }
                
                // First photo in row
                const photo1 = photos[i];
                try {
                    const img1 = new Image();
                    img1.src = photo1.photo_url;
                    pdfDoc.addImage(img1, 'JPEG', 20, y, 80, 60);
                    
                    pdfDoc.setFontSize(8);
                    pdfDoc.text(`Photo ${photoCounter++}: ${photo1.photo_description || 'No description'}`, 20, y + 65);
                    if (photo1.uploaded_at) {
                        pdfDoc.text(`Uploaded: ${new Date(photo1.uploaded_at).toLocaleDateString()}`, 20, y + 70);
                    }
                } catch (e) {
                    pdfDoc.text('Photo not available', 20, y + 30);
                }
                
                // Second photo in row if exists
                if (i + 1 < photos.length) {
                    const photo2 = photos[i + 1];
                    try {
                        const img2 = new Image();
                        img2.src = photo2.photo_url;
                        pdfDoc.addImage(img2, 'JPEG', 110, y, 80, 60);
                        
                        pdfDoc.setFontSize(8);
                        pdfDoc.text(`Photo ${photoCounter++}: ${photo2.photo_description || 'No description'}`, 110, y + 65);
                        if (photo2.uploaded_at) {
                            pdfDoc.text(`Uploaded: ${new Date(photo2.uploaded_at).toLocaleDateString()}`, 110, y + 70);
                        }
                    } catch (e) {
                        pdfDoc.text('Photo not available', 110, y + 30);
                    }
                }
                
                y += 80;
            }
            
            y += 15; // Extra space between defect groups
        }
    }

    // Modified version of generateBCIFormForPDF that returns data instead of HTML
    async function generateBCIFormForPDF(doc) {
        try {
            const structureId = sessionStorage.getItem('structureId');
            const structureName = sessionStorage.getItem('structureName');
            const inspectionDate = doc.date;
            
            if (!structureId || !structureName) {
                throw new Error('Missing structure information');
            }

            // Fetch bridge data to get span count
            const bridgeResponse = await fetch(`http://localhost:3000/api/bridges/${structureId}`);
            if (!bridgeResponse.ok) throw new Error('Failed to fetch bridge data');
            const bridge = await bridgeResponse.json();
            const totalSpans = bridge.span_number || 1;

            // Fetch ALL defects for this structure and date
            const defectsResponse = await fetch(
                `http://localhost:3000/api/defectsbci?structureId=${structureId}&date=${inspectionDate}`
            );
            if (!defectsResponse.ok) throw new Error('Failed to fetch defects');
            const allSpansWithDefects = await defectsResponse.json();

            // Fetch defects for works required
            const worksResponse = await fetch(
                `http://localhost:3000/api/worksrequired?structureId=${structureId}&date=${inspectionDate}`
            );
            if (!worksResponse.ok) throw new Error('Failed to fetch works required');
            const worksRequired = await worksResponse.json();

            // Return structured data instead of HTML
            return {
                structureName,
                structureId,
                bridgeData: bridge,
                totalSpans,
                spansData: allSpansWithDefects,
                worksRequired
            };

        } catch (error) {
            console.error('BCI form generation failed:', error);
            return { error: error.message };
        }
    }
    
    // Make the function available globally if needed
    window.generatePDFReport = generatePDFReport;
});

