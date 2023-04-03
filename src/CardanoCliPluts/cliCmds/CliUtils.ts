import { Address, AddressStr, Hash28, PrivateKey, PublicKey, Script, ScriptType, Tx } from "@harmoniclabs/plu-ts";
import { WithPath, withPath } from "../../utils/path/withPath";
import { CliCmd, ICliCmdConfig } from "./CliCmd";
import { readFileSync, write } from "fs";
import { waitForFileExists } from "../../utils/waitForFileExists";
import { writeFile } from "fs/promises";

export class CliUtils extends CliCmd
{
    constructor( cfg: ICliCmdConfig )
    {
        super( cfg );
    }

    readAddress( path: string ): WithPath<Address>
    {
        return withPath(
            path,
            Address.fromString(
                readFileSync( path )
                .toString()
            )
        );
    }

    async writeAddress( address: Address | AddressStr, path: string ): Promise<void>
    {
        await writeFile( path, address.toString() );
        await waitForFileExists( path );
    }

    readPublicKey( path: string ): WithPath<PublicKey>
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

    async writePublicKey( pk: PublicKey, path: string ): Promise<void>
    {
        await writeFile(
            path,
            JSON.stringify(
                {
                    type: "PaymentVerificationKeyShelley_ed25519",
                    description: "Payment Verification Key",
                    cborHex: pk.toString()
                },
                undefined,
                4
            )
        );
        await waitForFileExists( path );
    }

    async writePublicKeyHash( pk: Hash28, path: string ): Promise<void>
    {
        await writeFile( path, pk.toString() );
        await waitForFileExists( path );
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

    async writePrivateKey( pk: PrivateKey, path: string ): Promise<void>
    {
        await writeFile(
            path,
            JSON.stringify(
                {
                    type: "PaymentSigningKeyShelley_ed25519",
                    description: "Payment Signing Key",
                    cborHex: pk.toString()
                },
                undefined,
                4
            )
        );
        await waitForFileExists( path );
    }

    readScript( path: string ): WithPath<Script>
    {
        const json = JSON.parse(
            readFileSync( path, { encoding: "utf-8" } )
        );

        return withPath(
            path,
            new Script(
                json.type === ScriptType.PlutusV1 || json.type === ScriptType.PlutusV2 ? json.type : ScriptType.NativeScript,
                new Uint8Array( Buffer.from( json.cborHex, "hex" ) ),
            )
        );
    }

    async writeScript( script: Script, path: string )
    {
        await writeFile(
            path, 
            JSON.stringify(
                script.toJson(),
                undefined,
                4
            )
        );
        await waitForFileExists( path );
    }

    readTx( path: string ): WithPath<Tx>
    {
        const json = JSON.parse(
            readFileSync( path, { encoding: "utf-8" } )
        );

        return withPath(
            path,
            Tx.fromCbor( json.cborHex )
        );
    }

    async writeTx( tx: Tx, path: string )
    {
        await writeFile(
            path, 
            JSON.stringify(
                {
                    type: "Tx BabbageEra",
                    description: "",
                    cborHex: tx.toCbor().toString()
                },
                undefined,
                4
            )
        );
        await waitForFileExists( path );
    }

}