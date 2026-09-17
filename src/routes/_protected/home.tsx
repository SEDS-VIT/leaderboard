import { createFileRoute, useRouter } from "@tanstack/react-router";
import { requireAccess } from '#/lib/auth.functions'
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute('/_protected/home')({
    beforeLoad: requireAccess(0),
    component: RouteComponent,
})

//TODO: Contains links to log and shows the leaderboards

function RouteComponent() {
    const { user } = Route.useRouteContext();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    // Push the user back to the login page immediately after sign out
                    router.navigate({ to: "/" });
                },
            },
        });
    };

    return (
        <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
            <h1 style={{ borderBottom: "1px solid #ccc", paddingBottom: "0.5rem" }}>
                Student Profile
            </h1>

            <div style={{ margin: "1.5rem 0", lineHeight: "1.8" }}>
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Access Level:</strong> {user.accessLevel}</p>
            </div>
            <div style={{ margin: "1.5rem 0", lineHeight: "1.8" }}>

                <a href="/home">home</a><br></br>
                <a href="/logs">logs</a><br></br>
                <a href="/pointVerify">pointVerify</a><br></br>
                <a href="/points">points</a><br></br>
                <a href="/sudo">sudo</a><br></br>
                <a href="/trueLogs">trueLogs</a><br></br>
                <a href="/users">users</a>

            </div>

            <button
                onClick={handleLogout}
                style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontWeight: "bold",
                    cursor: "pointer"
                }}
            >
                Sign Out
            </button>
        </main>
    );

}
