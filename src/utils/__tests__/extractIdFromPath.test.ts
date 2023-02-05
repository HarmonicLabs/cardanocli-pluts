import { extractIdFromPath } from "../extractIdFromPath";

describe("extractIdFromPath", () => {

    test("no", () => {

        expect(
            extractIdFromPath( "" )
        ).toBe("");
        
    });

    test("yes", () => {

        expect(
            extractIdFromPath( "path/to/hello there_questo_non_va.com" )
        ).toBe("hello there");

    })
})