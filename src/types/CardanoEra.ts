
export type CardanoEra
    = "byron"
    | "shelley"
    | "allegra"
    | "mary"
    | "alonzo"
    | "babbage"


export function isCardanoEra( s: string ): s is CardanoEra
{
    return (
        s === "byron"   ||
        s === "shelley" ||
        s === "allegra" ||
        s === "mary"    ||
        s === "alonzo"  ||
        s === "babbage"
    );
}