import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Server } from "socket.io";

dotenv.config();
console.log("Imports OK", typeof cors, typeof bcrypt, typeof jwt, z.string);
