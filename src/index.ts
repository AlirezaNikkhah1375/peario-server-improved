import fs from 'fs';
import https from 'https';
import WS from './ws';
import { PORT, PEM_CERT, PEM_KEY, INTERVAL_ROOM_UPDATE } from './common/config';
import RoomManager from './room';
import { User, Client, Player } from './shared';
import Meta from './shared/meta';
import Stream from './shared/stream';

const server = https.createServer({
    cert: fs.readFileSync(PEM_CERT),
    key: fs.readFileSync(PEM_KEY)
}, (req, res) => {
    res.writeHead(200);
    res.end();
}).listen(PORT);

console.log(`Listening on port ${PORT}`);

const wss = new WS(server);
const roomManager = new RoomManager();

// Event Types
interface ClientEvent {
    client: Client;
    payload: any;
}

interface ClientUserUpdate extends ClientEvent {
    payload: { username: string };
}

interface ClientNewRoom extends ClientEvent {
    payload: { meta: Meta; stream: Stream };
}

interface ClientJoinRoom extends ClientEvent {
    payload: { id: string };
}

interface ClientMessage extends ClientEvent {
    payload: { content: string };
}

interface ClientUpdateOwnership extends ClientEvent {
    payload: { userId: string };
}

interface ClientSync extends ClientEvent {
    payload: Player;
}

// Register event handlers
wss.events.on('user.update', updateUser);
wss.events.on('room.new', createRoom);
wss.events.on('room.join', joinRoom);
wss.events.on('room.message', messageRoom);
wss.events.on('room.updateOwnership', updateRoomOwnership);
wss.events.on('player.sync', syncPlayer);

function updateUser({ client, payload }: ClientUserUpdate) {
    const { username } = payload;

    if (username && username.length > 0) {
        client.name = username.slice(0, 25);

        const user = new User(client);
        client.emit('user', { user });

        const room = roomManager.getClientRoom(client);
        if (room) {
            roomManager.updateUser(room.id, user);
            wss.emitToRoom(room.id, 'sync', room);
        }
    }
}

function createRoom({ client, payload }: ClientNewRoom) {
    const room = roomManager.create(client, payload);
    
    // Join the Socket.io room
    client.joinRoom(room.id);
    
    client.emit('room', room);
}

function joinRoom({ client, payload }: ClientJoinRoom) {
    const { id } = payload;

    const room = roomManager.join(client, id);
    if (!room) {
        return client.emit('error', { type: 'room' });
    }

    // Join the Socket.io room
    client.joinRoom(room.id);

    wss.emitToRoom(room.id, 'sync', room);
}

function messageRoom({ client, payload }: ClientMessage) {
    const room = roomManager.getClientRoom(client);
    if (!room) {
        return client.emit('error', { type: 'room' });
    }

    if (payload.content) {
        const messageDate = Date.now();
        if ((messageDate - client.cooldown) / 1000 < 3) {
            return client.emit('error', { type: 'cooldown' });
        }

        const messagePayload = {
            user: client.id,
            content: payload.content.substring(0, 300),
            date: messageDate
        };

        wss.emitToRoom(room.id, 'message', messagePayload);
        client.resetCooldown();
    }
}

function updateRoomOwnership({ client, payload }: ClientUpdateOwnership) {
    const room = roomManager.getClientRoom(client);
    if (!room) {
        return client.emit('error', { type: 'room' });
    }

    if (payload && payload.userId && room.owner === client.id) {
        const roomUser = room.users.find(({ id, room_id }) => id === payload.userId && room_id === room.id);

        if (!roomUser) {
            return client.emit('error', { type: 'user' });
        }

        const updatedRoom = roomManager.updateOwner(room.id, roomUser);
        if (updatedRoom) {
            wss.emitToRoom(updatedRoom.id, 'sync', updatedRoom);
        }
    }
}

function syncPlayer({ client, payload: player }: ClientSync) {
    const room = roomManager.getClientRoom(client);
    if (!room) {
        return client.emit('error', { type: 'room' });
    }
    
    if (room.owner === client.id) {
        // Owner's sync - update room and broadcast to others
        room.player = player;
        
        // Broadcast to all other clients in the room (excluding sender)
        wss.emitToRoomExcept(room.id, client, 'sync', room);
    } else {
        // Non-owner trying to sync - send them the current room state
        client.emit('sync', room);
    }
}

// Periodic room cleanup - remove disconnected users
setInterval(() => {
    roomManager.rooms = roomManager.rooms.map(room => {
        const tmp_users = room.users;
        room.users = room.users.filter(user => wss.clients.find(client => client.id === user.id));

        if (JSON.stringify(room.users) !== JSON.stringify(tmp_users)) {
            wss.emitToRoom(room.id, 'sync', room);
        }
        return room;
    });
}, INTERVAL_ROOM_UPDATE);

