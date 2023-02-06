import { Address, PrivateKey, PublicKey } from "@harmoniclabs/plu-ts";
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

}