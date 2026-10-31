import { describe, expect, test } from "vitest";
import { computeGridLayout } from "./gridLayout";

describe("computeGridLayout", () => {
    test("a single tile fills the width of a wide area", () => {
        const layout = computeGridLayout(1600, 900, 1, { gap: 0 });
        expect(layout).toMatchObject({ columns: 1, rows: 1, tileWidth: 1600, tileHeight: 900 });
    });

    test("two people side by side on a landscape screen", () => {
        expect(computeGridLayout(1600, 900, 2).columns).toBe(2);
    });

    test("two people stacked on a portrait phone", () => {
        expect(computeGridLayout(390, 760, 2).columns).toBe(1);
    });

    test("four people form a 2x2 grid in a 16:9 area", () => {
        expect(computeGridLayout(1600, 900, 4)).toMatchObject({ columns: 2, rows: 2 });
    });

    test("tiles never exceed the container", () => {
        for (let count = 1; count <= 12; count += 1) {
            const layout = computeGridLayout(1200, 700, count, { gap: 12 });
            expect(layout.columns * layout.tileWidth + (layout.columns - 1) * 12).toBeLessThanOrEqual(1200);
            expect(layout.rows * layout.tileHeight + (layout.rows - 1) * 12).toBeLessThanOrEqual(700);
        }
    });

    test("degenerate input returns an empty layout", () => {
        expect(computeGridLayout(0, 500, 3).tileWidth).toBe(0);
        expect(computeGridLayout(500, 500, 0).tileWidth).toBe(0);
    });
});
