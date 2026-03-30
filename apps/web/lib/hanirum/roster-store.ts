import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import type { AttendeeRecord, CheckInMode, CheckInResponse, CheckInState, PublicAttendee } from "./types";

interface HeaderIndexes {
  name: number;
  email: number;
  phone: number;
  dinner: number;
  attendance: number;
}

interface StoreLoadResult {
  mode: CheckInMode;
  attendees: AttendeeRecord[];
}

interface SheetConfig {
  spreadsheetId: string;
  worksheetName?: string;
  serviceAccountEmail: string;
  privateKey: string;
}

const GOOGLE_SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

const headerAliases = {
  name: ["성명", "이름", "name"],
  email: ["이메일", "email", "e-mail"],
  phone: ["연락처", "전화번호", "휴대폰", "phone", "mobile"],
  dinner: ["저녁식사 참석", "저녁 식사 참석", "디너 참석", "저녁참석", "dinner"],
  attendance: ["출석 체크", "출석체크", "출석", "checkin", "check in"]
} as const;

const demoSeed: AttendeeRecord[] = [
  { id: "demo-1", rowIndex: 2, name: "김하늘", email: "sky@example.com", phone: "010-1111-1111", dinner: true, checkInStatus: "", checkedIn: false },
  { id: "demo-2", rowIndex: 3, name: "박서준", email: "jun@example.com", phone: "010-2222-2222", dinner: false, checkInStatus: "", checkedIn: false },
  { id: "demo-3", rowIndex: 4, name: "이수민", email: "sumin@example.com", phone: "010-3333-3333", dinner: true, checkInStatus: "체크완료", checkedIn: true },
  { id: "demo-4", rowIndex: 5, name: "정유진", email: "yujin@example.com", phone: "010-4444-4444", dinner: false, checkInStatus: "", checkedIn: false },
  { id: "demo-5", rowIndex: 6, name: "최민호", email: "minho@example.com", phone: "010-5555-5555", dinner: true, checkInStatus: "체크완료", checkedIn: true }
];

let worksheetTitleCache: string | null = null;
let demoRoster = demoSeed.map(cloneAttendee);

function cloneAttendee(attendee: AttendeeRecord) {
  return { ...attendee };
}

function getSheetConfig(): SheetConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const serviceAccountEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim();

  if (!spreadsheetId || !serviceAccountEmail || !rawPrivateKey) {
    return null;
  }

  return {
    spreadsheetId,
    worksheetName: process.env.GOOGLE_SHEETS_WORKSHEET_NAME?.trim() || undefined,
    serviceAccountEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n")
  };
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function isTruthyDinner(value: string) {
  const normalized = value.replace(/\s+/g, "").trim().toLowerCase();

  return ["y", "yes", "true", "1", "o", "참석", "예", "네", "신청", "먹음"].includes(normalized);
}

function isCheckedIn(value: string) {
  const normalized = value.replace(/\s+/g, "").trim().toLowerCase();

  return ["체크완료", "완료", "checked", "checkedin", "done", "yes", "y", "true"].includes(normalized);
}

function toPublicAttendee(attendee: AttendeeRecord): PublicAttendee {
  return {
    id: attendee.id,
    name: attendee.name,
    dinner: attendee.dinner,
    checkedIn: attendee.checkedIn
  };
}

function buildId(name: string, rowIndex: number) {
  const slug = normalizeName(name) || `guest-${rowIndex}`;

  return `${slug}-${rowIndex}`;
}

function requireHeaderIndex(headerRow: string[], aliases: readonly string[]) {
  const normalizedHeaders = headerRow.map(normalizeHeader);

  return normalizedHeaders.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
}

function resolveHeaderIndexes(headerRow: string[]): HeaderIndexes {
  const indexes = {
    name: requireHeaderIndex(headerRow, headerAliases.name),
    email: requireHeaderIndex(headerRow, headerAliases.email),
    phone: requireHeaderIndex(headerRow, headerAliases.phone),
    dinner: requireHeaderIndex(headerRow, headerAliases.dinner),
    attendance: requireHeaderIndex(headerRow, headerAliases.attendance)
  };

  const missing = Object.entries(indexes)
    .filter(([, value]) => value < 0)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`구글 시트 헤더를 찾지 못했습니다: ${missing.join(", ")}`);
  }

  return indexes;
}

function columnNumberToLetter(columnNumber: number) {
  let quotient = columnNumber;
  let label = "";

  while (quotient > 0) {
    const remainder = (quotient - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    quotient = Math.floor((quotient - 1) / 26);
  }

  return label;
}

async function getSheetsClient(config: SheetConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.serviceAccountEmail,
      private_key: config.privateKey
    },
    scopes: GOOGLE_SHEETS_SCOPE
  });

  return google.sheets({
    version: "v4",
    auth
  });
}

async function resolveWorksheetTitle(client: sheets_v4.Sheets, config: SheetConfig) {
  if (config.worksheetName) {
    return config.worksheetName;
  }

  if (worksheetTitleCache) {
    return worksheetTitleCache;
  }

  const response = await client.spreadsheets.get({
    spreadsheetId: config.spreadsheetId,
    fields: "sheets(properties(title))"
  });

  const title = response.data.sheets?.[0]?.properties?.title;

  if (!title) {
    throw new Error("구글 시트에서 워크시트 이름을 찾지 못했습니다.");
  }

  worksheetTitleCache = title;
  return title;
}

