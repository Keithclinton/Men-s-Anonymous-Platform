import 'reflect-metadata';
import { createServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { ChatBootstrapModule } from '../apps/api/src/modules/chat/chat-bootstrap.module';
import { ChatGateway } from '../apps/api/src/modules/chat/chat.gateway';

interface AccessTokenPayload {
  sub: string;
  role: string;
}

/**
 * 1:1 chat WebSocket endpoint — deliberately its own Vercel Function, isolated from the
 * main REST API in api/index.ts. Vercel's WebSocket support
 * (https://vercel.com/docs/functions/websockets) requires the default export to be a real
 * http.Server, built synchronously at module scope — a fundamentally different shape than
 * api/index.ts's callback-style handler. Forcing that shape onto the main entry point (or
 * routing this through the same Nest app) risked destabilizing every other endpoint for an
 * unverified benefit, so this stays fully separate: its own bootstrap module
 * (ChatBootstrapModule, NOT AppModule), its own http.Server, its own Socket.IO instance.
 *
 * The http.Server + Socket.IO server are created synchronously so the export satisfies
 * Vercel's requirement immediately. The Nest application context (DB, config, JwtService)
 * bootstraps lazily on first connection and is cached across invocations on a warm instance,
 * same caching rationale as api/index.ts.
 */
const httpServer = createServer((_req, res) => {
  res.statusCode = 404;
  res.end('Socket.IO endpoint only');
});

const io = new SocketIOServer(httpServer, {
  path: '/api/socket/socket.io',
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
});

let contextPromise: Promise<{ jwt: JwtService; config: ConfigService; chatGateway: ChatGateway }> | null = null;

async function getContext() {
  if (!contextPromise) {
    contextPromise = (async () => {
      const context = await NestFactory.createApplicationContext(ChatBootstrapModule, {
        logger: ['error', 'warn'],
      });
      const jwt = context.get(JwtService);
      const config = context.get(ConfigService);
      const chatGateway = context.get(ChatGateway);
      chatGateway.server = io;

      const redisUrl = config.getOrThrow<string>('REDIS_URL');
      const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.error(`[socket] Redis pub client error: ${err.message}`));
      subClient.on('error', (err) => console.error(`[socket] Redis sub client error: ${err.message}`));
      io.adapter(createAdapter(pubClient, subClient));

      return { jwt, config, chatGateway };
    })().catch((err) => {
      contextPromise = null;
      throw err;
    });
  }
  return contextPromise;
}

// Auths the handshake with the same access token the REST API issues — see
// auth.service.ts#issueTokens. No anonymous sockets, ever.
io.use(async (socket, next) => {
  try {
    const { jwt, config } = await getContext();
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Unauthorized: no token'));
      return;
    }
    const payload = jwt.verify<AccessTokenPayload>(token, {
      secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
    });
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch (err) {
    next(err instanceof Error ? err : new Error('Unauthorized'));
  }
});

io.on('connection', (socket: Socket) => {
  void getContext().then(({ chatGateway }) => {
    chatGateway.handleConnection(socket);
    socket.on('disconnect', () => chatGateway.handleDisconnect(socket));
    socket.on('join', (payload, ack) => {
      void chatGateway.onJoin(socket, payload).then((result) => {
        if (typeof ack === 'function') ack(result);
      });
    });
    socket.on('leave', (payload) => chatGateway.onLeave(socket, payload));
    socket.on('message', (payload, ack) => {
      const result = chatGateway.onMessage(socket, payload);
      if (typeof ack === 'function') ack(result);
    });
    socket.on('typing', (payload) => chatGateway.onTyping(socket, payload));
  });
});

export default httpServer;
