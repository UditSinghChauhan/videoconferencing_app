import { ButtonLink } from "../components/Button";
import { StatusScreen } from "../features/room/StatusScreen";

export default function NotFoundPage() {
    return (
        <StatusScreen
            title="Page not found"
            description="The page you're looking for doesn't exist or has moved."
            actions={<ButtonLink to="/">Go to Bridge</ButtonLink>}
        />
    );
}
