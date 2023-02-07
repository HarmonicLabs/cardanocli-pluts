import { CliCmd, ICliCmdConfig } from "../CliCmd";
import { Address, AddressStr, ProtocolParamters, TxOutRef, UTxO } from "@harmoniclabs/plu-ts";
import { WithPath, withPath } from "../../../utils/path/withPath";
import randId from "../../../utils/randId";
import { exec } from "../../../utils/node_promises";
import { waitForFileExists } from "../../../utils/waitForFileExists";
import { existsSync, readFileSync, writeFile, writeFileSync } from "node:fs";
import ObjectUtils from "../../../utils/ObjectUtils";
import { parseUtxoOutput } from "./parseUtxoOutput";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

export type QueryByTxOutRefFilter = (TxOutRef | `${string}#${number}`);
export type QueryByAddressFilter = (Address | AddressStr);

export type QueryUTxOArgs = {
    address: QueryByAddressFilter
} | {
    addresses: QueryByAddressFilter[]
} | {
    byTxOutRef: QueryByTxOutRefFilter[]
} | {
    /**
     * @deprecated
     * **returns all the utxos of the network**
     * 
     * ## use only on small private networks
     */
    allUTxOs: boolean
}

export class CliQueryCmd extends CliCmd
{
    constructor( cfg: ICliCmdConfig )
    {
        super( cfg );
    }

    protocolParametersSync(): ProtocolParamters
    {
        return JSON.parse(
            execSync(
                `${this.cfg.cliPath} query protocol-parameters \
                --${this.cfg.network} \
                `,
                { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
            ).toString()
        );
    }

    async protocolParameters(): Promise<WithPath<ProtocolParamters>>
    {

        const pps = execSync(
            `${this.cfg.cliPath} query protocol-parameters \
            --${this.cfg.network} \
            `,
            { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
        );

        const ppsStr = pps.toString("utf-8");

        const ppPath = `${this.cfg.tmpDirPath}/${
            createHash( "sha256" )
            .update( pps )
            .digest("hex")
        }_protocol_params.json`;

        if( !existsSync(ppPath) )
        {
            writeFile( ppPath, ppsStr, () => {} );
    
            await waitForFileExists( ppPath, 5000 );
        }

        return withPath( ppPath, JSON.parse( ppsStr ) );
    }

    async utxo( args: QueryUTxOArgs): Promise<UTxO[]>
    {
        if( ObjectUtils.hasOwn( args, "allUTxOs" ) )
        {
            if( args.allUTxOs !== true )
            return [];

            return parseUtxoOutput(
                (await exec(
                    `${this.cfg.cliPath} query utxo \
                    --${this.cfg.network} \
                    --whole-utxo
                    `,
                    { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
                )).stdout,
                Address.fake
            );
        }
        if( ObjectUtils.hasOwn( args, "byTxOutRef" ) )
        {
            return parseUtxoOutput(
                (await 
                    exec(
                        `${this.cfg.cliPath} query utxo \
                        --${this.cfg.network} \
                        ${(args.byTxOutRef as QueryByTxOutRefFilter[])
                            .map( byRef =>
                                "--tx-in" + (
                                    typeof byRef === "string" ? 
                                    byRef :
                                    byRef.toString() 
                                )
                            ).join(' ')
                        } `,
                        { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
                    )
                ).stdout,
                Address.fake
            );
        }
        if( ObjectUtils.hasOwn( args, "addresses" ) )
        {
            return (await Promise.all(
                (args.addresses as QueryByAddressFilter[])
                .map( async byAddr =>
                    parseUtxoOutput(
                        (await exec(
                            `${this.cfg.cliPath} query utxo \
                            --${this.cfg.network} \
                            --address ${
                                typeof byAddr === "string" ?
                                byAddr : 
                                byAddr.toString()
                            }
                            `,
                            { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
                        )).stdout,
                        typeof byAddr === "string" ? Address.fromString( byAddr ) : byAddr
                    )
                )
            ))
            .reduce( (accum, utxos) => accum.concat( utxos ) );
        }
        if( ObjectUtils.hasOwn( args, "address" ) )
        {
            return parseUtxoOutput(
                (await exec(
                    `${this.cfg.cliPath} query utxo \
                    --${this.cfg.network} \
                    --address ${args.address.toString()}
                    `,
                    { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
                )).stdout,
                typeof args.address === "string" ? Address.fromString( args.address ) : args.address
            )
        }

        throw new CardanoCliPlutsBaseError(
            "unkown arguments to pass to 'cardano-cli query utxo'"
        );
    }
}