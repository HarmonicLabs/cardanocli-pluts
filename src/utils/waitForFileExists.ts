import { existsSync } from "node:fs";
import { sleep } from "./sleep"
import { CardanoCliPlutsBaseError } from "../errors/ CardanoCliPlutsBaseError";

export async function waitForFileExists( path: string, timeout = 5000 ): Promise<void>
{
    const t = Number( timeout );
    const _timeout =  Math.round(Math.abs(
        Number.isSafeInteger( t ) ? t : 5000
    ));

    async function _waitForFileExists( path: string, currentTime: number ): Promise<void>
    {
        if( existsSync( path ) ) return;
        if( currentTime >= _timeout )
        throw new CardanoCliPlutsBaseError(
            "couldn't find '" + path + "' in " + timeout / 1000 + " seconds" 
        );

        await sleep( 100 );

        return await _waitForFileExists( path, currentTime + 100 );
    }

    return await _waitForFileExists(
        path,
        0
    );
}