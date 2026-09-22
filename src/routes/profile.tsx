import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Mail, Shield } from "lucide-react";
import { getSession } from "@/lib/auth.functions";
import { authClient } from "@/lib/auth-client";
import { initials, roleLabel } from "@/lib/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/profile")({
    beforeLoad: async () => {
        const session = await getSession();
        if (!session) {
            throw redirect({ to: "/" });
        }
        return { user: session.user };
    },
    component: ProfilePage,
});

function ProfilePage() {
    const { user } = Route.useRouteContext();
    const router = useRouter();
    const displayName = user.fullName ?? user.name;

    const handleLogout = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.navigate({ to: "/" });
                },
            },
        });
    };

    return (
        <div className="min-h-svh">
            <header className="flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl md:px-8">
                <Button render={<Link to="/home" />} variant="ghost" size="sm">
                    <ArrowLeft />
                    Back to leaderboard
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut />
                    Sign out
                </Button>
            </header>
            <main className="mx-auto max-w-lg p-4 md:p-8">
                <Card>
                    <CardHeader className="items-center text-center">
                        <Avatar size="lg" className="size-16 text-lg">
                            <AvatarImage src={user.image ?? undefined} alt={displayName} />
                            <AvatarFallback>{initials(displayName)}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-xl">{displayName}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5">
                            <Mail className="size-3.5" />
                            {user.email}
                        </CardDescription>
                        <Badge variant={user.accessLevel && user.accessLevel >= 2 ? "default" : "secondary"}>
                            {roleLabel(user.accessLevel)}
                        </Badge>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <Separator />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Registration No.</p>
                                <p className="font-medium">{user.registrationNumber ?? "—"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Points</p>
                                <p className="font-medium">{user.points ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="flex items-center gap-1.5 font-medium">
                                    <Shield className="size-3.5 text-primary" />
                                    Active
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
