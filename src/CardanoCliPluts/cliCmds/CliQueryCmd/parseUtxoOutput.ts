import { 
    Address, 
    Data, 
    DataB, 
    DataConstr, 
    DataI, 
    DataList, 
    DataMap, 
    DataPair, 
    Hash28, 
    Hash32,
    Script,
    ScriptType, 
    TxOutRef, 
    UTxO, 
    Value,
} from "@harmoniclabs/plu-ts";
import { CardanoCliPlutsBaseError } from "../../../errors/ CardanoCliPlutsBaseError";
import { fromHex } from "@harmoniclabs/uint8array-utils";

function replaceChOnlyBetweenQuotes( utxoOutput: string, toBeReplaced: string, replacement: string ): string
{
    const outStr = new Array( utxoOutput.length );

    let escapeThisCh:  boolean = false;
    let betweenQuotes: boolean = false;

    let ch: string = '';

    for(let i = 0; i < utxoOutput.length; i++ )
    {
        ch = utxoOutput[i];

        if(betweenQuotes)
        {
            if( ch === toBeReplaced ) ch = replacement;
            betweenQuotes = !(ch === '"' && !escapeThisCh);
        }
        else
        {
            betweenQuotes = ch === '"' && !escapeThisCh;
        }

        outStr[i] = ch;
        escapeThisCh = ch === "\\" && !escapeThisCh;
    }
    
    return outStr.join('');
}

