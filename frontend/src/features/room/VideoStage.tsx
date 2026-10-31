import { useLayoutEffect, useRef, useState } from "react";
import { computeGridLayout } from "./gridLayout";
import type { TileModel } from "./types";
import { VideoTile } from "./VideoTile";
import styles from "./VideoStage.module.css";

const GAP = 12;

function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(([entry]) => {
            if (entry) {
                const { width, height } = entry.contentRect;
                setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
            }
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return [ref, size] as const;
}

/**
 * Grid when everyone is a face; spotlight + filmstrip when someone presents.
 * Tile size is computed from the real available area, so tiles are as large
 * as possible at any window size and participant count.
 */
export function VideoStage({ tiles }: { tiles: TileModel[] }) {
    const [ref, size] = useElementSize<HTMLDivElement>();
    const presenter = tiles.find((tile) => tile.media?.screen && !tile.isLocal) ?? tiles.find((tile) => tile.media?.screen);

    if (presenter && tiles.length > 1) {
        const others = tiles.filter((tile) => tile.id !== presenter.id);

        return (
            <div className={styles.spotlightLayout} data-layout="spotlight">
                <div className={styles.spotlightMain}>
                    <VideoTile tile={presenter} variant="spotlight" />
                </div>
                <div className={styles.strip} aria-label="Other participants">
                    {others.map((tile) => (
                        <VideoTile key={tile.id} tile={tile} variant="strip" />
                    ))}
                </div>
            </div>
        );
    }

    const layout = computeGridLayout(size.width, size.height, tiles.length, { gap: GAP });

    return (
        <div ref={ref} className={styles.grid} data-layout="grid">
            {size.width > 0
                ? tiles.map((tile) => (
                    <VideoTile key={tile.id} tile={tile} width={layout.tileWidth} height={layout.tileHeight} />
                ))
                : null}
        </div>
    );
}
