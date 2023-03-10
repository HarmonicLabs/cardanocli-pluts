import { createHash } from "crypto";

export function sha256( data: string | Uint8Array ): string
{
    return createHash( "sha256" )
    .update(
        data instanceof Uint8Array ? data : new Uint8Array( Buffer.from( data, "hex" ) )
    )
    .digest("hex");
}