// Starts a throwaway in-memory MongoDB on 127.0.0.1:27017 (or MEMORY_MONGO_PORT)
// for local development, e2e runs and landing-page captures. Data is lost on exit.
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.MEMORY_MONGO_PORT || 27017);
const mongo = await MongoMemoryServer.create({ instance: { port, ip: "127.0.0.1" } });
console.log(`In-memory MongoDB ready at ${mongo.getUri()}`);

const stop = async () => {
    await mongo.stop();
    process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
