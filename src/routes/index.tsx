import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
    component: IndexPage,
});

function IndexPage() {
    const { data: session } = authClient.useSession();

    const handleLogin = async () => {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/profile",
            additionalParams: {
                hd: "vitstudent.ac.in",
                prompt: "select_account", // <-- Add this line
            },
        });
    };

    return (
        <div>
            <h1>Welcome to the Leaderboard</h1>
            {session ? (
                <p>Logged in as {session.user.name}</p>
            ) : (
                <button onClick={handleLogin}>Sign in with Google</button>
            )}
        </div>
    );
}
