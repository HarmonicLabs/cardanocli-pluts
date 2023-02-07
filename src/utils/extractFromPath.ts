
export function extractIdFromPath( path: string, onUndef: () => string = () => "" ): string
{
    return path.trim().split('/').at(-1)?.split('_')[0] ?? onUndef();
}

export function extractExtensionFromPath( path: string ): string
{
    return path.trim().split('.').at(-1) ?? "";
}