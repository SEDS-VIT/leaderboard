import { db } from '#/db';
import { user } from '#/db/schema';
import { requireAccess } from '#/lib/auth.functions'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';

export type UpdateUserDataInput = {
    id: string;
    fullName?: string | null;
    registrationNumber?: string | null;
    accessLevel?: number;
    isBanned?: boolean;
};

const getUserData = createServerFn()
.handler(async () => {
    
})

const updateUserData = createServerFn()
    .validator((data: UpdateUserDataInput) => data)
    .handler(async ({ data }) => {

        const { id, ...rawUpdates } = data;

        // Filter out undefined keys so Drizzle only modifies targeted fields
        const updates = Object.fromEntries(
            Object.entries(rawUpdates).filter(([_, value]) => value !== undefined)
        );

        if (Object.keys(updates).length === 0) {
            throw new Error("At least one field to update must be provided.");
        }

        await db
            .update(user)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id))


    });


export const Route = createFileRoute('/_protected/hrDashboard')({
    beforeLoad: requireAccess(3),
    component: RouteComponent,
})

//TODO: Edit any details of each user (including banning and unbanning) and add reasons
function RouteComponent() {

    return <div>Hello "/_protected/users"!</div>
}
