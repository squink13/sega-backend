import { GoogleSpreadsheet } from "google-spreadsheet";

let doc;
let sheet;

export async function initializeSheetService() {
  doc = new GoogleSpreadsheet("1H5rsFXvGaL6BAL5RT5gRhfGf5Oqnespf6G-6OxRuZ7I");
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  });
  await doc.loadInfo();
  sheet = doc.sheetsByTitle["_import"];
}

export async function getAllRows() {
  // Make sure the sheet has been initialized
  if (!sheet) {
    console.error("Google sheet not initialized. Call initializeSheetService first.");
    return [];
  }

  // Get all rows from the sheet
  const rows = await sheet.getRows();
  return rows;
}

export async function createOrUpdateSheetRow(rowData) {
  // Get all rows from the sheet
  const rows = await sheet.getRows();

  // Find the row for the user
  const row = rows.find((r) => r.ID === rowData.ID);

  if (row) {
    // If the row exists, update it
    Object.assign(row, rowData);
    await row.save();
    console.log(`Row for user ${rowData.ID} updated`);
  } else {
    // If the row doesn't exist, add a new one
    await addSheetRow(rowData);
  }
}

export async function removeSheetRow(id) {
  // Get all rows from the sheet
  const rows = await sheet.getRows();

  // Find the row for the user
  const row = rows.find((r) => r.ID === id);

  if (row) {
    // If the row exists, delete it
    await row.delete();
    console.log(`Row for user ${id} deleted`);
  } else {
    console.log(`Row for user ${id} not found`);
  }
}

export async function addSheetRow(rowData) {
  try {
    await sheet.addRow(rowData);
    console.log(`Row for user ${rowData.ID} added`);
  } catch (err) {
    console.error("Failed to add row to Google Sheet: ", err.message);
  }
}
