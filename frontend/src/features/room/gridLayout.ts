export interface GridLayout {
    columns: number;
    rows: number;
    tileWidth: number;
    tileHeight: number;
}

/**
 * Chooses the column count that gives the largest tiles of a fixed aspect
 * ratio inside the available area. Brute force is fine: count is small.
 */
export const computeGridLayout = (
    width: number,
    height: number,
    count: number,
    { aspectRatio = 16 / 9, gap = 12 }: { aspectRatio?: number; gap?: number } = {}
): GridLayout => {
    if (count <= 0 || width <= 0 || height <= 0) {
        return { columns: 1, rows: 1, tileWidth: 0, tileHeight: 0 };
    }

    let best: GridLayout = { columns: 1, rows: count, tileWidth: 0, tileHeight: 0 };

    for (let columns = 1; columns <= count; columns += 1) {
        const rows = Math.ceil(count / columns);
        const maxWidth = (width - gap * (columns - 1)) / columns;
        const maxHeight = (height - gap * (rows - 1)) / rows;

        if (maxWidth <= 0 || maxHeight <= 0) {
            continue;
        }

        const tileWidth = Math.min(maxWidth, maxHeight * aspectRatio);
        const tileHeight = tileWidth / aspectRatio;

        if (tileWidth > best.tileWidth) {
            best = { columns, rows, tileWidth: Math.floor(tileWidth), tileHeight: Math.floor(tileHeight) };
        }
    }

    return best;
};
