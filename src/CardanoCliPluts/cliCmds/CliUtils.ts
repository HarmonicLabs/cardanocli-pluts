import { Address, PrivateKey, PublicKey, Script, ScriptType } from "@harmoniclabs/plu-ts";
import { WithPath, withPath } from "../../utils/path/withPath";
import { CliCmd, ICliCmdConfig } from "./CliCmd";
import { readFileSync } from "fs";

export class CliUtils extends CliCmd
{
    constructor( cfg: ICliCmdConfig )
    {
        super( cfg );
    }

    readAddress(path: string): WithPath<Address>
    {
        return withPath(
            path,
            Address.fromString(
                readFileSync( path )
                .toString()
            )
        );
    }

    readPublicKey(path: string): WithPath<PublicKey>
    {
        return withPath(
            path,
            PublicKey.fromCbor(
                JSON.parse(
                    readFileSync( path )
                    .toString()
                ).cborHex
            )
        );
    }

    readPrivateKey(path: string): WithPath<PrivateKey>
    {
        return withPath(
            path,
            PrivateKey.fromCbor(
                JSON.parse(
                    readFileSync( path )
                    .toString()
                ).cborHex
            )
        );
    }

    readScript( path: string ): WithPath<Script>
    {
        const json = JSON.parse(
            readFileSync( path, { encoding: "utf-8"} )
        );

        return withPath(
            path,
            new Script(
                json.type === ScriptType.PlutusV1 || json.type === ScriptType.PlutusV2 ? json.type : ScriptType.NativeScript,
                new Uint8Array( Buffer.from( json.cborHex, "hex" ) ),
            )
        );
    }

}