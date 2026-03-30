import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { TennisStoreService } from "./tennis.store";
import { TennisService } from "./tennis.service";
import {
  KATO_LIST_FIXTURE,
  KTA_RANKING_FIXTURE,
  KTA_RELAY_FIXTURE,
  REGIONAL_MANUAL_FIXTURE,
  SPORTS_DIARY_FIXTURE
} from "./tennis.fixtures";
import {
  parseKatoRecords,
  parseKtaRankingRecords,
  parseKtaRelayRecords,
  parseRegionalRecords,
  parseSportsDiaryRecords
} from "./tennis.connectors";

test("tennis source parsers extract representative tournaments", () => {
  assert.equal(parseKatoRecords(KATO_LIST_FIXTURE).length, 2);
  assert.equal(parseKtaRankingRecords(KTA_RANKING_FIXTURE).length, 2);
  assert.equal(parseKtaRelayRecords(KTA_RELAY_FIXTURE).length, 1);
  assert.equal(parseSportsDiaryRecords(SPORTS_DIARY_FIXTURE).length, 2);
  assert.equal(parseRegionalRecords(REGIONAL_MANUAL_FIXTURE).length, 2);
});

test("TennisService syncs fixture-backed sources, dedupes tournaments, and builds review queue", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "tennis-service-"));
  const storePath = join(tempDir, "tennis-store.json");
  const store = new TennisStoreService(storePath);
  const service = new TennisService(store);

  try {
    const synced = await service.syncAll();
    assert.equal(synced.ok, true);

    const boardResponse = await service.getBoard();
    assert.equal(boardResponse.ok, true);
    assert.equal(boardResponse.board.sources.length, 5);
    assert.ok(boardResponse.board.tournaments.length >= 6);

    const mungyeong = boardResponse.board.tournaments.find((item) => item.name.includes("문경 오픈"));
    assert.ok(mungyeong);
    assert.equal(mungyeong?.sourceRefs.length, 2);

    const openOnly = await service.listTournaments({ status: "registration_open" });
    assert.ok(openOnly.tournaments.every((item) => item.status === "registration_open"));

    const beginnerOnly = await service.listTournaments({ level: "beginner" });
    assert.ok(beginnerOnly.tournaments.some((item) => item.name.includes("루키")));

    const sources = await service.getSources();
    assert.equal(sources.sources.length, 5);
    assert.ok(sources.sources.some((item) => item.lastMode === "manual_seed"));
    assert.ok(boardResponse.board.reviewQueue.some((item) => item.kind === "duplicate_merge"));
    assert.ok(boardResponse.board.reviewQueue.some((item) => item.kind === "missing_fee"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
