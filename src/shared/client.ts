import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './events/types';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

class Client {
    public id: string;
    public name: string;
    public room_id: string = '';
    public cooldown: number;

    private socket: TypedSocket;

    constructor(socket: TypedSocket) {
        this.id = uuidv4();
        this.name = `Guest${this.id.substring(0, 4)}`;
        this.socket = socket;
        this.cooldown = Date.now();

        // Store client data on socket for easy access
        socket.data.id = this.id;
        socket.data.name = this.name;
        socket.data.room_id = '';
        socket.data.cooldown = this.cooldown;
    }

    getSocket(): TypedSocket {
        return this.socket;
    }

    emit<E extends keyof ServerToClientEvents>(
        event: E,
        ...args: Parameters<ServerToClientEvents[E]>
    ): void {
        this.socket.emit(event, ...args);
    }

    joinRoom(roomId: string): void {
        this.room_id = roomId;
        this.socket.data.room_id = roomId;
        this.socket.join(roomId);
    }

    leaveRoom(roomId: string): void {
        this.socket.leave(roomId);
        this.room_id = '';
        this.socket.data.room_id = '';
    }

    resetCooldown(): void {
        this.cooldown = Date.now();
        this.socket.data.cooldown = this.cooldown;
    }
}

export default Client;
export { TypedSocket };