async function loadGoogleRoster(): Promise<StoreLoadResult & { headerIndexes: HeaderIndexes; worksheetTitle: string }> {
  const config = getSheetConfig();

  if (!config) {
    return {
      mode: "demo",
      attendees: demoRoster.map(cloneAttendee),
      headerIndexes: {
        name: 0,
        email: 1,
        phone: 2,
        dinner: 3,
        attendance: 4
      },
      worksheetTitle: "Demo"
    };
  }

  const client = await getSheetsClient(config);
  const worksheetTitle = await resolveWorksheetTitle(client, config);
  const range = `'${worksheetTitle.replace(/'/g, "''")}'!A:Z`;
  const response = await client.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range
  });
  const values = response.data.values ?? [];
  const [headerRow = [], ...rows] = values;

  if (headerRow.length === 0) {
    throw new Error("구글 시트에 헤더 행이 없습니다.");
  }

  const headerIndexes = resolveHeaderIndexes(headerRow);
  const attendees = rows
    .map((cells, index) => {
      const name = (cells[headerIndexes.name] ?? "").trim();

      if (!name) {
        return null;
      }

      const attendanceValue = (cells[headerIndexes.attendance] ?? "").trim();

      return {
        id: buildId(name, index + 2),
        rowIndex: index + 2,
        name,
        email: (cells[headerIndexes.email] ?? "").trim(),
        phone: (cells[headerIndexes.phone] ?? "").trim(),
        dinner: isTruthyDinner(cells[headerIndexes.dinner] ?? ""),
        checkInStatus: attendanceValue,
        checkedIn: isCheckedIn(attendanceValue)
      } satisfies AttendeeRecord;
    })
    .filter((attendee): attendee is AttendeeRecord => attendee !== null);

  return {
    mode: "google-sheets",
    attendees,
    headerIndexes,
    worksheetTitle
  };
}

export async function getCheckInState(joinUrl: string): Promise<CheckInState> {
  const store = await loadGoogleRoster();
  const checkedInAttendees = store.attendees.filter((attendee) => attendee.checkedIn);
  const latestGuest = checkedInAttendees.at(-1) ?? null;

  return {
    attendees: checkedInAttendees.map(toPublicAttendee),
    totalGuests: store.attendees.length,
    checkedInCount: checkedInAttendees.length,
    dinnerCount: checkedInAttendees.filter((attendee) => attendee.dinner).length,
    latestGuest: latestGuest ? toPublicAttendee(latestGuest) : null,
    serviceMode: store.mode,
    joinUrl,
    updatedAt: new Date().toISOString()
  };
}

export async function submitCheckIn(nameInput: string): Promise<CheckInResponse> {
  const normalizedInput = normalizeName(nameInput);

  if (!normalizedInput) {
    return {
      status: "not_found",
      attendee: null,
      message: "이름을 입력해 주세요.",
      serviceMode: getSheetConfig() ? "google-sheets" : "demo",
      matches: 0
    };
  }

  const store = await loadGoogleRoster();
  const matches = store.attendees.filter((attendee) => normalizeName(attendee.name) === normalizedInput);

  if (matches.length === 0) {
    return {
      status: "not_found",
      attendee: null,
      message: "명단에서 이름을 찾지 못했어요. 운영 스태프에게 문의해 주세요.",
      serviceMode: store.mode,
      matches: 0
    };
  }

  if (matches.length > 1) {
    return {
      status: "ambiguous",
      attendee: null,
      message: "동명이인이 확인되어요. 운영 스태프에게 확인 부탁드려요.",
      serviceMode: store.mode,
      matches: matches.length
    };
  }

  const attendee = matches[0];

  if (attendee.checkedIn) {
    return {
      status: "already_checked_in",
      attendee: toPublicAttendee(attendee),
      message: `${attendee.name}님은 이미 체크인 완료 상태예요.`,
      serviceMode: store.mode,
      matches: 1
    };
  }

  if (store.mode === "demo") {
    demoRoster = demoRoster.map((item) =>
      item.id === attendee.id
        ? {
            ...item,
            checkInStatus: "체크완료",
            checkedIn: true
          }
        : item
    );

    const updatedAttendee = demoRoster.find((item) => item.id === attendee.id) ?? {
      ...attendee,
      checkInStatus: "체크완료",
      checkedIn: true
    };

    return {
      status: "success",
      attendee: toPublicAttendee(updatedAttendee),
      message: `${updatedAttendee.name}님 체크인이 완료되었어요.`,
      serviceMode: "demo",
      matches: 1
    };
  }

  const config = getSheetConfig();

  if (!config) {
    throw new Error("구글 시트 설정을 찾지 못했습니다.");
  }

  const client = await getSheetsClient(config);
  const attendanceColumn = columnNumberToLetter(store.headerIndexes.attendance + 1);
  const range = `'${store.worksheetTitle.replace(/'/g, "''")}'!${attendanceColumn}${attendee.rowIndex}`;

  await client.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["체크완료"]]
    }
  });

  return {
    status: "success",
    attendee: toPublicAttendee({
      ...attendee,
      checkInStatus: "체크완료",
      checkedIn: true
    }),
    message: `${attendee.name}님 체크인이 완료되었어요.`,
    serviceMode: "google-sheets",
    matches: 1
  };
}
