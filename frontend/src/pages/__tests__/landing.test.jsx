import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../landing";

describe("LandingPage", () => {
    it("renders the updated product messaging", () => {
        render(
            <MemoryRouter>
                <LandingPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/professional video collaboration/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /launch workspace/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /join as guest/i })).toBeInTheDocument();
    });
});
