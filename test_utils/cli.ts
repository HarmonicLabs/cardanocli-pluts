import { CardanoCliPluts } from "../src/CardanoCliPluts/CardanoCliPluts";
import { config } from "dotenv";

config();

export const cli = new CardanoCliPluts({
    network: "testnet 42",
    // shelleyGenesisPath: "/media/michele/Data1/cardano/testnet/node/config_files/shelley-genesis.json",
    // socketPath: process.env.PRIVATE_SOCKET_PATH,
});