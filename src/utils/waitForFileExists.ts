import { existsSync } from "node:fs";
import { sleep } from "./sleep"
import { CardanoCliPlutsBaseError } from "../errors/ CardanoCliPlutsBaseError";

export async function waitForFileExists( path: string, timeout = 2000 ): Promise<void>
{
    async function _waitForFileExists( path: string, timeout: number, currentTime: number ): Promise<void>
    {
        if( existsSync( path ) ) return;
        if( currentTime >= timeout )
        throw new CardanoCliPlutsBaseError(
            "couldn't find '" + path + "' in " + timeout / 1000 + "s" 
        );

        await sleep( 100 );

        return await _waitForFileExists( path, currentTime + 100, timeout);
    }

    const _timeout = Number( timeout );

    return await _waitForFileExists(
        path,
        Math.round(Math.abs(
            Number.isSafeInteger( _timeout ) ? _timeout : 2000
        )), 
        0
    );
}