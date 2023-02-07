import { CliCmd, ICliCmdConfig } from "./CliCmd";
import randId from "../../utils/randId";
import { OrPath, withPath, type WithPath } from "../../utils/path/withPath";
import { waitForFileExists } from "../../utils/waitForFileExists";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { exec } from "../../utils/node_promises";
import { PrivateKey, PublicKey, PubKeyHash, Script, Address } from "@harmoniclabs/plu-ts";
import ObjectUtils from "../../utils/ObjectUtils";
import { extractIdFromPath } from "../../utils/extractFromPath";
import { ensurePath } from "../../utils/path/ensurePath";


export type CliAddressCmdKeyGenType
    = "normal"
    | "extended"
    | "byron"

export function isCliAddressCmdKeyGenType( t: string ): t is CliAddressCmdKeyGenType
{
    return (
        t === "normal"      ||
        t === "extended"    ||
        t === "byron"   
    );
}

export interface CliAddressCmdKeyGen {
    type?: CliAddressCmdKeyGenType
}
export interface CliAddressCmdKeyHash {
    publicKey: OrPath<PublicKey>
}

export interface CliAddressCmdBuild {
    payment: { publicKey: OrPath<PublicKey> } | { paymentScript: OrPath<Script> };
    stake?: { publicKey: OrPath<PublicKey> } | { paymentScript: OrPath<Script> };
}


export class CliAddressCmd extends CliCmd
{
    constructor( cfg: ICliCmdConfig )
    {
        super( cfg );
    }

    async keyGen(args?: CliAddressCmdKeyGen): Promise<{ privateKey: WithPath<PrivateKey>, publicKey: WithPath<PublicKey> }>
    {
        const type = args?.type !== undefined && isCliAddressCmdKeyGenType( args?.type ) ? args?.type : "normal";

        let id: string;
        let vkeyPath: string;
        let skeyPath: string;

        do {
            id = randId();
            vkeyPath = `${this.cfg.tmpDirPath}/${id}_vkey.json`;
            skeyPath = `${this.cfg.tmpDirPath}/${id}_skey.json`;
        } while( existsSync(vkeyPath) && existsSync(skeyPath) )

        await exec(
            `${this.cfg.cliPath} address key-gen \
            --${type}-key \
            --verification-key-file ${vkeyPath} \
            --signing-key-file      ${skeyPath}
            `
        );

        await waitForFileExists( vkeyPath );
        await waitForFileExists( skeyPath );

        return {
            privateKey: withPath(
                skeyPath,
                PrivateKey.fromCbor(
                    JSON.parse(
                        readFileSync( skeyPath )
                        .toString("utf8")
                    ).cborHex
                ),
            ),
            publicKey: withPath(
                vkeyPath,
                PublicKey.fromCbor(
                    JSON.parse(
                        readFileSync( vkeyPath )
                        .toString("utf8")
                    ).cborHex
                ),
            )
        }
    }

    async keyHash({
        publicKey
    }: CliAddressCmdKeyHash)
    : Promise<WithPath<PubKeyHash>>
    {
        let id: string;
        let path: string;
        let pubKeyPath: string;

        if( ObjectUtils.hasOwn( publicKey, "path" ) )
        {
            pubKeyPath = publicKey.path;
            id = extractIdFromPath( publicKey.path );
            path = `${this.cfg.tmpDirPath}/${id}_pub_key_hash.json`;
        }
        else
        {
            do {
                id = randId();
                path = `${this.cfg.tmpDirPath}/${id}_pub_key_hash.json`;
                pubKeyPath = `${this.cfg.tmpDirPath}/${id}_vkey.json`;
            } while( existsSync(path) );

            writeFileSync(
                pubKeyPath,
                JSON.stringify({
                    "type": "PaymentVerificationKeyShelley_ed25519",
                    "description": "Payment Verification Key",
                    "cborHex": publicKey.toCbor().asString
                })
            );

            await waitForFileExists( pubKeyPath );

            withPath(
                pubKeyPath,
                publicKey
            );
        }

        await exec(
            `${this.cfg.cliPath} address key-hash \
            --payment-verification-key-file ${pubKeyPath} \
            --out-file ${path}
            `
        );
        
        await waitForFileExists( path );

        return withPath(
            path,
            PubKeyHash.fromCbor(
                JSON.parse(
                    readFileSync( path )
                    .toString("utf8")
                ).cborHex
            ),
            this.cfg.tmpDirPath
        );
    }
    
    async build({
        payment,
        stake
    }: CliAddressCmdBuild)
    : Promise<WithPath<Address>>
    {
        let paymentCliOption: string;
        let paymentPath: string;

        let stakeCliFullOption: string = "";

        if( ObjectUtils.hasOwn( payment, "publicKey") )
        {
            paymentCliOption = "--payment-verification-key-file";

            if( ObjectUtils.hasOwn( payment.publicKey, "path" ) )
                paymentPath = payment.publicKey.path;
            else
                paymentPath = (await ensurePath(
                    PublicKey,
                    payment.publicKey,
                    {
                        postfix: "vkey",
                        tmpDirPath: this.cfg.tmpDirPath,
                        jsonType: "PaymentVerificationKeyShelley_ed25519"
                    }
                )).path;
        }
        else
        {
            paymentCliOption = "--payment-script-file";

            if( ObjectUtils.hasOwn( payment.paymentScript , "path" ) )
                paymentPath = payment.paymentScript.path;
            else
                paymentPath = (await ensurePath(
                    Script,
                    payment.paymentScript,
                    {
                        postfix: "script",
                        tmpDirPath: this.cfg.tmpDirPath
                    }
                )).path;
        }

        const id = extractIdFromPath( paymentPath );
        const outPath = `${this.cfg.tmpDirPath}/${id}_addr.txt`;

        if( ObjectUtils.hasOwn( stake, "publicKey") )
        {
            stakeCliFullOption = "--stake-verification-key-file ";

            if( ObjectUtils.hasOwn( stake.publicKey, "path" ) )
                paymentPath = stake.publicKey.path;
            else
                paymentPath = (await ensurePath(
                    PublicKey,
                    stake.publicKey,
                    {
                        postfix: "stake_vkey",
                        tmpDirPath: this.cfg.tmpDirPath,
                        jsonType: ""
                    }
                )).path;
        }
        else
        {
            stakeCliFullOption = "--stake-script-file ";

        }

        await exec(
            `${this.cfg.cliPath} address build \
            --${this.cfg.network} \
            ${paymentCliOption} ${paymentPath} \
            ${stakeCliFullOption} \
            --out-file ${outPath}
            `
        );
        
        await waitForFileExists( outPath );

        return withPath(
            outPath,
            Address.fromString(
                readFileSync( outPath )
                .toString("utf8")
            )
        );
    }
}