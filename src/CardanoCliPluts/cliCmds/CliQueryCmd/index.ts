import { CliCmd, ICliCmdConfig } from "../CliCmd";
import { Address, AddressStr, Hash32, ProtocolParamters, Script, TxOutRef, UTxO } from "@harmoniclabs/plu-ts";
import { WithPath, withPath } from "../../../utils/path/withPath";
import { exec } from "../../../utils/node_promises";
import { waitForFileExists } from "../../../utils/waitForFileExists";
import { existsSync, writeFile } from "node:fs";
import ObjectUtils from "../../../utils/ObjectUtils";
import { parseUtxoOutput } from "./parseUtxoOutput";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { CliQueryTipResult } from "./CliQueryTipResult";

export * from "./CliQueryTipResult";

export type QueryByTxOutRefFilter = (TxOutRef | `${string}#${number}`);
export type QueryByAddressFilter = (Address | AddressStr);

export type QueryUTxOArgs = {
    address: QueryByAddressFilter
} | {
    addresses: QueryByAddressFilter[]
} | {
    byTxOutRef: QueryByTxOutRefFilter[],
    address?: Address,
    refScript?: Script
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

    tipSync(): CliQueryTipResult
    {
        const json = JSON.parse(
            execSync(
                `${this.cfg.cliPath} query tip \
                --${this.cfg.network} \
                `,
                { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
            ).toString()
        );

        return {
            block: Number( json.block ),
            epoch: Number( json.epoch ),
            era: json.era,
            hash: new Hash32( json.hash ),
            slot: Number( json.slot ),
            syncProgress: Number( json.syncProgress )
        };
    }

    async tip(): Promise<CliQueryTipResult>
    {
        const json = JSON.parse(
            (await exec(
                `${this.cfg.cliPath} query tip \
                --${this.cfg.network} \
                `,
                { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
            )).toString()
        );

        return {
            block: Number( json.block ),
            epoch: Number( json.epoch ),
            era: json.era,
            hash: new Hash32( json.hash ),
            slot: Number( json.slot ),
            syncProgress: Number( json.syncProgress )
        };
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
                                "--tx-in " + (
                                    typeof byRef === "string" ? 
                                    byRef :
                                    byRef.toString() 
                                )
                            ).join(' ')
                        } `,
                        { env: { "CARDANO_NODE_SOCKET_PATH": this.cfg.socketPath } }
                    )
                ).stdout,
                (args as any).address ?? Address.fake,
                (args as any).refScript
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