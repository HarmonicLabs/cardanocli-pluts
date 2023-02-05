import { existsSync, readFileSync, writeFileSync } from "fs";
import ObjectUtils from "../ObjectUtils";
import { extractIdFromPath } from "../extractIdFromPath";
import randId from "../randId";
import { waitForFileExists } from "../waitForFileExists";
import { OrPath, WithPath, withPath } from "./withPath";
import { CborString } from "@harmoniclabs/plu-ts/dist/cbor/CborString";
import { CardanoCliPlutsBaseError } from "../../errors/ CardanoCliPlutsBaseError";

export interface PlutsClassToCbor {
    toCbor(): CborString
}

export interface PlutsClassFromCbor<T extends PlutsClassToCbor> {
    new (...anyArg: any[]): T,

    fromCbor( cborHex: string ): T
}

export interface EnsurePathDetails {
    postfix: string,
    tmpDirPath: string,
    jsonType?: string
}

export async function ensurePath<T extends PlutsClassToCbor>( 
    ctor: PlutsClassFromCbor<T>,
    maybePath: OrPath<T>,
    {
        postfix,
        tmpDirPath,
        jsonType
    }: EnsurePathDetails
): Promise<WithPath<T>>
{
    let path: string;

    // if a path is present
    if( ObjectUtils.hasOwn( maybePath, "path" ) )
    {
        // and the `OrPath` argument is not an instace of the class
        if( !(maybePath instanceof ctor) )
        {
            // parse the cbor and construct an instance
            return withPath(
                maybePath.path,
                ctor.fromCbor(
                    JSON.parse(
                        readFileSync( maybePath.path )
                        .toString("utf8")
                    ).cborHex
                )
            );
        }
    }

    // if a path is NOT present

    if( !(maybePath instanceof ctor) )
    throw new CardanoCliPlutsBaseError(
        "invalid 'maybePath' argument while calling 'ensurePath'"
    );
    
    let id: string;

    do {
        id = randId();
        path = `${tmpDirPath ?? "./.cardanocli_pluts_tmp"}/${id}_${postfix}.json`;
    } while( existsSync(path) );

    writeFileSync(
        path,
        JSON.stringify({
            "type": jsonType ?? "",
            "description": "",
            "cborHex": maybePath.toCbor().asString
        })
    );

    await waitForFileExists( path );

    return withPath(
        path,
        maybePath,
        tmpDirPath
    );
}