import { config } from 'dotenv';

config();

export const PORT = process.env.PORT as unknown as number;
export const PEM_CERT = process.env.PEM_CERT as unknown as string;
export const PEM_KEY = process.env.PEM_KEY as unknown as string;
export const INTERVAL_ROOM_UPDATE = process.env.INTERVAL_ROOM_UPDATE as unknown as number;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';