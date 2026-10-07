import { QueryClient } from '@tanstack/react-query'

export function getContext() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                // Keep SSR-dehydrated data fresh on hydration instead of
                // refetching immediately; mutations invalidate explicitly.
                staleTime: 60_000,
            },
        },
    })

    return {
        queryClient,
    }
}
export default function TanstackQueryProvider() { }

