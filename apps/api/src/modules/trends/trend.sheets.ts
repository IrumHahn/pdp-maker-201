import { google } from "googleapis";
import { buildTrendSheetUrl, normalizeTrendSpreadsheetId, type TrendKeywordSnapshot, type TrendProfile } from "@runacademy/shared";
import { buildTrendSheetTabs } from "./trend.utils";

export interface TrendSheetsSyncResult {
  sheetUrl: string;
}

export interface TrendSheetsSyncGateway {
  syncProfile(profile: TrendProfile, snapshots: TrendKeywordSnapshot[]): Promise<TrendSheetsSyncResult>;
}

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

export class TrendSheetsSyncService implements TrendSheetsSyncGateway {
  async syncProfile(profile: TrendProfile, snapshots: TrendKeywordSnapshot[]) {
    const credentials = readServiceAccountCredentials();
    const auth = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      scopes: SHEETS_SCOPE
    });

    const sheets = google.sheets({
      version: "v4",
      auth
    });

    const spreadsheetId = normalizeTrendSpreadsheetId(profile.spreadsheetId);
    const tabs = buildTrendSheetTabs(profile, snapshots);
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId
    });
    const existingTitles = new Set(
      (spreadsheet.data.sheets ?? [])
        .map((sheet) => sheet.properties?.title)
        .filter((value): value is string => Boolean(value))
    );

    const addRequests = tabs
      .filter((tab) => !existingTitles.has(tab.title))
      .map((tab) => ({
        addSheet: {
          properties: {
            title: tab.title
          }
        }
      }));

    if (addRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: addRequests
        }
      });
    }

    for (const tab of tabs) {
      const range = `${tab.title}!A1:ZZ`;
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab.title}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: tab.rows
        }
      });
    }

    return {
      sheetUrl: buildTrendSheetUrl(spreadsheetId)
    };
  }
}

function readServiceAccountCredentials() {
  const clientEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL 과 GOOGLE_SHEETS_PRIVATE_KEY 환경변수가 필요합니다.");
  }

  return {
    clientEmail,
    privateKey
  };
}
