import { existsSync, readFileSync, writeFileSync } from "fs";
import ObjectUtils from "../ObjectUtils";
import { waitForFileExists } from "../waitForFileExists";
import { OrPath, WithPath, withPath } from "./withPath";
import { CardanoCliPlutsBaseError } from "../../errors/ CardanoCliPlutsBaseError";
import { CborString, Script } from "@harmoniclabs/plu-ts";
import { createHash } from "crypto";

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
    jsonType?: string,
    description?: string
}

export async function ensurePath<T extends PlutsClassToCbor>( 
    ctor: PlutsClassFromCbor<T>,
    maybePath: OrPath<T>,
    {
        postfix,
        tmpDirPath,
        jsonType,
        description
    }: EnsurePathDetails
): Promise<WithPath<T>>
{
    if( ctor as any === Script ) return ensurePathScript(
        maybePath as any,
        {
            postfix,
            tmpDirPath
        }
    ) as any;
    
    // if a path is present
    if( ObjectUtils.hasOwn( maybePath, "path" ) )
    {
        // and the `OrPath` argument is not an instace of the class
        // hence only the path is present
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

        // everything ok
        return maybePath;
    }

    // if a path is NOT present

    if( !(maybePath instanceof ctor) )
    throw new CardanoCliPlutsBaseError(
        "invalid 'maybePath' argument while calling 'ensurePath'"
    );

    const cborStr = maybePath.toCbor() ;

    const path = `${tmpDirPath}/${
        createHash( "sha256" )
        .update( cborStr.toBuffer() )
        .digest("hex")
    }_${postfix}.json`;

    if( !existsSync(path) )
    {
        writeFileSync(
            path,
            JSON.stringify({
                "type": jsonType ?? "",
                "description": description ?? "",
                "cborHex": cborStr.asString
            })
        );
    
        await waitForFileExists( path );
    }

    return withPath(
        path,
        maybePath,
        tmpDirPath
    );
}

export async function ensurePathScript( 
    maybePath: OrPath<Script>,
    {
        postfix,
        tmpDirPath
    }: EnsurePathDetails
): Promise<WithPath<Script>>
{

    // if a path is present
    if( ObjectUtils.hasOwn( maybePath, "path" ) )
    {
        // and the `OrPath` argument is not an instace of the class
        // hence only the path is present
        if( !(maybePath instanceof Script) )
        {
            // parse the cbor and construct an instance
            return withPath(
                maybePath.path,
                Script.fromJson(
                    JSON.parse(
                        readFileSync( maybePath.path )
                        .toString("utf8")
                    )
                )
            );
        }

        // everything ok
        return maybePath;
    }

    // if a path is NOT present

    if( !(maybePath instanceof Script) )
    throw new CardanoCliPlutsBaseError(
        "invalid 'maybePath' argument while calling 'ensurePathScript'"
    );
    
    const path = `${tmpDirPath}/${maybePath.hash.asString}_${postfix}.json`;

    if( !existsSync(path) )
    {
        writeFileSync(
            path,
            JSON.stringify(
                maybePath.toJson()
            )
        );
    
        await waitForFileExists( path );
    }

    return withPath(
        path,
        maybePath,
        tmpDirPath
    );
}