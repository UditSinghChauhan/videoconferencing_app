import { AppFrame } from "./AppFrame";
import type { CSSProperties } from "react";
import { CAPTURE_WIDTH, WALKTHROUGH, type WalkthroughStep } from "./content";
import { useActiveStep } from "./useActiveStep";
import styles from "./Walkthrough.module.css";

const PANE_RATIO = 10 / 16;

/**
 * Zooms the pane onto the step's crop. The recap capture is a long page, so it
 * also gets the distance to glide down to its transcript once in view.
 */
function cropStyle({ crop, image }: WalkthroughStep): CSSProperties {
    const captureHeight = (image.desktopHeight / 2560) * CAPTURE_WIDTH;
    const y = crop.y ?? 0;
    // Remaining height below the visible window, as a share of the image's own height (what translateY % uses).
    const glide = Math.max(0, (captureHeight - y - PANE_RATIO * crop.width) / captureHeight);
    return {
        width: `${(CAPTURE_WIDTH / crop.width) * 100}%`,
        left: `${(-crop.x / crop.width) * 100}%`,
        // Percentage margins resolve against the pane's width, which is what the crop is measured in.
        marginTop: `${(-y / crop.width) * 100}%`,
        ["--glide" as string]: `${(-glide * 100).toFixed(2)}%`
    };
}

/**
 * Start, Share, Recap. Text scrolls normally on the left; the sticky pane on
 * the right shows the real product state for the step in view. Below 1024 px
 * the steps stack, each with its own capture (wide on tablets, phone-size on phones).
 */
export function Walkthrough() {
    const { active, register } = useActiveStep(WALKTHROUGH.length);

    return (
        <div className={styles.layout}>
            <ol className={styles.steps}>
                {WALKTHROUGH.map((step, index) => (
                    <li
                        key={step.id}
                        ref={register(index)}
                        className={styles.step}
                        data-active={index === active || undefined}
                        aria-current={index === active ? "step" : undefined}
                    >
                        <span className={styles.number}>{index + 1}</span>
                        <h3 className={styles.title}>{step.title}</h3>
                        <p className={styles.body}>{step.body}</p>
                        <div className={styles.inlineShot} data-step={step.id}>
                            {/* Tablets get the wide capture, phones the phone-size one. */}
                            <picture>
                                <source media="(min-width: 640px)" srcSet={step.image.desktop} width={2560} height={step.image.desktopHeight} />
                                <img
                                    src={step.image.mobile}
                                    width={780}
                                    height={step.image.mobileHeight}
                                    alt={step.image.alt}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </picture>
                        </div>
                    </li>
                ))}
            </ol>

            <div className={styles.paneColumn}>
                <AppFrame address="bridgefrontend.onrender.com" className={styles.pane}>
                    <div className={styles.viewport}>
                        {WALKTHROUGH.map((step, index) => (
                            <img
                                key={step.id}
                                className={styles.paneShot}
                                style={cropStyle(step)}
                                data-step={step.id}
                                data-active={index === active || undefined}
                                src={step.image.desktop}
                                width={2560}
                                height={step.image.desktopHeight}
                                alt={step.image.alt}
                                aria-hidden={index !== active || undefined}
                                loading="lazy"
                                decoding="async"
                            />
                        ))}
                    </div>
                </AppFrame>
            </div>
        </div>
    );
}
