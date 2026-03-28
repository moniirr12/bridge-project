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

            const pdfDoc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            pdfDoc.setFont("helvetica");
            pdfDoc.setFontSize(10);

            // Fetch all data
            const [bridgePhoto, bridgeData, fullInspectionData, photosResponse, bciFormData] = await Promise.all([
                fetch(`http://localhost:3000/getBridgePhoto?bridgeId=${structureId}`)
                    .then(res => res.json())
                    .catch(() => ({ photo_url: '' })),
                fetch(`http://localhost:3000/api/bridges/${structureId}`)
                    .then(res => res.json())
                    .catch(() => ({})),
                fetch(`http://localhost:3000/api/inspection/full?structure_id=${structureId}&date=${inspectionDate}`)
                    .then(res => {
                        if (!res.ok) {
                            console.log('Full inspection API returned:', res.status);
                            return null;
                        }
                        return res.json();
                    })
                    .catch((err) => {
                        console.error('Failed to fetch inspection:', err);
                        return null;
                    }),
                fetch(`http://localhost:3000/api/bridges/${structureId}/inspection-photos?inspectionDate=${encodeURIComponent(inspectionDate)}`)
                    .then(res => res.ok ? res.json() : { success: false, photos: [] })
                    .catch(() => ({ success: false, photos: [] })),
                generateBCIFormForPDF(doc)
            ]);

            // Extract the data we need
            const inspectionData = fullInspectionData || {};
            const defectsData = fullInspectionData?.defects || [];

            const allPhotos = photosResponse.success ? photosResponse.photos : [];
            
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

            // Object to track page numbers
            const pageNumbers = {};

            // Add Cover Page (page 1)
            addCoverPage(pdfDoc, structureName, structureId, inspectionDate, bridgePhoto);
            
            // Add Table of Contents placeholder (page 2) - we'll update this later
            const tocPageIndex = pdfDoc.internal.getCurrentPageInfo().pageNumber;
            pdfDoc.addPage();
            
            // Add Structure Details
            pageNumbers.structure = pdfDoc.internal.getCurrentPageInfo().pageNumber;
            await addStructureDetailsWithMap(pdfDoc, structureName, structureId, bridgeData);
            
            // Add Inspection Details
            pageNumbers.inspection = pdfDoc.internal.getCurrentPageInfo().pageNumber;
            addInspectionDetails(pdfDoc, inspectionData);
            
            // Add Defects Summary
            pageNumbers.defects = pdfDoc.internal.getCurrentPageInfo().pageNumber;
            addDefectsSummary(pdfDoc, defectsData);
            
            // Add BCI Form
            pageNumbers.bci = pdfDoc.internal.getCurrentPageInfo().pageNumber;
            await addBCIForm(pdfDoc, bciFormData);
            
            // Add Photographs
            pageNumbers.photos = pdfDoc.internal.getCurrentPageInfo().pageNumber;
            await addPhotographs(pdfDoc, photosByDefect);

            // NOW go back and add the Table of Contents with correct page numbers
            pdfDoc.setPage(tocPageIndex);
            addTableOfContentsWithLinks(pdfDoc, pageNumbers);

            // Save the PDF
            pdfDoc.save(`${structureName.replace(/[^a-z0-9]/gi, '_')}_Inspection_Report.pdf`);

        } catch (error) {
            console.error('PDF generation failed:', error);
            alert(`Error: ${error.message}`);
        }
    }

    // New function with dynamic page numbers
    function addTableOfContentsWithLinks(pdfDoc, pageNumbers) {
        pdfDoc.setFontSize(16);
        pdfDoc.text('Table of Contents', 105, 30, { align: 'center' });
        
        pdfDoc.setFontSize(12);
        
        const sections = [
            { title: "Details of Structure", page: pageNumbers.structure },
            { title: "Inspection Details", page: pageNumbers.inspection },
            { title: "Defects Summary", page: pageNumbers.defects },
            { title: "Appendix A: BCI Proforma", page: pageNumbers.bci },
            { title: "Appendix B: Photographs", page: pageNumbers.photos }
        ];
        
        let y = 50;
        sections.forEach(section => {
            // Clickable link to section
            pdfDoc.setTextColor(0, 102, 204);
            pdfDoc.textWithLink(section.title, 30, y, { 
                pageNumber: section.page 
            });
            
            // Page number
            pdfDoc.setTextColor(0, 0, 0);
            pdfDoc.text(`Page ${section.page}`, 180, y);
            
            y += 10;
        });
        
        pdfDoc.setTextColor(0, 0, 0);
    }


    async function addStructureDetailsWithMap(pdfDoc, structureName, structureId, bridgeData) {
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
        pdfDoc.text(`The structure provides vehicular access across ${bridgeData.crosses || 'a watercourse'} in ${bridgeData.location || 'the specified location'}.`, 
                    25, y + 20, { maxWidth: 160 });
        
        // Grid Reference
        pdfDoc.text('Grid Reference:', 20, y + 35);
        pdfDoc.text(bridgeData.grid_reference || 'Not available', 25, y + 45);
        
        // Coordinates
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
        
        // Check if we need a new page
        if (y > 150) {
            pdfDoc.addPage();
            y = 20;
        }
        
        // Add Location Diagram
        if (bridgeData.latitude && bridgeData.longitude) {
            y += 15;
            pdfDoc.setFontSize(12);
            pdfDoc.text('2.3 Location Diagram', 20, y);
            y += 10;
            
            const lat = bridgeData.latitude;
            const lng = bridgeData.longitude;
            
            const diagramX = 25;
            const diagramY = y;
            const diagramWidth = 160;
            const diagramHeight = 90;
            
            // Background
            pdfDoc.setFillColor(255, 255, 255);
            pdfDoc.rect(diagramX, diagramY, diagramWidth, diagramHeight, 'F');
            
            // Grid lines
            pdfDoc.setDrawColor(220, 220, 220);
            pdfDoc.setLineWidth(0.2);
            for (let i = 0; i <= 8; i++) {
                const gridX = diagramX + (i * diagramWidth / 8);
                const gridY = diagramY + (i * diagramHeight / 8);
                if (i <= 8) {
                    pdfDoc.line(gridX, diagramY, gridX, diagramY + diagramHeight);
                    pdfDoc.line(diagramX, gridY, diagramX + diagramWidth, gridY);
                }
            }
            
            // Border
            pdfDoc.setDrawColor(100, 100, 100);
            pdfDoc.setLineWidth(0.5);
            pdfDoc.rect(diagramX, diagramY, diagramWidth, diagramHeight);
            
            // Location marker
            const markerX = diagramX + diagramWidth / 2;
            const markerY = diagramY + diagramHeight / 2;
            
            pdfDoc.setFillColor(0, 0, 0, 0.2);
            pdfDoc.ellipse(markerX, markerY + 8, 4, 1.5, 'F');
            
            pdfDoc.setFillColor(220, 53, 69);
            pdfDoc.circle(markerX, markerY - 5, 5, 'F');
            pdfDoc.triangle(markerX - 3, markerY, markerX + 3, markerY, markerX, markerY + 7, 'F');
            
            // Compass
            const compassX = diagramX + diagramWidth - 20;
            const compassY = diagramY + 20;
            const compassRadius = 10;
            
            pdfDoc.setFillColor(255, 255, 255);
            pdfDoc.setDrawColor(100, 100, 100);
            pdfDoc.circle(compassX, compassY, compassRadius, 'FD');
            
            pdfDoc.setFillColor(220, 53, 69);
            pdfDoc.triangle(compassX, compassY - compassRadius + 2, compassX - 3, compassY, compassX + 3, compassY, 'F');
            
            pdfDoc.setFillColor(150, 150, 150);
            pdfDoc.triangle(compassX, compassY + compassRadius - 2, compassX - 3, compassY, compassX + 3, compassY, 'F');
            
            pdfDoc.setFontSize(8);
            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setTextColor(220, 53, 69);
            pdfDoc.text('N', compassX - 2, compassY - compassRadius - 2);
            pdfDoc.setTextColor(100, 100, 100);
            pdfDoc.text('S', compassX - 2, compassY + compassRadius + 5);
            pdfDoc.text('E', compassX + compassRadius + 2, compassY + 2);
            pdfDoc.text('W', compassX - compassRadius - 5, compassY + 2);
            
            // Scale bar
            const scaleX = diagramX + 10;
            const scaleY = diagramY + diagramHeight - 15;
            const scaleWidth = 40;
            
            pdfDoc.setDrawColor(0, 0, 0);
            pdfDoc.setLineWidth(1);
            pdfDoc.line(scaleX, scaleY, scaleX + scaleWidth, scaleY);
            pdfDoc.line(scaleX, scaleY - 2, scaleX, scaleY + 2);
            pdfDoc.line(scaleX + scaleWidth, scaleY - 2, scaleX + scaleWidth, scaleY + 2);
            
            pdfDoc.setFontSize(7);
            pdfDoc.setTextColor(0, 0, 0);
            pdfDoc.text('0', scaleX - 2, scaleY + 6);
            pdfDoc.text('1 km', scaleX + scaleWidth - 8, scaleY + 6);
            
            y += diagramHeight + 8;
            
            // Coordinates below diagram
            pdfDoc.setFontSize(9);
            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setTextColor(0, 0, 0);
            pdfDoc.text(`Structure Location: ${lat.toFixed(6)}°, ${lng.toFixed(6)}°`, diagramX, y);
            
            // Google Maps link
            y += 7;
            pdfDoc.setFontSize(8);
            pdfDoc.setTextColor(0, 102, 204);
            const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            pdfDoc.textWithLink('→ View interactive map on Google Maps', diagramX, y, { url: googleMapsUrl });
            pdfDoc.setTextColor(0, 0, 0);
            
            y += 15;
            
        } else {
            pdfDoc.text('2.3 Location', 20, y + 20);
            pdfDoc.setFontSize(9);
            pdfDoc.setTextColor(150, 150, 150);
            pdfDoc.text('Location coordinates not available for this structure', 25, y + 35);
            pdfDoc.setTextColor(0, 0, 0);
            y += 60;
        }
        
        pdfDoc.addPage();
    }

    
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

    function addInspectionDetails(pdfDoc, inspectionData) {
        pdfDoc.setFontSize(14);
        pdfDoc.text('3 Inspection Details', 20, 30);
        
        if (inspectionData && inspectionData.inspectorName) {
            const inspectionDetails = [
                ['Inspector Name:', inspectionData.inspectorName],
                ['Inspection Type:', inspectionData.inspectionType || 'N/A'],
                ['Inspection Date:', inspectionData.inspectionDate || 'N/A'],
                ['Total Spans:', inspectionData.totalSpans || 'N/A']
            ];
            
            let y = 40;
            inspectionDetails.forEach(row => {
                pdfDoc.text(row[0], 25, y);
                pdfDoc.text(row[1].toString(), 70, y);
                y += 8;
            });
            
            // Add spans summary if available
            if (inspectionData.spans && inspectionData.spans.length > 0) {
                pdfDoc.text('Span Details:', 20, y + 10);
                y += 20;
                
                inspectionData.spans.forEach(span => {
                    pdfDoc.text(`Span ${span.spanNumber}:`, 25, y);
                    pdfDoc.text(`Elements Inspected: ${span.elementsInspected ? 'Yes' : 'No'}`, 70, y);
                    y += 6;
                    if (span.comments) {
                        pdfDoc.text(`Comments: ${span.comments}`, 70, y, { maxWidth: 120 });
                        y += 6;
                    }
                    y += 4;
                });
            }
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
            
            // Title page for BCI Appendix
            pdfDoc.setFontSize(14);
            pdfDoc.text('Appendix A: BCI Proforma', 105, 20, { align: 'center' });
            
            // Fetch elements data
            const elementsResponse = await fetch('http://localhost:3000/api/elements');
            if (!elementsResponse.ok) throw new Error('Failed to fetch elements');
            const elements = await elementsResponse.json();
            
            // A4 dimensions
            const pageHeight = 297;
            const pageWidth = 210;
            const tableHeight = pageHeight * 0.85;
            const tableWidth = pageWidth * 0.9;
            const leftMargin = (pageWidth - tableWidth) / 2;
            const topMargin = 15;
            
            // Process each span - TWO PAGES PER SPAN
            for (let spanNum = 1; spanNum <= totalSpans; spanNum++) {
                const spanData = spansData.find(s => s.span_number == spanNum);
                const spanDefects = spanData?.defects || [];
                
                const spanElements = elements.filter(el => 
                    el.span_number == null || el.span_number == spanNum
                );
                
                const combinedData = combineData(spanElements, spanDefects);
                const spanWorks = worksRequired.worksRequired?.filter(w => w.spanNumber == spanNum) || [];
                
                const inspectorName = spanData?.inspector_name || 'Monir Khan';
                const bciCrit = spanData?.bci_crit || '100';
                const bciAv = spanData?.bci_av || '100';
                const inspectionDate = spanData?.inspection_date || '2025-07-10';
                const photo = spanData?.photographs_taken ? 'Yes' : 'Yes';
                const inspected = spanData?.elements_inspected ? 'Yes' : 'Yes';
                const comments = spanData?.comments || '';
                
                const mergePattern = [7, 7, 7, 4, 9, 4];
                const groupLabels = [
                    "Deck Elements",
                    "Load-bearing Substructure", 
                    "Durability Elements",
                    "Safety Elements",
                    "Other Bridge Elements",
                    "Ancillary Elements"
                ];
                
                // ============ PAGE 1: MAIN BCI TABLE ============
                pdfDoc.addPage();
                
                // HEADER ROWS
                const headerRows = [
                    [
                        {content: 'Superficial', colSpan: 2},
                        {content: 'General', colSpan: 2},
                        {content: 'Principal', colSpan: 2},
                        {content: 'Special', colSpan: 2},
                        {content: 'Form', colSpan: 2}
                    ],
                    [
                        {content: `Inspector: ${inspectorName}`, colSpan: 3},
                        {content: `Date: ${inspectionDate}`, colSpan: 2},
                        {content: 'Next inspection:', colSpan: 2},
                        {content: 'Road Ref:', colSpan: 3}
                    ],
                    [
                        {content: `Bridge name: ${structureName}`, colSpan: 4},
                        {content: `Bridge Ref: ${structureId}`, colSpan: 2},
                        {content: 'Bridge code', rowSpan: 4, styles: {valign: 'middle', halign: 'center', fontStyle: 'bold'}},
                        {content: `Primary deck form: ${bridgeData.primary_form || '11'}`, colSpan: 3}
                    ],
                    [
                        {content: `Map Ref: ${bridgeData.latitude?.toFixed(3) || '53.708'}, ${bridgeData.longitude?.toFixed(3) || '-0.449'}`, colSpan: 2},
                        {content: `OSE: ${bridgeData.OSE || '502462'}`, colSpan: 2},
                        {content: `OSN: ${bridgeData.OSN || '424569'}`, colSpan: 2},
                        {content: `Primary deck material: ${bridgeData.primary_material || 'E'}`, colSpan: 3}
                    ],
                    [
                        {content: `Span: ${spanNum} of ${totalSpans}`, colSpan: 2},
                        {content: `Span Width (m): ${bridgeData.span || '1410'}`, colSpan: 2},
                        {content: `Span Length (m): ${bridgeData.length || '2220'}`, colSpan: 2},
                        {content: `Secondary deck form: ${bridgeData.secondary_form || '26'}`, colSpan: 3}
                    ],
                    [
                        {content: `All above ground elements inspected: ${inspected}`, colSpan: 4},
                        {content: `Photograph: ${photo}`, colSpan: 2},
                        {content: `Secondary deck material: ${bridgeData.secondary_material || 'B'}`, colSpan: 3}
                    ],
                    [
                        {content: `BCI crit: ${bciCrit}  BCI ave: ${bciAv}`, colSpan: 10, styles: {fontStyle: 'bold'}}
                    ],
                    [
                        {content: 'Set', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'No', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'Description', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'S', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'Ex', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'Def', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'W', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'P', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'Cost', styles: {halign: 'center', fontStyle: 'bold'}},
                        {content: 'Comments', styles: {halign: 'center', fontStyle: 'bold'}}
                    ]
                ];
                
                // DEFECTS ROWS - with actual merged cells in the Set column
                let currentGroupIndex = 0;
                let rowsInCurrentGroup = 0;
                const defectRows = [];

                combinedData.forEach((item, index) => {
                    if (rowsInCurrentGroup === 0) {
                        // Start of a new group - add rowSpan
                        rowsInCurrentGroup = mergePattern[currentGroupIndex];
                        
                        const defDisplay = item.def === '-' ? '-' : 
                                        item.defN ? `${item.def}.${item.defN}` : item.def;
                        
                        defectRows.push([
                            {content: groupLabels[currentGroupIndex], rowSpan: mergePattern[currentGroupIndex], styles: {valign: 'middle', halign: 'center', fontStyle: 'bold'}},
                            item.element_number,
                            item.description,
                            item.s,
                            item.ex,
                            defDisplay,
                            item.w,
                            item.p,
                            item.cost,
                            item.comments_remarks
                        ]);
                        
                        currentGroupIndex++;
                        rowsInCurrentGroup--;
                    } else {
                        // Continuation of group - no Set column cell
                        const defDisplay = item.def === '-' ? '-' : 
                                        item.defN ? `${item.def}.${item.defN}` : item.def;
                        
                        defectRows.push([
                            item.element_number,
                            item.description,
                            item.s,
                            item.ex,
                            defDisplay,
                            item.w,
                            item.p,
                            item.cost,
                            item.comments_remarks
                        ]);
                        
                        rowsInCurrentGroup--;
                    }
                });
                
                // Footer row
                const footerRow = [
                    {content: 'S - severity, Ex - extent, Def - defect, W - work required, P - work priority, Cost - cost of work.', 
                    colSpan: 10, styles: {halign: 'center', fontSize: 6}}
                ];
                
                const allRows = [...headerRows, ...defectRows, footerRow];
                
                // CALCULATE ROW HEIGHT to fill 80% of page
                const totalRows = allRows.length;
                const availableHeight = tableHeight;
                const calculatedRowHeight = availableHeight / totalRows;
                
                // RENDER PAGE 1 TABLE
                pdfDoc.autoTable({
                    startY: topMargin,
                    body: allRows,
                    theme: 'grid',
                    styles: {
                        fontSize: 6.5,
                        cellPadding: 0.5,
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        minCellHeight: calculatedRowHeight
                    },
                    columnStyles: {
                        0: { cellWidth: tableWidth * 0.056 },
                        1: { cellWidth: tableWidth * 0.056 },
                        2: { cellWidth: tableWidth * 0.32 },
                        3: { cellWidth: tableWidth * 0.042 },
                        4: { cellWidth: tableWidth * 0.042 },
                        5: { cellWidth: tableWidth * 0.056 },
                        6: { cellWidth: tableWidth * 0.042 },
                        7: { cellWidth: tableWidth * 0.042 },
                        8: { cellWidth: tableWidth * 0.067 },
                        9: { cellWidth: tableWidth * 0.277 }
                    },
                    margin: { left: leftMargin, right: leftMargin }
                });
                
                // ============ PAGE 2: MULTIPLE DEFECTS, COMMENTS, WORKS REQUIRED ============
                pdfDoc.addPage();
                
                const multipleDefects = spanDefects.filter(d => d.defect_no > 1);
                const page2Rows = [];
                
                // MULTIPLE DEFECTS section
                page2Rows.push([
                    {content: 'MULTIPLE DEFECTS', colSpan: 11, styles: {halign: 'center', fontStyle: 'bold', fontSize: 10}}
                ]);
                
                page2Rows.push([
                    {content: 'Element No.', rowSpan: 2},
                    {content: 'Defect 1', colSpan: 3, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Defect 2', colSpan: 3, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Defect 3', colSpan: 3, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Comments', rowSpan: 2}
                ]);
                
                page2Rows.push([
                    {content: 'S', styles: {halign: 'center'}},
                    {content: 'Ex', styles: {halign: 'center'}},
                    {content: 'Def', styles: {halign: 'center'}},
                    {content: 'S', styles: {halign: 'center'}},
                    {content: 'Ex', styles: {halign: 'center'}},
                    {content: 'Def', styles: {halign: 'center'}},
                    {content: 'S', styles: {halign: 'center'}},
                    {content: 'Ex', styles: {halign: 'center'}},
                    {content: 'Def', styles: {halign: 'center'}}
                ]);
                
                for (let i = 4; i <= 8; i++) {
                    const defect = multipleDefects.find(d => d.element_no == i);
                    page2Rows.push([
                        i.toString(),
                        defect?.s || '',
                        defect?.ex || '',
                        defect ? `${defect.def}.${defect.defN}` : '',
                        '', '', '', '', '', '',
                        defect?.comments_remarks || ''
                    ]);
                }
                
                // INSPECTOR'S COMMENTS section
                page2Rows.push([
                    {content: "INSPECTOR'S COMMENTS", colSpan: 11, styles: {halign: 'center', fontStyle: 'bold', fontSize: 10}}
                ]);
                
                page2Rows.push([
                    {content: comments || '', colSpan: 11, styles: {minCellHeight: 80}}
                ]);
                
                page2Rows.push([
                    {content: 'Name:', colSpan: 1},
                    {content: inspectorName, colSpan: 3},
                    {content: 'Signed:', colSpan: 1},
                    {content: inspectorName, colSpan: 3},
                    {content: 'Date:', colSpan: 1},
                    {content: inspectionDate, colSpan: 2}
                ]);
                
                // ENGINEER'S COMMENTS section
                page2Rows.push([
                    {content: "ENGINEER'S COMMENTS", colSpan: 11, styles: {halign: 'center', fontStyle: 'bold', fontSize: 10}}
                ]);
                
                page2Rows.push([
                    {content: '', colSpan: 11, styles: {minCellHeight: 80}}
                ]);
                
                page2Rows.push([
                    {content: 'Name:', colSpan: 1},
                    {content: '[Insert name]', colSpan: 3},
                    {content: 'Signed:', colSpan: 1},
                    {content: '[Insert sign]', colSpan: 3},
                    {content: 'Date:', colSpan: 1},
                    {content: inspectionDate, colSpan: 2}
                ]);
                
                // WORK REQUIRED section
                page2Rows.push([
                    {content: `WORK REQUIRED - SPAN ${spanNum}`, colSpan: 11, styles: {halign: 'center', fontStyle: 'bold', fontSize: 10}}
                ]);
                
                page2Rows.push([
                    {content: 'Ref.', colSpan: 1, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Suggested Remedial Work', colSpan: 6, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Priority', colSpan: 1, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Estimated Cost', colSpan: 2, styles: {halign: 'center', fontStyle: 'bold'}},
                    {content: 'Action', colSpan: 1, styles: {halign: 'center', fontStyle: 'bold'}}
                ]);
                
                for (let i = 0; i < 5; i++) {
                    const work = spanWorks[i];
                    page2Rows.push([
                        (i + 1).toString(),
                        {content: work?.remedialWorks || '', colSpan: 6},
                        work?.priority || '',
                        {content: work?.cost === 'Not specified' ? '' : (work?.cost || ''), colSpan: 2},
                        work?.worksRequired === 'Y' ? '✓' : work?.worksRequired === 'M' ? '?' : ''
                    ]);
                }
                
                // RENDER PAGE 2
                pdfDoc.autoTable({
                    startY: topMargin,
                    body: page2Rows,
                    theme: 'grid',
                    styles: {
                        fontSize: 7,
                        cellPadding: 1,
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    margin: { left: leftMargin, right: leftMargin }
                });
            }
            
        } catch (error) {
            console.error('Error adding BCI form:', error);
            pdfDoc.setFontSize(10);
            pdfDoc.text('Error generating BCI form content', 20, 40);
        }
    }

    // Combine data function
    function combineData(elements, defects) {
        return elements.map(element => {
            const defect = defects.find(d => d.element_no === element.element_number);
            return {
                ...element,
                s: defect?.s || '-',
                ex: defect?.ex || '-',
                def: defect?.def || '-',
                defN: defect?.defN || '-',
                w: defect?.w || '-',
                p: defect?.p || '-',
                cost: defect?.cost || '',
                comments_remarks: defect?.comments_remarks || ''
            };
        });
    }

    async function addPhotographs(pdfDoc, photosByDefect) {
        // ALWAYS start photos on a new page
        pdfDoc.addPage();
        
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
            
            // Check if we need a new page BEFORE adding defect header
            if (y > 240) {
                pdfDoc.addPage();
                y = 20;
            }
            
            // Add defect header
            pdfDoc.setFontSize(11);
            pdfDoc.setFont("helvetica", "bold");
            if (defect.description) {
                const headerText = `Defect ${defect.type}.${defect.number}: ${defect.description}`;
                pdfDoc.text(headerText, 20, y);
                y += 10;
            }
            pdfDoc.setFont("helvetica", "normal");
            
            // Add photos (2 per row)
            for (let i = 0; i < photos.length; i += 2) {
                // Check if we have space for a photo row (need ~85mm)
                if (y > 200) {
                    pdfDoc.addPage();
                    y = 20;
                }
                
                // First photo in row
                const photo1 = photos[i];
                try {
                    const img1 = new Image();
                    img1.crossOrigin = "Anonymous";
                    
                    await new Promise((resolve, reject) => {
                        img1.onload = resolve;
                        img1.onerror = reject;
                        img1.src = photo1.photo_url;
                    });
                    
                    pdfDoc.addImage(img1, 'JPEG', 20, y, 80, 60);
                    
                    pdfDoc.setFontSize(8);
                    pdfDoc.text(`Photo ${photoCounter}: ${photo1.photo_description || 'No description'}`, 20, y + 65, { maxWidth: 75 });
                    if (photo1.uploaded_at) {
                        pdfDoc.text(`Uploaded: ${new Date(photo1.uploaded_at).toLocaleDateString()}`, 20, y + 70);
                    }
                    photoCounter++;
                } catch (e) {
                    console.error('Error loading photo:', e);
                    pdfDoc.setFontSize(8);
                    pdfDoc.text('Photo not available', 20, y + 30);
                }
                
                // Second photo in row if exists
                if (i + 1 < photos.length) {
                    const photo2 = photos[i + 1];
                    try {
                        const img2 = new Image();
                        img2.crossOrigin = "Anonymous";
                        
                        await new Promise((resolve, reject) => {
                            img2.onload = resolve;
                            img2.onerror = reject;
                            img2.src = photo2.photo_url;
                        });
                        
                        pdfDoc.addImage(img2, 'JPEG', 110, y, 80, 60);
                        
                        pdfDoc.setFontSize(8);
                        pdfDoc.text(`Photo ${photoCounter}: ${photo2.photo_description || 'No description'}`, 110, y + 65, { maxWidth: 75 });
                        if (photo2.uploaded_at) {
                            pdfDoc.text(`Uploaded: ${new Date(photo2.uploaded_at).toLocaleDateString()}`, 110, y + 70);
                        }
                        photoCounter++;
                    } catch (e) {
                        console.error('Error loading photo:', e);
                        pdfDoc.setFontSize(8);
                        pdfDoc.text('Photo not available', 110, y + 30);
                    }
                }
                
                y += 80; // Move down for next row
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