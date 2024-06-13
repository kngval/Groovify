import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import loginRoute from "./routes/loginRoute";
import dataRoute from "./routes/data.routes";
dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());
server.use("/", loginRoute);
server.use("/api", dataRoute);

server.listen(3000, () => {
  console.log("Server Listening...");
});