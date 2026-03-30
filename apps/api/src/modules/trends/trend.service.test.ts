import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { SourcingStoreService } from "../sourcing/sourcing.store";
import { TrendService } from "./trend.service";
import type { TrendKeywordSnapshot, TrendProfile } from "@runacademy/shared";

test("TrendService backfills missing periods, retries failures, and syncs sheets", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "trend-service-"));
  const storePath = join(tempDir, "store.json");
  const attempts = new Map<string, number>();
  const syncCalls: Array<{ profileId: string; snapshotCount: number }> = [];
  const store = new SourcingStoreService(undefined, {
    storePath
  });

  const service = new TrendService(store, {
    naverClient: {
      async fetchCategoryChildren() {
        return [];
      },
      async collectMonthlyRanks({ period }) {
        attempts.set(period, (attempts.get(period) ?? 0) + 1);

        if (period === "2026-02" && attempts.get(period) === 1) {
          throw new Error("temporary naver failure");
        }

        return Array.from({ length: 500 }, (_, index) => ({
          rank: index + 1,
          keyword: `${period}-keyword-${index + 1}`,
          linkId: `${period}-keyword-${index + 1}`
        }));
      }
    },
    sheetsSync: {
      async syncProfile(profile, snapshots) {
        syncCalls.push({
          profileId: profile.id,
          snapshotCount: snapshots.length
        });

        return {
          sheetUrl: `https://docs.google.com/spreadsheets/d/${profile.spreadsheetId}`
        };
      }
    }
  });

  try {
    const created = await service.createProfile({
      name: "테스트 프로필",
      categoryCid: 50000000,
      categoryPath: "패션의류",
      categoryDepth: 1,
      timeUnit: "month",
      devices: ["mo"],
      genders: ["f"],
      ages: ["40"],
      spreadsheetId: "sheet-123"
    });

    assert.equal(created.ok, true);

    const profileId = created.ok ? created.profile.id : "";
    await store.mutate((data) => {
      const profile = data.trendProfiles.find((item) => item.id === profileId) as TrendProfile;
      profile.startPeriod = "2026-01";
      profile.endPeriod = "2026-02";
      profile.updatedAt = profile.createdAt;
    });

    const queued = await service.startBackfill(profileId);
    assert.equal(queued.ok, true);
    if (!queued.ok) {
      return;
    }

    assert.equal(queued.run.totalTasks, 2);

    const firstTask = await service.processNextQueuedRun();
    assert.equal(firstTask.ok, true);

    const secondTask = await service.processNextQueuedRun();
    assert.equal(secondTask.ok, false);

    const failedRun = await service.getRun(queued.run.id);
    assert.equal(failedRun.ok, true);
    if (!failedRun.ok) {
      return;
    }
    assert.equal(failedRun.run.status, "failed");
    assert.equal(failedRun.run.failedTasks, 1);

    const retried = await service.retryFailures(queued.run.id);
    assert.equal(retried.ok, true);

    const finalTask = await service.processNextQueuedRun();
    assert.equal(finalTask.ok, true);

    const completedRun = await service.getRun(queued.run.id);
    assert.equal(completedRun.ok, true);
    if (!completedRun.ok) {
      return;
    }

    assert.equal(completedRun.run.status, "completed");
    assert.equal(completedRun.run.completedTasks, 2);
    assert.equal(completedRun.run.failedTasks, 0);
    assert.equal(syncCalls.length, 1);
    assert.equal(syncCalls[0]?.snapshotCount, 1000);

    const persisted = await store.read((data) => ({
      profile: data.trendProfiles.find((item) => item.id === profileId),
      snapshots: data.trendSnapshots.filter((snapshot) => snapshot.profileId === profileId)
    }));

    assert.equal(persisted.profile?.syncStatus, "synced");
    assert.equal((persisted.snapshots as TrendKeywordSnapshot[]).length, 1000);
    assert.equal(persisted.profile?.lastCollectedPeriod, "2026-02");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
