// ============================================================
// GOOGLE APPS SCRIPT — paste this into Extensions > Apps Script
// in your Google Sheet, then Deploy > Web app
// ============================================================

// Sheet name must match exactly
const SHEET_NAME = '2026Goal';

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Sheet not found' });

  const actualSavings = sheet.getRange('B1').getValue();

  const checks = {};
  const amounts = {};
  for (let row = 4; row <= 15; row++) {
    const m = row - 4; // 0-11
    const vals = sheet.getRange(row, 2, 1, 10).getValues()[0];
    // cols: H10_amt, H10_rcvd, H25_amt, H25_rcvd, H30_amt, H30_rcvd, Y15_amt, Y15_rcvd, Y30_amt, Y30_rcvd
    amounts[m] = [vals[0], vals[2], vals[4], vals[6], vals[8]];
    checks[m] = [vals[1] === true, vals[3] === true, vals[5] === true, vals[7] === true, vals[9] === true];
  }

  return jsonResponse({ actualSavings, checks, amounts });
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'Sheet not found' });

  const data = JSON.parse(e.postData.contents);

  // Update actual savings
  if (data.actualSavings !== undefined) {
    sheet.getRange('B1').setValue(data.actualSavings);
  }

  // Update a single checkbox: { month: 0-11, col: 0-4, value: true/false }
  if (data.toggle !== undefined) {
    const t = data.toggle;
    const row = t.month + 4;
    const col = 2 + (t.col * 2) + 1; // offset to the _rcvd column (B=2, so H10_rcvd=C=3, H25_rcvd=E=5, etc.)
    sheet.getRange(row, col).setValue(t.value);
  }

  return jsonResponse({ success: true });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this once to set up your sheet with the correct structure
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Row 1: actual savings
  sheet.getRange('A1').setValue('actualSavings');
  sheet.getRange('B1').setValue(375000);

  // Row 3: headers
  const headers = ['Month', 'H10', 'H10_rcvd', 'H25', 'H25_rcvd', 'H30', 'H30_rcvd', 'Y15', 'Y15_rcvd', 'Y30', 'Y30_rcvd'];
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length).setFontWeight('bold');

  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  // Default amounts per month [H10, H25, H30, Y15, Y30]
  const defaults = {
    0: [60000,60000,15000,11000,12000],
    1: [60000,60000,7000,9000,12000],
  };
  for (let i = 2; i < 12; i++) defaults[i] = [60000,60000,15000,9000,12000];

  // Default checks: Jan-Mar all true, April only H10 true
  const defaultChecks = {};
  for (let i = 0; i < 12; i++) defaultChecks[i] = [false,false,false,false,false];
  for (let i = 0; i < 3; i++) defaultChecks[i] = [true,true,true,true,true];
  defaultChecks[3] = [true,false,false,false,false];

  for (let m = 0; m < 12; m++) {
    const row = m + 4;
    const a = defaults[m];
    const c = defaultChecks[m];
    const rowData = [months[m], a[0], c[0], a[1], c[1], a[2], c[2], a[3], c[3], a[4], c[4]];
    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  }

  // Format
  sheet.setColumnWidth(1, 120);
  for (let i = 2; i <= 11; i++) sheet.setColumnWidth(i, 90);

  // Add checkboxes for the _rcvd columns
  for (let col of [3, 5, 7, 9, 11]) {
    sheet.getRange(4, col, 12, 1).insertCheckboxes();
  }

  // Format amount columns as numbers
  for (let col of [2, 4, 6, 8, 10]) {
    sheet.getRange(4, col, 12, 1).setNumberFormat('#,##0');
  }

  SpreadsheetApp.flush();
  Logger.log('Sheet setup complete!');
}
