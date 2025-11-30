import { Room } from '../room';
import User from '../user';
import Meta from '../meta';
import Stream from '../stream';
import Player from '../player';

// Client to Server Events
export interface ClientToServerEvents {
    'user.update': (payload: { username: string }) => void;
    'room.new': (payload: { meta: Meta; stream: Stream }) => void;
    'room.join': (payload: { id: string }) => void;
    'room.message': (payload: { content: string }) => void;
    'room.updateOwnership': (payload: { userId: string }) => void;
    'player.sync': (payload: Player) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
    ready: (payload: { user: User }) => void;
    user: (payload: { user: User }) => void;
    room: (payload: Room) => void;
    sync: (payload: Room) => void;
    message: (payload: { user: string; content: string; date: number }) => void;
    error: (payload: { type: string }) => void;
}

// Inter-server Events (for scaling with multiple servers)
export interface InterServerEvents {
    ping: () => void;
}

// Socket Data (attached to each socket)
export interface SocketData {
    id: string;
    name: string;
    room_id: string;
    cooldown: number;
}

