const { toUtcMidnight, buildDateFilter } = require("../src/lib/dateRange");

describe("toUtcMidnight", () => {
  it("normalises an ISO date string to UTC midnight", () => {
    expect(toUtcMidnight("2026-08-31").toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("strips the time from a Date that carries one", () => {
    expect(toUtcMidnight(new Date("2026-08-31T18:45:00.000Z")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });
});

describe("buildDateFilter", () => {
  it("returns an empty filter when neither bound is given", () => {
    expect(buildDateFilter({})).toEqual({});
  });

  it("includes the whole of the `to` day", () => {
    const filter = buildDateFilter({ from: "2026-08-01", to: "2026-08-31" });
    expect(filter.date.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(filter.date.$lte.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("accepts an open-ended range", () => {
    const filter = buildDateFilter({ from: "2026-08-01" });
    expect(filter.date.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(filter.date.$lte).toBeUndefined();
  });

  it("filters on the named field when one is given", () => {
    const filter = buildDateFilter({ from: "2026-08-01" }, "soldAt");
    expect(filter.soldAt.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});
