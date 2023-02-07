
export default function randId(): string
{
    return Math.round(Number.MAX_SAFE_INTEGER * Math.random()).toString(32);
}