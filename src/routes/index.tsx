import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, Lock, Rocket } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
    component: IndexPage,
});

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
    );
}

function IndexPage() {
    const { data: session } = authClient.useSession();

    const handleLogin = async () => {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/home",
            additionalParams: {
                hd: "vitstudent.ac.in",
                prompt: "select_account",
            },
        });
    };

    return (
        <div className="flex min-h-svh flex-col">
            <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3 md:px-8">
                <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-[0_0_18px_oklch(0.68_0.16_293/0.45)]">
                    <Rocket className="size-4" />
                </span>
                <span className="font-heading text-sm font-semibold tracking-wide">SEDS VIT Leaderboard</span>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-10">
                <Card className="glass-panel w-full max-w-md border-border/60 shadow-[0_0_60px_oklch(0.5_0.2_295/0.15)]">
                    <CardHeader className="items-center text-center">
                        <Badge className="mb-2" variant="secondary">
                            Internal · SEDS VIT Chapter
                        </Badge>
                        <CardTitle className="font-heading text-xl">Welcome to Mission Control</CardTitle>
                        <CardDescription>
                            Track points, earn recognition, and climb the chapter leaderboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {session ? (
                            <Button render={<Link to="/home" />} className="w-full" size="lg">
                                Continue to dashboard
                                <ArrowRight />
                            </Button>
                        ) : (
                            <Button onClick={handleLogin} size="lg" className="w-full">
                                <GoogleIcon />
                                Sign in with Google
                            </Button>
                        )}
                        <Alert>
                            <Lock />
                            <AlertTitle>VIT students only</AlertTitle>
                            <AlertDescription>
                                Sign in with your @vitstudent.ac.in Google account. Your chapter
                                role is assigned by the Chair.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </main>

            <footer className="border-t border-border/60 px-4 py-4 text-center text-xs text-muted-foreground md:px-8">
                SEDS VIT · Students for the Exploration and Development of Space
            </footer>
        </div>
    );
}
