import { AppFrame } from "./AppFrame";
import { WALKTHROUGH } from "./content";
import { useActiveStep } from "./useActiveStep";
import styles from "./Walkthrough.module.css";

/**
 * Start, Share, Recap. Text scrolls normally on the left; the sticky pane on
 * the right shows the real product state for the step in view. Under 640 px
 * each step carries its own phone-size capture instead.
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
                            <img
                                src={step.image.mobile}
                                width={780}
                                height={step.image.mobileHeight}
                                alt={step.image.alt}
                                loading="lazy"
                                decoding="async"
                            />
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
