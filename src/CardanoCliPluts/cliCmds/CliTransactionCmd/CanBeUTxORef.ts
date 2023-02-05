import { ITxOutRef, IUTxO } from "@harmoniclabs/plu-ts";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";
import ObjectUtils from "../../../utils/ObjectUtils";

export type CanBeUTxORef = IUTxO | ITxOutRef | `${string}#${number}`;

export function forceUTxORefString( ref: CanBeUTxORef ): `${string}#${number}`
{
    if( typeof ref === "string" )
    {
        const [ id, idx ] = ref.split("#");
        const index = Number( idx );

        if(!(
            id.length === 64 &&
            Array.from( id.toLowerCase() ).every( "abcdef0123456789".includes ) &&
            index === Math.round( Math.abs( index ) )
        ))
        throw new CardanoCliPlutsBaseError(
            "invalid UTxORef string passed: " + ref
        )

        return (id.toLowerCase() + '#' + index.toString()) as any;
    }

    if( ObjectUtils.hasOwn( ref, "utxoRef" ) ) return forceUTxORefString( ref.utxoRef );
    if(
        ObjectUtils.hasOwn( ref, "id" ) &&
        ObjectUtils.hasOwn( ref, "index" )
    ) return forceUTxORefString(
        (typeof ref.id === "string" ? ref.id : ref.id.asString) + 
        '#' + 
        ref.index.toString() as any
    )

    throw new CardanoCliPlutsBaseError(
        "invalid UTxORef string passed"
    );
}