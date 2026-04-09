// ============================================================
// GOOGLE APPS SCRIPT - paste this into Extensions > Apps Script
// in your Google Sheet, then Deploy > New deployment > Web app
// Execute as: Me | Who has access: Anyone
// ============================================================

var SAVINGS_SHEET = '2026Goal';
var BUDGET_SHEET = 'Budget';

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Savings
  var savingsSheet = ss.getSheetByName(SAVINGS_SHEET);
  var savings = { haroldBalance: 310000, yssaBalance: 65000, checks: {}, amounts: {} };

  if (savingsSheet) {
    savings.haroldBalance = savingsSheet.getRange('B1').getValue() || 0;
    savings.yssaBalance = savingsSheet.getRange('B2').getValue() || 0;

    for (var row = 5; row <= 16; row++) {
      var m = row - 5;
      var vals = savingsSheet.getRange(row, 2, 1, 10).getValues()[0];
      savings.amounts[m] = [vals[0], vals[2], vals[4], vals[6], vals[8]];
      savings.checks[m] = [vals[1] === true, vals[3] === true, vals[5] === true, vals[7] === true, vals[9] === true];
    }
  }

  // Budget
  var budgetSheet = ss.getSheetByName(BUDGET_SHEET);
  var budgetChecks = {};
  var budgetItems = null;

  if (budgetSheet) {
    var itemsJson = budgetSheet.getRange('A1').getValue();
    if (itemsJson) {
      try { budgetItems = JSON.parse(itemsJson); } catch(err) {}
    }
    var checksJson = budgetSheet.getRange('A2').getValue();
    if (checksJson) {
      try { budgetChecks = JSON.parse(checksJson); } catch(err) {}
    }
  }

  return jsonResponse({
    savings: savings,
    budgetChecks: budgetChecks,
    budgetItems: budgetItems
  });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);

  if (data.action === 'updateBalances') {
    var sheet = getOrCreateSheet(ss, SAVINGS_SHEET);
    if (data.haroldBalance !== undefined) sheet.getRange('B1').setValue(data.haroldBalance);
    if (data.yssaBalance !== undefined) sheet.getRange('B2').setValue(data.yssaBalance);
  }

  if (data.action === 'toggleIncome') {
    var sheet2 = getOrCreateSheet(ss, SAVINGS_SHEET);
    var t = data.toggle;
    var row = t.month + 5;
    var col = 2 + (t.col * 2) + 1;
    sheet2.getRange(row, col).setValue(t.value);
    if (data.haroldBalance !== undefined) sheet2.getRange('B1').setValue(data.haroldBalance);
    if (data.yssaBalance !== undefined) sheet2.getRange('B2').setValue(data.yssaBalance);
  }

  if (data.action === 'toggleBudget') {
    var sheet3 = getOrCreateSheet(ss, BUDGET_SHEET);
    var current = sheet3.getRange('A2').getValue();
    var checks = {};
    if (current) { try { checks = JSON.parse(current); } catch(err) {} }
    checks[data.key] = data.value;
    sheet3.getRange('A2').setValue(JSON.stringify(checks));
  }

  if (data.action === 'saveBudgetChecks') {
    var sheet4 = getOrCreateSheet(ss, BUDGET_SHEET);
    sheet4.getRange('A2').setValue(JSON.stringify(data.checks));
  }

  if (data.action === 'saveBudgetItems') {
    var sheet5 = getOrCreateSheet(ss, BUDGET_SHEET);
    sheet5.getRange('A1').setValue(JSON.stringify(data.items));
  }

  return jsonResponse({ success: true });
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run this ONCE to set up all sheets
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var savingsSheet = getOrCreateSheet(ss, SAVINGS_SHEET);
  savingsSheet.clear();

  savingsSheet.getRange('A1').setValue('Harold Balance');
  savingsSheet.getRange('B1').setValue(310000);
  savingsSheet.getRange('A2').setValue('Yssa Balance');
  savingsSheet.getRange('B2').setValue(65000);

  var headers = ['Month', 'H10', 'H10_rcvd', 'H25', 'H25_rcvd', 'H30', 'H30_rcvd', 'Y15', 'Y15_rcvd', 'Y30', 'Y30_rcvd'];
  savingsSheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  savingsSheet.getRange(4, 1, 1, headers.length).setFontWeight('bold');

  var months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  var defaults = {};
  defaults[0] = [60000,60000,15000,11000,12000];
  defaults[1] = [60000,60000,7000,9000,12000];
  for (var i = 2; i < 12; i++) defaults[i] = [60000,60000,15000,9000,12000];

  var defaultChecks = {};
  for (var j = 0; j < 12; j++) defaultChecks[j] = [false,false,false,false,false];
  for (var k = 0; k < 3; k++) defaultChecks[k] = [true,true,true,true,true];
  defaultChecks[3] = [true,false,false,false,false];

  for (var m = 0; m < 12; m++) {
    var row = m + 5;
    var a = defaults[m];
    var c = defaultChecks[m];
    savingsSheet.getRange(row, 1, 1, 11).setValues([[months[m], a[0], c[0], a[1], c[1], a[2], c[2], a[3], c[3], a[4], c[4]]]);
  }

  var checkCols = [3, 5, 7, 9, 11];
  for (var ci = 0; ci < checkCols.length; ci++) {
    savingsSheet.getRange(5, checkCols[ci], 12, 1).insertCheckboxes();
  }
  var numCols = [2, 4, 6, 8, 10];
  for (var ni = 0; ni < numCols.length; ni++) {
    savingsSheet.getRange(5, numCols[ni], 12, 1).setNumberFormat('#,##0');
  }
  savingsSheet.getRange('B1').setNumberFormat('#,##0');
  savingsSheet.getRange('B2').setNumberFormat('#,##0');
  savingsSheet.setColumnWidth(1, 120);
  for (var w = 2; w <= 11; w++) savingsSheet.setColumnWidth(w, 90);

  var budgetSheet = getOrCreateSheet(ss, BUDGET_SHEET);
  budgetSheet.clear();
  budgetSheet.getRange('A1').setValue('');
  budgetSheet.getRange('A2').setValue('{}');
  budgetSheet.getRange('A3').setValue('Row 1: Custom budget items JSON | Row 2: Check states JSON');

  SpreadsheetApp.flush();
  Logger.log('All sheets set up!');
}
