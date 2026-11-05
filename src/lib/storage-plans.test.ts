import { describe, expect, it } from "vitest";
import { getStoragePlan, hasStorageRoom, usagePercent } from "./storage-plans";

const GB = 1024 ** 3;

describe("storage plans", () => {
  it("free plan gives 2 GB", () => {
    expect(getStoragePlan("free").quotaBytes).toBe(2 * GB);
  });

  it("paid plans map to 50 GB, 250 GB and 1 TB", () => {
    expect(getStoragePlan("creator").quotaBytes).toBe(50 * GB);
    expect(getStoragePlan("studio").quotaBytes).toBe(250 * GB);
    expect(getStoragePlan("business").quotaBytes).toBe(1024 * GB);
  });

  it("unknown plans fall back to free", () => {
    expect(getStoragePlan("gold").id).toBe("free");
  });

  it("blocks saving when the quota would be exceeded", () => {
    expect(hasStorageRoom(2 * GB - 10, 2 * GB, 5)).toBe(true);
    expect(hasStorageRoom(2 * GB - 10, 2 * GB, 20)).toBe(false);
  });

  it("caps usage at 100 percent", () => {
    expect(usagePercent(3 * GB, 2 * GB)).toBe(100);
    expect(usagePercent(1 * GB, 2 * GB)).toBe(50);
  });
});
