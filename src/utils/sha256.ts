import { Buffer } from "buffer";
import { createHash } from "crypto";

export function sha256( data: Buffer | string ): string
{
    return createHash( "sha256" )
    .update(
        Buffer.isBuffer( data ) ? data : Buffer.from( data, "hex" )
    )
    .digest("hex");
}