export function parseUtxoOutput( utxoOuput: string, addr: Address, refScript?: Script ): UTxO[]
{
    const lines = utxoOuput.split('\n').slice(2);
    const len = lines.length - 1; // last line is empty
    const result: UTxO[] = new Array( len );

    for( let n = 0; n < len; n++ )
    {
        const values = replaceChOnlyBetweenQuotes( lines[n], ' ', '§' )
            .split(' ')
            .filter( str => str !== '' )
            .map( str => replaceChOnlyBetweenQuotes( str, '§', ' ' ) );
        const valuesLen = values.length;

        const [ id, index, lovelaces ] = values;

        let value: Value = Value.lovelaces( BigInt( lovelaces ) );
        let datum: Hash32 | Data | undefined = undefined;

        for( let i = 4; i < valuesLen; )
        {
            if( values[i++] !== "+" ) break;

            const key = values[i++];
            if(
                key === "TxOutDatumInline"   ||
                key === "TxOutDatumHash"     ||
                key === "TxOutDatumNone"
                // key === "InlineScript" // not a thing apparently
            )
            {
                if( key === "TxOutDatumInline" )
                {
                    i++; // skip type of inline datum
                    
                    const { data, increment } =
                        parseInlineDatum(
                            values.slice(i)
                            .reduce( (acc,elem) =>
                                acc.concat( 
                                    replaceChOnlyBetweenQuotes( elem, ',', '§' )
                                    .split(',')
                                    .map( str => replaceChOnlyBetweenQuotes( str, '§', ',' ) )
                                ) , [] as string[] ) 
                            .map( str => {
                                while(
                                    str.startsWith("(") ||
                                    str.startsWith("[")
                                )
                                {
                                    str = str.slice(1);
                                }
                                while( str.endsWith(")") )
                                {
                                    str = str.slice(0, str.length - 1 );
                                }
                                return  str;
                            })
                        );

                    datum = data,
                    i += increment;
                    
                    continue;
                }
                if( key === "TxOutDatumHash" )
                {
                    let str: string;

                    do {
                        str = values[i++];
                        str = str.startsWith('"') ? str.slice( 1, str.length - 1 ) : str
                    } while( !isHex( str ) );
                    

                    datum = new Hash32( str );
                }
                if( key === "TxOutDatumNone" )   datum = undefined;

                continue;
            }

            const quantity = BigInt( key );
            const [ policy, _asset ] = values[i++].split('.');
            // _asset === undefined -> implies asset name is empty string
            const asset = fromHex( _asset ?? "" );

            value = Value.add(
                value,
                new Value([
                    {
                        policy: new Hash28( policy ),
                        assets: [
                            {
                                name: asset,
                                quantity
                            }
                        ]
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
                value,
                datum,
                refScript
            }
        })
    }

    return result;
}

//*

// exported only for test purposes
export function parseInlineDatum(
    values: string[],
    _i: number = 0
): { data: Data , increment: number }
{

    if( values.length === _i || values[_i] === '+' ) return { increment: 0, data: new DataI(0) };
    
    let i = _i;
    const dataKey = values[i++];

    if( dataKey === "ScriptDataConstructor" )
    {
        const ctorN = BigInt( values[i++] );
        const { list, increment } = parseInlineDatumList( values, i );
        return {
            data: new DataConstr(
                ctorN,
                list
            ),
            increment: (i - _i) + increment
        };
    }
    else if( dataKey === "ScriptDataList" )
    {
        const { list, increment } = parseInlineDatumList( values, i );
        return {
            data: new DataList( list ),
            increment: (i - _i) + increment
        };
    }
    else if( dataKey === "ScriptDataMap" )
    {
        const { map, increment } = parseInlineDatumMapValue( values, i );
        return {
            data: new DataMap( map ),
            increment: (i - _i) + increment
        };
    }
    else if( dataKey === "ScriptDataNumber" )
    {
        let nStr = values[i++];
        while(
            nStr.endsWith(")") ||
            nStr.endsWith("]")
        )
        {
            nStr = nStr.slice(0, nStr.length - 1 );
            continue;
        }
        const n = BigInt( nStr );

        return { data: new DataI(n), increment: (i - _i) };
    }
    else if( dataKey === "ScriptDataBytes" )
    {
        let nStr = values[i++];
        while(
            nStr.endsWith(")") ||
            nStr.endsWith("]")
        )
        {
            nStr = nStr.slice(0, nStr.length - 1 );
            continue;
        }
        const buff = parseAsciiEscapedString( nStr.slice(1, nStr.length - 1 ) );

        return { data: new DataB(buff), increment: (i - _i) };
    }

    throw new CardanoCliPlutsBaseError(
        "unknown script data (cli) constructor " + dataKey.toString() 
    );
}

function parseInlineDatumList(
    values: string[],
    _i: number = 0
): { list: Data[] , increment: number }
{
    if( values[_i].endsWith("]") ) {
        values[_i] = values[_i].slice( 0, values[_i].length - 1 );
        return { list: [], increment: 1 };
    }

    let i = _i;
    const list: Data[] = [];
    do {
        const { data, increment } = parseInlineDatum( values,i );
        i += increment;
        list.push( data )
    } while( !values[i-1].endsWith(']') );

    values[i-1] = values[i-1].slice(0,values[i-1].length - 1);

    return { list, increment: (i - _i) };
}

function parseInlineDatumMapValue(
    values: string[],
    _i: number = 0
): { map: DataPair<Data,Data>[] , increment: number }
{
    if( values[_i] === "]" ) {
        values[_i] = "";
        return { map: [], increment: 1 };
    }

    let i = _i;
    const map: DataPair<Data,Data>[] = [];
    do {
        const { data: fst, increment: i1 } = parseInlineDatum( values,i );
        i += i1;
        const { data: snd, increment: i2 } = parseInlineDatum( values,i );
        i += i2;

        map.push( new DataPair( fst, snd ) )
    } while( !values[i-1].endsWith(']') );

    values[i-1] = values[i-1].slice(0,values[i-1].length - 1);

    return { map, increment: (i - _i) };
}

const escapedAscii = [
    "\\NUL",
    "\\SOH",
    "\\STX",
    "\\ETX",
    "\\EOT",
    "\\ENQ",
    "\\ACK",
    "\\a",
    "\\b",
    "\\t",
    "\\n",
    "\\v",
    "\\f",
    "\\r",
    "\\SO",
    "\\SI",
    "\\DLE",
    "\\DC1",
    "\\DC2",
    "\\DC3",
    "\\DC4",
    "\\NAK",
    "\\SYN",
    "\\ETB",
    "\\CAN",
    "\\EM",
    "\\SUB",
    "\\ESC",
    "\\FS",
    "\\GS",
    "\\RS",
    "\\US",
    " ",
    "!",
    '"',
    "#",
    "$",
    "%",
    "&",
    "'",
    "(",
    ")",
    "*",
    "+",
    ",",
    "-",
    ".",
    "/",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ":",
    ";",
    "<",
    "=",
    ">",
    "?",
    "@",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "[",
    "\\",
    "]",
    "^",
    "_",
    "`",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "{",
    "|",
    "}",
    "~"
]

const escapedAsciiWithEscape = ["\\DEL"].concat(
    new Array(128).fill(undefined).map( (_,i) => "\\" + (i + 128).toString() )
)

function parseAsciiEscapedString(str: string): Uint8Array
{
    const nums: number[] = [];
    
    let i: number;
    let byte: number;
    while( str !== "" )
    {
        i = escapedAsciiWithEscape.findIndex( escaped => str.startsWith( escaped ) );

        if( i < 0 )
        {
            i = byte = escapedAscii.findIndex( escaped => str.startsWith( escaped ) );
            if( byte < 0 )
            throw new CardanoCliPlutsBaseError(
                "unknown byte"
            );

            str = str.slice( escapedAscii[i].length );
        }
        else
        {
            byte = i + 127;
            str = str.slice( escapedAsciiWithEscape[i].length );
        }

        nums.push(byte);
    }

    return new Uint8Array( Buffer.from( nums ) )
}

const hexChars = Object.freeze("abcdef0123456789".split(''));

function isHex(str: string): boolean
{
    return str.split('').every( ch => hexChars.includes( ch ) );
}
//*/