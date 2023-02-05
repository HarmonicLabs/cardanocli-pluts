import { Network, NetworkT } from "@harmoniclabs/plu-ts"
import { CardanoCliPlutsBaseError } from "../errors/ CardanoCliPlutsBaseError"
import { execSync } from "node:child_process"
import ObjectUtils from "../utils/ObjectUtils"
import { CardanoEra, isCardanoEra } from "../types/CardanoEra"
import { CliAddressCmd } from "./cliCmds/CliAddressCmd"
import { existsSync, mkdirSync } from "node:fs"

export interface CardanoCliPlutsConfig {
    network: "mainnet" | `testnet ${number}`,
    socketPath?: string,
    workingDirectory?: string,
    cardanoCliPath?: string,
    era?: CardanoEra
}

export class CardanoCliPluts
{
    readonly address!: CliAddressCmd

    constructor({
        network: _network,
        socketPath,
        workingDirectory,
        cardanoCliPath,
        era: _era
    }: CardanoCliPlutsConfig)
    {
        if( typeof window !== "undefined" )
        throw new CardanoCliPlutsBaseError(
            "cardanocli-pluts does not work in a browser environment"
        );

        const catCmd = process.platform === "win32" ? "type" : "cat";
        
        if( socketPath !== undefined )
        {
            process.env["CARDANO_NODE_SOCKET_PATH"] = socketPath
        }

        let network: "mainnet" | `testnet ${number}`;
        if( _network === "mainnet" ) network = "mainnet";
        else
        {
            const [ tnet, magic ] = _network.trim().split(" ");
            
            if( tnet !== "testnet" )
            throw new CardanoCliPlutsBaseError(
                "unknown network " + _network
            );

            const n = Number( magic );
            if( n !== Math.round( Math.abs( n ) ) )
            throw new CardanoCliPlutsBaseError(
                "invalid testnet-magic: " + n.toString()
            );

            network = ("testnet " + n.toString()) as any;
        }

        const era = _era !== undefined && isCardanoEra( _era ) ? _era : "babbage"

        let dir =  workingDirectory === undefined ? "." : workingDirectory
        dir = dir.trim()
        while( dir.endsWith("/") )
        {
            dir = dir.slice( 0, dir.length - 1 );
        }

        const tmpDirPath =  dir + "/.cardanocli_pluts_tmp"

        if( !existsSync(tmpDirPath) )
        {
            mkdirSync( tmpDirPath )
        };

        const cliPath = cardanoCliPath === undefined ? "cardano-cli" : cardanoCliPath;

        const cmdCfg = Object.freeze({
            network,
            cliPath,
            tmpDirPath
        });

        ObjectUtils.defineReadOnlyProperty(
            this, "address",
            new CliAddressCmd(cmdCfg)
        )

    }
}