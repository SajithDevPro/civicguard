/**
 * CivicGuard CSV Intelligence Export Utility (exportCsv.ts)
 * Formats municipal incident reports into RFC 4180-compliant CSV datasets
 * for geographic GIS integration, statistical packages, and spreadsheet intake.
 */
import { IncidentReport, PoliceStation } from '../types';

export interface CsvExportOptions {
  filename?: string;
  stations?: PoliceStation[];
  includeOfficerNotes?: boolean;
}

export function exportIncidentsToCsv(
  incidents: IncidentReport[],
  options: CsvExportOptions = {}
): void {
  const stationMap = new Map<string, string>();
  if (options.stations) {
    options.stations.forEach((st) => stationMap.set(st.id, `${st.code} - ${st.name}`));
  }

  const headers = [
    'Case ID',
    'Title',
    'Category',
    'Status',
    'Latitude',
    'Longitude',
    'Approximate Address',
    'Serial / VIN Number',
    'Estimated Value ($)',
    'Assigned Precinct',
    'Reported Date (UTC)',
    'Last Updated (UTC)',
    'Reporter Name',
    'Reporter Phone',
  ];

  if (options.includeOfficerNotes) {
    headers.push('Officer Notes');
  }

  const escapeCell = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    // Double quotes escaped to ""
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = incidents.map((inc) => {
    const stationName = inc.assigned_station_id
      ? stationMap.get(inc.assigned_station_id) || inc.assigned_station_name || inc.assigned_station_id
      : 'Unassigned';

    const baseRow = [
      escapeCell(inc.id),
      escapeCell(inc.title),
      escapeCell(inc.category.toUpperCase()),
      escapeCell(inc.status.toUpperCase()),
      escapeCell(inc.lat.toFixed(6)),
      escapeCell(inc.lng.toFixed(6)),
      escapeCell(inc.address_approx || 'N/A'),
      escapeCell(inc.serial_number || 'N/A'),
      escapeCell(inc.estimated_value !== null ? inc.estimated_value.toFixed(2) : '0.00'),
      escapeCell(stationName),
      escapeCell(inc.created_at),
      escapeCell(inc.updated_at),
      escapeCell(inc.reporter_name || 'Anonymous'),
      escapeCell(inc.reporter_phone || 'N/A'),
    ];

    if (options.includeOfficerNotes) {
      baseRow.push(escapeCell(inc.officer_notes || 'None'));
    }

    return baseRow.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const defaultFilename = `CivicGuard_Incident_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', options.filename || defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
