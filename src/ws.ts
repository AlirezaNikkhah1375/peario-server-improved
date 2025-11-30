import https from 'https';
import { Server } from 'socket.io';
import { EventEmitter } from 'events';
import {
    Client,
    User,
    TypedSocket,
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
} from './shared';
import { CORS_ORIGIN } from './common/config';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

class WS {
    public io: TypedServer;
    public events = new EventEmitter();
    public clients: Client[] = [];

    constructor(server: https.Server) {
        this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
            cors: {
                origin: CORS_ORIGIN,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.io.on('connection', (socket: TypedSocket) => {
            const client = new Client(socket);
            this.clients.push(client);

            // Send ready event with user info
            client.emit('ready', { user: new User(client) });

            console.log('New client:', client.id, client.name);

            // Register event handlers
            this.registerEventHandlers(socket, client);

            // Handle disconnection
            socket.on('disconnect', () => {
                this.clients = this.clients.filter(c => c.id !== client.id);
                console.log('Client disconnected:', client.id, client.name);
            });
        });
    }

    private registerEventHandlers(socket: TypedSocket, client: Client): void {
        socket.on('user.update', (payload) => {
            this.events.emit('user.update', { client, payload });
            console.log(client.name, 'user.update');
        });

        socket.on('room.new', (payload) => {
            this.events.emit('room.new', { client, payload });
            console.log(client.name, 'room.new');
        });

        socket.on('room.join', (payload) => {
            this.events.emit('room.join', { client, payload });
            console.log(client.name, 'room.join');
        });

        socket.on('room.message', (payload) => {
            this.events.emit('room.message', { client, payload });
            console.log(client.name, 'room.message');
        });

        socket.on('room.updateOwnership', (payload) => {
            this.events.emit('room.updateOwnership', { client, payload });
            console.log(client.name, 'room.updateOwnership');
        });

        socket.on('player.sync', (payload) => {
            this.events.emit('player.sync', { client, payload });
            // Don't log player.sync to reduce noise (it's called every second)
        });
    }

    public getClientsByRoomId(room_id: string): Client[] {
        return this.clients.filter(client => client.room_id === room_id);
    }

    public emitToRoom<E extends keyof ServerToClientEvents>(
        room_id: string,
        event: E,
        ...args: Parameters<ServerToClientEvents[E]>
    ): void {
        this.io.to(room_id).emit(event, ...args);
    }

    public emitToRoomExcept<E extends keyof ServerToClientEvents>(
        room_id: string,
        excludeClient: Client,
        event: E,
        ...args: Parameters<ServerToClientEvents[E]>
    ): void {
        excludeClient.getSocket().to(room_id).emit(event, ...args);
    }
}

export default WS;
