import { 
    Address, 
    Data, 
    Hash32,
    Script,
    ScriptType, 
    TxOutRef, 
    UTxO, 
    Value,
    dataFromCbor
} from "@harmoniclabs/plu-ts";

export function parseUtxoOutput( utxoOuput: string, addr: Address ): UTxO[]
{
    const lines = utxoOuput.split('\n').slice(2);
    const len = lines.length - 1; // last line is empty
    const result: UTxO[] = new Array( len );

    for( let n = 0; n < len; n++ )
    {
        const values = lines[n].split(' ').filter( str => str !== '' );

        const [ id, index, lovelaces ] = values;

        let amount: Value = Value.lovelaces( BigInt( lovelaces ) );
        let datum: Hash32 | Data | undefined = undefined;
        let refScript: Script<ScriptType.PlutusV2> | undefined = undefined;
        
        for( let i = 4; i < len; )
        {
            if( values[i++] !== "+" ) break;

            const key = values[i++];
            if(
                key === "TxOutInlineDatum"   ||
                key === "TxOutDatumHash"     ||
                key === "TxOutDatumNone"     ||
                key === "InlineScript"
            )
            {
                if( key === "TxOutInlineDatum" ) datum = dataFromCbor( values[i++] );
                if( key === "TxOutDatumHash" )   datum = new Hash32( values[i++] );
                if( key === "TxOutDatumNone" )   datum = undefined;
                if( key === "InlineScript" ) refScript = Script.fromCbor( values[i++], ScriptType.PlutusV2 );

                continue;
            }

            const quantity = BigInt( key );
            const [ policy, _asset ] = values[i++].split('.');
            const asset = Buffer.from( _asset, "hex" ).toString("ascii");

            amount = Value.add(
                amount,
                new Value([
                    {
                        policy: new Hash32( policy ),
                        assets: {
                            [asset]: quantity
                        }
                    }
                ])
            )
        }

        result[n] = new UTxO({
            utxoRef: new TxOutRef({
                id: id,
                index: Number( index )
            }),
            resolved : {
                address: addr.clone(),
                amount,
                datum,
                refScript
            }
        })
    }

    return result;
}