// ============================================================
// GOOGLE APPS SCRIPT — paste this into Extensions > Apps Script
// in your Google Sheet, then Deploy > New deployment > Web app
// Execute as: Me | Who has access: Anyone
// ============================================================

// Sheet names
const SAVINGS_SHEET = '2026Goal';
const BUDGET_SHEET = 'Budget';
const CONFIG_SHEET = 'Config';

// ── GET: Read all data ──
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Savings ---
  const savingsSheet = ss.getSheetByName(SAVINGS_SHEET);
  let savings = { haroldBalance: 310000, yssaBalance: 65000, checks: {}, amounts: {} };

  if (savingsSheet) {
    savings.haroldBalance = savingsSheet.getRange('B1').getValue() || 0;
    savings.yssaBalance = savingsSheet.getRange('B2').getValue() || 0;

    for (let row = 5; row <= 16; row++) {
      const m = row - 5;
      const vals = savingsSheet.getRange(row, 2, 1, 10).getValues()[0];
      savings.amounts[m] = [vals[0], vals[2], vals[4], vals[6], vals[8]];
      savings.checks[m] = [vals[1] === true, vals[3] === true, vals[5] === true, vals[7] === true, vals[9] === true];
    }
  }

  // --- Budget checks ---
  const budgetSheet = ss.getSheetByName(BUDGET_SHEET);
  let budgetChecks = {};
  let budgetItems = null;

  if (budgetSheet) {
    // Row 1: JSON of custom budget items (if customized)
    const itemsJson = budgetSheet.getRange('A1').getValue();
    if (itemsJson) {
      try { budgetItems = JSON.parse(itemsJson); } catch(e) {}
    }

    // Row 2: JSON of budget check states
    const checksJson = budgetSheet.getRange('A2').getValue();
    if (checksJson) {
      try { budgetChecks = JSON.parse(checksJson); } catch(e) {}
    }
  }

  return jsonResponse({
    savings,
    budgetChecks,
    budgetItems
  });
}

// ── POST: Write data ──
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);

  // --- Savings: update balances ---
  if (data.action === 'updateBalances') {
    const sheet = getOrCreateSheet(ss, SAVINGS_SHEET);
    if (data.haroldBalance !== undefined) sheet.getRange('B1').setValue(data.haroldBalance);
    if (data.yssaBalance !== undefined) sheet.getRange('B2').setValue(data.yssaBalance);
  }

  // --- Savings: toggle income checkbox ---
  if (data.action === 'toggleIncome') {
    const sheet = getOrCreateSheet(ss, SAVINGS_SHEET);
    const t = data.toggle;
    const row = t.month + 5;
    const col = 2 + (t.col * 2) + 1; // _rcvd column
    sheet.getRange(row, col).setValue(t.value);

    // Also update the balance
    if (data.haroldBalance !== undefined) sheet.getRange('B1').setValue(data.haroldBalance);
    if (data.yssaBalance !== undefined) sheet.getRange('B2').setValue(data.yssaBalance);
  }

  // --- Budget: toggle a bill checkbox ---
  if (data.action === 'toggleBudget') {
    const sheet = getOrCreateSheet(ss, BUDGET_SHEET);
    const current = sheet.getRange('A2').getValue();
    let checks = {};
    if (current) { try { checks = JSON.parse(current); } catch(e) {} }
    checks[data.key] = data.value;
    sheet.getRange('A2').setValue(JSON.stringify(checks));
  }

  // --- Budget: save full check state (bulk) ---
  if (data.action === 'saveBudgetChecks') {
    const sheet = getOrCreateSheet(ss, BUDGET_SHEET);
    sheet.getRange('A2').setValue(JSON.stringify(data.checks));
  }

  // --- Budget: save custom items ---
  if (data.action === 'saveBudgetItems') {
    const sheet = getOrCreateSheet(ss, BUDGET_SHEET);
    sheet.getRange('A1').setValue(JSON.stringify(data.items));
  }

  return jsonResponse({ success: true });
}

// ── Helpers ──
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════
// Run this ONCE to set up all sheets
// ══════════════════════════════════════
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Savings sheet ──
  const savingsSheet = getOrCreateSheet(ss, SAVINGS_SHEET);
  savingsSheet.clear();

  // Row 1-2: Balances
  savingsSheet.getRange('A1').setValue('Harold Balance');
  savingsSheet.getRange('B1').setValue(310000);
  savingsSheet.getRange('A2').setValue('Yssa Balance');
  savingsSheet.getRange('B2').setValue(65000);

  // Row 4: Headers
  const headers = ['Month', 'H10', 'H10_rcvd', 'H25', 'H25_rcvd', 'H30', 'H30_rcvd', 'Y15', 'Y15_rcvd', 'Y30', 'Y30_rcvd'];
  savingsSheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  savingsSheet.getRange(4, 1, 1, headers.length).setFontWeight('bold');

  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const defaults = { 0: [60000,60000,15000,11000,12000], 1: [60000,60000,7000,9000,12000] };
  for (let i = 2; i < 12; i++) defaults[i] = [60000,60000,15000,9000,12000];

  const defaultChecks = {};
  for (let i = 0; i < 12; i++) defaultChecks[i] = [false,false,false,false,false];
  for (let i = 0; i < 3; i++) defaultChecks[i] = [true,true,true,true,true];
  defaultChecks[3] = [true,false,false,false,false];

  for (let m = 0; m < 12; m++) {
    const row = m + 5;
    const a = defaults[m], c = defaultChecks[m];
    savingsSheet.getRange(row, 1, 1, 11).setValues([[months[m], a[0], c[0], a[1], c[1], a[2], c[2], a[3], c[3], a[4], c[4]]]);
  }

  // Checkboxes
  for (const col of [3, 5, 7, 9, 11]) {
    savingsSheet.getRange(5, col, 12, 1).insertCheckboxes();
  }
  // Number format
  for (const col of [2, 4, 6, 8, 10]) {
    savingsSheet.getRange(5, col, 12, 1).setNumberFormat('#,##0');
  }
  savingsSheet.getRange('B1').setNumberFormat('#,##0');
  savingsSheet.getRange('B2').setNumberFormat('#,##0');

  savingsSheet.setColumnWidth(1, 120);
  for (let i = 2; i <= 11; i++) savingsSheet.setColumnWidth(i, 90);

  // ── Budget sheet ──
  const budgetSheet = getOrCreateSheet(ss, BUDGET_SHEET);
  budgetSheet.clear();
  // A1: custom items JSON (empty = use defaults)
  // A2: check states JSON
  budgetSheet.getRange('A1').setValue('');
  budgetSheet.getRange('A2').setValue('{}');
  budgetSheet.getRange('A3').setValue('Row 1: Custom budget items JSON | Row 2: Check states JSON');

  SpreadsheetApp.flush();
  Logger.log('All sheets set up!');
}
