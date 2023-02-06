import { CardanoCliPluts } from "../src/CardanoCliPluts/CardanoCliPluts";
import { config } from "dotenv";

config();

export const cli = new CardanoCliPluts({
    network: "testnet 42",
});