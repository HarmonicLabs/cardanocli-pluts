import { DataConstr, DataMap, DataPair, DataI, DataB, DataList } from "@harmoniclabs/plu-ts"
import { parseInlineDatum } from "../parseUtxoOutput"

describe("parseInlineDatum", () => {

    test("simple num", () => {
        expect(
            parseInlineDatum([
                'ScriptDataNumber','1'   
            ])
        )
        .toEqual(
            {
                data: new DataI(1),
                increment: 2 
            }
        );
    });

    test("simple byte", () => {
        expect(
            parseInlineDatum([
                'ScriptDataBytes','"\\STX"'   
            ])
        )
        .toEqual(
            {
                data: new DataB("02"),
                increment: 2 
            }
        );
    });

    test("byte string [0-32]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','"\\NUL\\SOH\\STX\\ETX\\EOT\\ENQ\\ACK\\a\\b\\t\\n\\v\\f\\r\\SO\\SI\\DLE\\DC1\\DC2\\DC3\\DC4\\NAK\\SYN\\ETB\\CAN\\EM\\SUB\\ESC\\FS\\GS\\RS\\US"'   
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i )
                    )
                ),
                increment: 2
            }
        );
    });

    test("byte string [32-64]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','" !\"#$%&\'()*+,-./0123456789:;<=>?"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 32 )
                    )
                ),
                increment: 2
            }
        );
    
    });

    test("byte string [64-92]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','"@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 64 )
                    )
                ),
                increment: 2
            }
        );
    });
        
    test("byte string [92-128]", () => {
    
        expect(
            parseInlineDatum([
                'ScriptDataBytes','"`abcdefghijklmnopqrstuvwxyz{|}~\\DEL"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 96 )
                    )
                ),
                increment: 2
            }
        );

    });

    test("byte string [128-160]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','"\\128\\129\\130\\131\\132\\133\\134\\135\\136\\137\\138\\139\\140\\141\\142\\143\\144\\145\\146\\147\\148\\149\\150\\151\\152\\153\\154\\155\\156\\157\\158\\159"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 128 )
                    )
                ),
                increment: 2
            }
        );

    });

    test("byte string [160-192]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','"\\160\\161\\162\\163\\164\\165\\166\\167\\168\\169\\170\\171\\172\\173\\174\\175\\176\\177\\178\\179\\180\\181\\182\\183\\184\\185\\186\\187\\188\\189\\190\\191"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 160 )
                    )
                ),
                increment: 2
            }
        );

    });

    test("byte string [192-224]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','"\\192\\193\\194\\195\\196\\197\\198\\199\\200\\201\\202\\203\\204\\205\\206\\207\\208\\209\\210\\211\\212\\213\\214\\215\\216\\217\\218\\219\\220\\221\\222\\223"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 192 )
                    )
                ),
                increment: 2
            }
        );
    });

    test("byte string [224-256]", () => {

        expect(
            parseInlineDatum([
                'ScriptDataBytes','"\\224\\225\\226\\227\\228\\229\\230\\231\\232\\233\\234\\235\\236\\237\\238\\239\\240\\241\\242\\243\\244\\245\\246\\247\\248\\249\\250\\251\\252\\253\\254\\255"'
            ])
        )
        .toEqual(
            {
                data: new DataB(
                    new Uint8Array(
                        new Array(32).fill(undefined).map( (_,i) => i + 224 )
                    )
                ),
                increment: 2
            }
        );

    })

    test("empty list", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataList',']'
            ])
        )
        .toEqual(
            {
                data: new DataList([]),
                increment: 2
            }
        );

    });

    test("list number", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataList','ScriptDataNumber', '1]'
            ])
        )
        .toEqual(
            {
                data: new DataList([
                    new DataI(1)
                ]),
                increment: 3
            }
        );

    });

    test("empty ctor", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataConstructor','0', ']'
            ])
        )
        .toEqual(
            {
                data: new DataConstr( 0, [] ),
                increment: 3
            }
        );

    });

    test("ctor with num", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataConstructor','0', 'ScriptDataNumber', '42]'
            ])
        )
        .toEqual(
            {
                data: new DataConstr( 0, [ new DataI(42)] ),
                increment: 4
            }
        );

    });

    test("ctor with empty list", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataConstructor','0', 'ScriptDataList',']]'
            ])
        )
        .toEqual(
            {
                data: new DataConstr( 0, [ new DataList([]) ] ),
                increment: 4
            }
        );

    });

    test("ctor with list number", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataConstructor','0', 'ScriptDataList', 'ScriptDataNumber', '1]]'
            ])
        )
        .toEqual(
            {
                data: new DataConstr( 0, [
                    new DataList([
                        new DataI(1)
                    ])
                ]),
                increment: 5
            }
        );

    });

    test("empty map", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataMap', ']'
            ])
        )
        .toEqual(
            {
                data: new DataMap([]),
                increment: 2
            }
        );

    });

    test("map [(1,2)]", () => {
        
        expect(
            parseInlineDatum([
                'ScriptDataMap', 'ScriptDataNumber', '1','ScriptDataNumber', '2]'
            ])
        )
        .toEqual(
            {
                data: new DataMap([
                    new DataPair(
                        new DataI(1),
                        new DataI(2)
                    )
                ]),
                increment: 5
            }
        );

    });
    

    test("generic", () => {

        expect(
            parseInlineDatum([
                'ScriptDataConstructor', '0',
                'ScriptDataConstructor', '1',
                ']',                     'ScriptDataMap',
                'ScriptDataNumber',      '1',
                'ScriptDataBytes',       '"\\STX"',
                'ScriptDataBytes',       '"\\ETX"',
                'ScriptDataNumber',      '4)]',
                'ScriptDataList',        'ScriptDataNumber',
                '42]]'
            ]).data
        )
        .toEqual(
            new DataConstr(
                0,
                [
                    new DataConstr( 1, [] ),
                    new DataMap([
                        new DataPair(
                            new DataI(1),
                            new DataB("02")
                        ),
                        new DataPair(
                            new DataB("03"),
                            new DataI(4)
                        ) as any
                    ]),
                    new DataList([
                        new DataI(42)
                    ])
                ]
            )
        )
    })
})