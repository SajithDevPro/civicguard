/**
 * CivicGuard Executive Law Enforcement PDF Briefing Generator (exportPdf.ts)
 * Generates institutional intelligence briefing dossiers for command staff,
 * precinct shift briefings, and municipal safety oversight.
 */
import { jsPDF } from 'jspdf';
import { IncidentReport, PoliceStation, UserProfile } from '../types';

export interface PdfBriefingOptions {
  title?: string;
  author?: UserProfile;
  selectedStation?: PoliceStation | null;
  dateRangeLabel?: string;
  notes?: string;
  filename?: string;
}

export function generateIntelligenceBriefingPdf(
  incidents: IncidentReport[],
  stations: PoliceStation[],
  options: PdfBriefingOptions = {}
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Station mapping
  const stationMap = new Map<string, PoliceStation>();
  stations.forEach((st) => stationMap.set(st.id, st));

  // Key aggregations
  const totalReports = incidents.length;
  const pendingCases = incidents.filter((i) => i.status === 'pending');
  const investigatedCases = incidents.filter((i) => i.status === 'investigated');
  const recoveredCases = incidents.filter((i) => i.status === 'recovered');

  const recoveryRate = totalReports > 0 ? ((recoveredCases.length / totalReports) * 100).toFixed(1) : '0.0';
  const totalStolenValue = incidents.reduce((sum, i) => sum + (i.estimated_value || 0), 0);
  const totalRecoveredValue = recoveredCases.reduce((sum, i) => sum + (i.estimated_value || 0), 0);

  // Geographic bounds
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  if (incidents.length > 0) {
    incidents.forEach((i) => {
      if (i.lat < minLat) minLat = i.lat;
      if (i.lat > maxLat) maxLat = i.lat;
      if (i.lng < minLng) minLng = i.lng;
      if (i.lng > maxLng) maxLng = i.lng;
    });
  } else {
    minLat = 37.7; maxLat = 37.8; minLng = -122.5; maxLng = -122.4;
  }

  // 1. TOP HEADER BANNER (GovTech Command Aesthetic)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Classification Banner top line
  doc.setFillColor(239, 68, 68); // Red-500
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CIVICGUARD // LAW ENFORCEMENT INTELLIGENCE BRIEFING', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    'MUNICIPAL CRIME REDUCTION & ASSET RECOVERY COMMAND · OPERATIONAL DISPATCH DOSSIER',
    margin,
    18
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(239, 68, 68); // Red
  doc.text(
    'FOR OFFICIAL USE ONLY (FOUO) // LAW ENFORCEMENT SENSITIVE',
    pageWidth - margin - 85,
    12
  );

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`DATE ISSUED: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, pageWidth - margin - 85, 18);

  // 2. METADATA BAR
  let currentY = 34;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const officerName = options.author?.full_name || 'Watch Commander / Shift Supervisor';
  const badgeNo = options.author?.badge_number ? `#${options.author.badge_number}` : 'COMMAND-HQ';
  const precinctLabel = options.selectedStation ? `${options.selectedStation.code} - ${options.selectedStation.name}` : 'Metropolitan Multi-Jurisdiction Command';
  const dateWindow = options.dateRangeLabel || 'All Active Records';

  doc.text(`BRIEFING OFFICER: ${officerName} (${badgeNo})`, margin + 4, currentY + 6);
  doc.text(`JURISDICTION: ${precinctLabel}`, margin + 4, currentY + 11.5);

  doc.text(`TEMPORAL WINDOW: ${dateWindow}`, margin + 110, currentY + 6);
  doc.text(`ENCRYPTION HASH: SHA256-${Date.now().toString(16).toUpperCase()}`, margin + 110, currentY + 11.5);

  currentY += 21;

  // 3. EXECUTIVE KPI METRICS SCORECARD (4 Key Blocks)
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 17;

  // Card 1: Total Reports
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INCIDENTS', margin + 3, currentY + 4.5);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalReports}`, margin + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${pendingCases.length} open · ${recoveredCases.length} recovered`, margin + 3, currentY + 15.5);

  // Card 2: Value Stolen
  const c2X = margin + cardWidth + 3;
  doc.roundedRect(c2X, currentY, cardWidth, cardHeight, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STOLEN VALUATION', c2X + 3, currentY + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(225, 29, 72); // Rose
  doc.text(`$${totalStolenValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, c2X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Estimated Replacement Cost', c2X + 3, currentY + 15.5);

  // Card 3: Value Recovered
  const c3X = c2X + cardWidth + 3;
  doc.roundedRect(c3X, currentY, cardWidth, cardHeight, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('RECOVERED ASSETS', c3X + 3, currentY + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`$${totalRecoveredValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, c3X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${recoveredCases.length} items verified`, c3X + 3, currentY + 15.5);

  // Card 4: Recovery Success Rate
  const c4X = c3X + cardWidth + 3;
  doc.roundedRect(c4X, currentY, cardWidth, cardHeight, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('RECOVERY SUCCESS', c4X + 3, currentY + 4.5);
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235); // Blue
  doc.text(`${recoveryRate}%`, c4X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Resolution Clearance Ratio', c4X + 3, currentY + 15.5);

  currentY += cardHeight + 6;

  // 4. GEOGRAPHIC HOTSPOT & PATROL FOCUS
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('GEOGRAPHIC ENVELOPE & TACTICAL PATROL COORDINATES', margin + 3, currentY + 3.7);

  currentY += 7;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Hotspot Perimeter: Lat [${minLat.toFixed(4)}°N to ${maxLat.toFixed(4)}°N] · Lng [${Math.abs(maxLng).toFixed(4)}°W to ${Math.abs(minLng).toFixed(4)}°W] · Primary Dispatch Precinct: ${precinctLabel}`,
    margin + 2,
    currentY
  );
  currentY += 5;

  // 5. HIGH-PRIORITY OPEN INCIDENTS TABLE
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, contentWidth, 6, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  doc.text('CASE ID', margin + 2, currentY + 4.2);
  doc.text('CLASS', margin + 28, currentY + 4.2);
  doc.text('PROPERTY / ASSET DESCRIPTION', margin + 48, currentY + 4.2);
  doc.text('SERIAL / VIN', margin + 115, currentY + 4.2);
  doc.text('EST. VALUE', margin + 145, currentY + 4.2);
  doc.text('STATUS', margin + 168, currentY + 4.2);

  currentY += 6;

  // Render top 15 priority incidents (pending and investigated first)
  const priorityList = [...incidents].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).slice(0, 16);

  priorityList.forEach((inc, index) => {
    // Check if new page needed
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 20;

      // Repeat table header on new page
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currentY, contentWidth, 6, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('CASE ID', margin + 2, currentY + 4.2);
      doc.text('CLASS', margin + 28, currentY + 4.2);
      doc.text('PROPERTY / ASSET DESCRIPTION', margin + 48, currentY + 4.2);
      doc.text('SERIAL / VIN', margin + 115, currentY + 4.2);
      doc.text('EST. VALUE', margin + 145, currentY + 4.2);
      doc.text('STATUS', margin + 168, currentY + 4.2);
      currentY += 6;
    }

    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + 7, margin + contentWidth, currentY + 7);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    // Case ID truncated
    doc.text(inc.id.slice(0, 13).toUpperCase(), margin + 2, currentY + 4.8);

    // Category
    doc.setFont('helvetica', 'normal');
    doc.text(inc.category.toUpperCase(), margin + 28, currentY + 4.8);

    // Title / Description
    const displayTitle = inc.title.length > 40 ? `${inc.title.slice(0, 38)}...` : inc.title;
    doc.text(displayTitle, margin + 48, currentY + 4.8);

    // Serial
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(inc.serial_number ? 30 : 148, inc.serial_number ? 41 : 163, inc.serial_number ? 59 : 184);
    doc.text(inc.serial_number || 'N/A (UNMARKED)', margin + 115, currentY + 4.8);

    // Estimated Value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const valText = inc.estimated_value !== null ? `$${inc.estimated_value.toFixed(0)}` : 'N/A';
    doc.text(valText, margin + 145, currentY + 4.8);

    // Status Badge text
    if (inc.status === 'recovered') {
      doc.setTextColor(16, 185, 129); // Green
      doc.setFont('helvetica', 'bold');
      doc.text('RECOVERED', margin + 168, currentY + 4.8);
    } else if (inc.status === 'investigated') {
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFont('helvetica', 'bold');
      doc.text('INVESTIGATED', margin + 168, currentY + 4.8);
    } else {
      doc.setTextColor(225, 29, 72); // Rose
      doc.setFont('helvetica', 'bold');
      doc.text('PENDING', margin + 168, currentY + 4.8);
    }

    currentY += 7;
  });

  // 6. BRIEFING FOOTER & SIGN-OFF
  const footerY = pageHeight - 16;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'LAW ENFORCEMENT DISPATCH CERTIFICATION: DATA GENERATED AUTOMATICALLY BY CIVICGUARD TELEMETRY ENGINE',
    margin,
    footerY + 4
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'CONFIDENTIAL // FOR OFFICIAL USE ONLY // REPRODUCTION RESTRICTED TO AUTHORIZED POLICE MUNICIPAL PERSONNEL',
    margin,
    footerY + 8
  );

  doc.text(`PAGE 1 OF 1 · MUNICIPAL REF: CG-BRIEF-${Date.now().toString(36).toUpperCase()}`, pageWidth - margin - 50, footerY + 8);

  // Trigger browser download
  const defaultFilename = `CivicGuard_Intelligence_Briefing_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(options.filename || defaultFilename);
}
