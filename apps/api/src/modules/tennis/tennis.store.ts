import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import type { TennisSourceSnapshot, TennisSourceStatus, TennisSyncRun, TennisTournament } from "@runacademy/shared";

interface TennisStoreData {
  sources: TennisSourceStatus[];
  entries: TennisTournament[];
  snapshots: TennisSourceSnapshot[];
  runs: TennisSyncRun[];
}

const emptyStore = (): TennisStoreData => ({
  sources: [],
  entries: [],
  snapshots: [],
  runs: []
});

function normalizeStoreData(value: unknown): TennisStoreData {
  if (!value || typeof value !== "object") {
    return emptyStore();
  }

  const record = value as Partial<TennisStoreData>;
  return {
    sources: Array.isArray(record.sources) ? record.sources : [],
    entries: Array.isArray(record.entries) ? record.entries : [],
    snapshots: Array.isArray(record.snapshots) ? record.snapshots : [],
    runs: Array.isArray(record.runs) ? record.runs : []
  };
}

export class TennisStoreService {
  private readonly storePath: string;
  private cache: TennisStoreData | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(storePath = resolve(__dirname, "../../../.local/tennis-store.json")) {
    this.storePath = storePath;
  }

  async read<T>(reader: (data: TennisStoreData) => T | Promise<T>) {
    const data = structuredClone(await this.load());
    return reader(data);
  }

  async mutate<T>(mutator: (data: TennisStoreData) => T | Promise<T>) {
    const task = this.writeQueue.then(async () => {
      const data = await this.load();
      const result = await mutator(data);
      await this.persist(data);
      return result;
    });

    this.writeQueue = task.then(
      () => undefined,
      () => undefined
    );

    return task;
  }

  private async load() {
    if (this.cache) {
      return this.cache;
    }

    if (!existsSync(this.storePath)) {
      this.cache = emptyStore();
      return this.cache;
    }

    try {
      const raw = await readFile(this.storePath, "utf8");
      this.cache = normalizeStoreData(JSON.parse(raw));
      return this.cache;
    } catch {
      this.cache = emptyStore();
      return this.cache;
    }
  }

  private async persist(data: TennisStoreData) {
    this.cache = data;
    await mkdir(resolve(this.storePath, ".."), { recursive: true });
    await writeFile(this.storePath, JSON.stringify(data, null, 2), "utf8");
  }
}
