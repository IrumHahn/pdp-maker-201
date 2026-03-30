import test from "node:test";
import assert from "node:assert/strict";
import { serializeTrendFilter } from "@runacademy/shared";
import { listMonthlyPeriods } from "@runacademy/shared";
import { mergeKeywordRankPages, type NaverKeywordRankPage } from "./trend.utils";

test("listMonthlyPeriods returns the expected monthly backfill window", () => {
  const periods = listMonthlyPeriods("2017-08", "2026-02");

  assert.equal(periods[0], "2017-08");
  assert.equal(periods.at(-1), "2026-02");
  assert.equal(periods.length, 103);
});

test("serializeTrendFilter joins multi-select filters with commas", () => {
  assert.equal(serializeTrendFilter(["pc", "mo"]), "pc,mo");
  assert.equal(serializeTrendFilter(["40", "50"]), "40,50");
  assert.equal(serializeTrendFilter([]), "");
});

test("mergeKeywordRankPages merges 25 rank pages into exactly 500 items", () => {
  const pages: NaverKeywordRankPage[] = Array.from({ length: 25 }, (_, pageIndex) => ({
    message: null,
    statusCode: 200,
    returnCode: 0,
    range: "2026.02.01. ~ 2026.02.28.",
    ranks: Array.from({ length: 20 }, (_, itemIndex) => {
      const rank = pageIndex * 20 + itemIndex + 1;

      return {
        rank,
        keyword: `keyword-${rank}`,
        linkId: `keyword-${rank}`
      };
    })
  }));

  const merged = mergeKeywordRankPages(pages);

  assert.equal(merged.length, 500);
  assert.equal(merged[0].rank, 1);
  assert.equal(merged.at(-1)?.rank, 500);
});

test("mergeKeywordRankPages rejects duplicate rank pages", () => {
  const duplicatePage: NaverKeywordRankPage = {
    message: null,
    statusCode: 200,
    returnCode: 0,
    range: "2026.02.01. ~ 2026.02.28.",
    ranks: Array.from({ length: 20 }, (_, index) => ({
      rank: index + 1,
      keyword: `keyword-${index + 1}`,
      linkId: `keyword-${index + 1}`
    }))
  };

  assert.throws(() => mergeKeywordRankPages(Array.from({ length: 25 }, () => duplicatePage)), /Duplicate ranks/);
});
