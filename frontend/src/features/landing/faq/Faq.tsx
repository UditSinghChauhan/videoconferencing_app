import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { FAQ } from "../content";
import { Reveal } from "../Reveal";
import styles from "./Faq.module.css";

/**
 * Five questions in one card. Each row is a real button with aria-expanded;
 * the answer's height animates with a grid-rows transition (0fr to 1fr), so
 * it opens smoothly without measuring. The first answer starts open.
 */
export function Faq() {
    const [open, setOpen] = useState<number | null>(0);
    const base = useId();

    return (
        <Reveal className={styles.card}>
            {FAQ.map((item, index) => {
                const expanded = open === index;
                const buttonId = `${base}-q${index}`;
                const panelId = `${base}-a${index}`;
                return (
                    <div key={item.question} className={styles.item} data-open={expanded || undefined}>
                        <h3 className={styles.question}>
                            <button
                                type="button"
                                id={buttonId}
                                aria-expanded={expanded}
                                aria-controls={panelId}
                                onClick={() => setOpen(expanded ? null : index)}
                            >
                                <span>{item.question}</span>
                                <Plus size={18} aria-hidden="true" className={styles.icon} />
                            </button>
                        </h3>
                        <div id={panelId} role="region" aria-labelledby={buttonId} className={styles.panel}>
                            <div className={styles.inner}>
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </Reveal>
    );
}
