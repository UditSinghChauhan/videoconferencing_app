import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, MonitorSmartphone } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import styles from "./AppHeader.module.css";

export function AppHeader() {
    const { user, signOut, signOutEverywhere } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const onPointer = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
            }
        };

        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [menuOpen]);

    const handleSignOut = async (everywhere: boolean) => {
        setMenuOpen(false);
        await (everywhere ? signOutEverywhere() : signOut());
        navigate("/auth", { replace: true });
    };

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Logo to="/home" />
                <nav className={styles.nav} aria-label="Main">
                    <NavLink to="/home" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                        Meetings
                    </NavLink>
                    <NavLink to="/history" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                        History
                    </NavLink>
                </nav>
                {user ? (
                    <div className={styles.account} ref={menuRef}>
                        <button
                            type="button"
                            className={styles.accountButton}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((open) => !open)}
                        >
                            <Avatar name={user.name || user.username} size={28} />
                            <span className={styles.accountName}>{user.name || user.username}</span>
                            <ChevronDown size={16} aria-hidden="true" />
                        </button>
                        {menuOpen ? (
                            <div className={styles.menu} role="menu">
                                <div className={styles.menuIdentity}>
                                    <strong>{user.name}</strong>
                                    <span>@{user.username}</span>
                                </div>
                                <button type="button" role="menuitem" onClick={() => handleSignOut(false)}>
                                    <LogOut size={16} aria-hidden="true" /> Sign out
                                </button>
                                <button type="button" role="menuitem" onClick={() => handleSignOut(true)}>
                                    <MonitorSmartphone size={16} aria-hidden="true" /> Sign out of all devices
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </header>
    );
}
