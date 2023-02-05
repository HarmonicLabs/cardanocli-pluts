
export function extractIdFromPath( path: string ): string
{
    return path.trim().split('/').at(-1)?.split('_')[0] ?? "";
}