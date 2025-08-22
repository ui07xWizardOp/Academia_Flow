import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';

interface CollaborationRoom {
  id: string;
  problemId: number;
  participants: Set<string>;
  code: string;
  language: string;
  cursor: { [userId: string]: { line: number; column: number } };
  createdAt: Date;
  lastActivity: Date;
}

interface CollaborationUser {
  id: string;
  name: string;
  socketId: string;
  color: string;
}

export class RealTimeCollaboration {
  private io: SocketIOServer;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private users: Map<string, CollaborationUser> = new Map();
  private JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

  constructor(httpServer: Server) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Configure properly for production
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
    this.startCleanupInterval();
  }

  private setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.data.user.name} (${socket.id})`);

      // Store user info
      this.users.set(socket.data.user.id, {
        id: socket.data.user.id,
        name: socket.data.user.name,
        socketId: socket.id,
        color: this.generateUserColor(socket.data.user.id)
      });

      // Handle collaboration room events
      socket.on('join_room', this.handleJoinRoom.bind(this, socket));
      socket.on('leave_room', this.handleLeaveRoom.bind(this, socket));
      socket.on('code_change', this.handleCodeChange.bind(this, socket));
      socket.on('cursor_change', this.handleCursorChange.bind(this, socket));
      socket.on('request_code_execution', this.handleCodeExecution.bind(this, socket));
      socket.on('chat_message', this.handleChatMessage.bind(this, socket));

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private authenticateSocket(socket: any, next: any) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  private handleJoinRoom(socket: any, data: { roomId: string; problemId: number }) {
    const { roomId, problemId } = data;
    const userId = socket.data.user.id;
    const userName = socket.data.user.name;

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        problemId,
        participants: new Set(),
        code: this.getStarterCode(problemId),
        language: 'python',
        cursor: {},
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.rooms.set(roomId, room);
    }

    // Add user to room
    room.participants.add(userId);
    room.lastActivity = new Date();
    socket.join(roomId);

    const user = this.users.get(userId);
    if (user) {
      // Notify other participants
      socket.to(roomId).emit('user_joined', {
        user: { id: userId, name: userName, color: user.color },
        participantCount: room.participants.size
      });

      // Send current room state to joining user
      socket.emit('room_joined', {
        roomId,
        code: room.code,
        language: room.language,
        participants: Array.from(room.participants).map(id => {
          const participantUser = this.users.get(id);
          return participantUser ? {
            id: participantUser.id,
            name: participantUser.name,
            color: participantUser.color
          } : null;
        }).filter(Boolean),
        cursors: room.cursor
      });
    }

    console.log(`User ${userName} joined room ${roomId}`);
  }

  private handleLeaveRoom(socket: any, data: { roomId: string }) {
    const { roomId } = data;
    const userId = socket.data.user.id;
    const userName = socket.data.user.name;

    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.delete(userId);
      delete room.cursor[userId];
      socket.leave(roomId);

      // Notify other participants
      socket.to(roomId).emit('user_left', {
        userId,
        userName,
        participantCount: room.participants.size
      });

      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    console.log(`User ${userName} left room ${roomId}`);
  }

  private handleCodeChange(socket: any, data: { roomId: string; code: string; language: string; delta?: any }) {
    const { roomId, code, language, delta } = data;
    const userId = socket.data.user.id;
    const userName = socket.data.user.name;

    const room = this.rooms.get(roomId);
    if (room && room.participants.has(userId)) {
      room.code = code;
      room.language = language;
      room.lastActivity = new Date();

      // Broadcast change to other participants
      socket.to(roomId).emit('code_updated', {
        code,
        language,
        delta,
        author: { id: userId, name: userName }
      });
    }
  }

  private handleCursorChange(socket: any, data: { roomId: string; line: number; column: number }) {
    const { roomId, line, column } = data;
    const userId = socket.data.user.id;

    const room = this.rooms.get(roomId);
    if (room && room.participants.has(userId)) {
      room.cursor[userId] = { line, column };

      const user = this.users.get(userId);
      if (user) {
        // Broadcast cursor position to other participants
        socket.to(roomId).emit('cursor_updated', {
          userId,
          userName: user.name,
          color: user.color,
          line,
          column
        });
      }
    }
  }

  private async handleCodeExecution(socket: any, data: { roomId: string; code: string; language: string }) {
    const { roomId, code, language } = data;
    const userId = socket.data.user.id;
    const userName = socket.data.user.name;

    const room = this.rooms.get(roomId);
    if (room && room.participants.has(userId)) {
      try {
        // Import and use code executor
        const { codeExecutor } = await import('./code-executor');
        const result = await codeExecutor.executeCode({
          code,
          language,
          timeLimit: 10000,
          memoryLimit: 128
        });

        // Broadcast execution result to all participants
        this.io.to(roomId).emit('execution_result', {
          executor: { id: userId, name: userName },
          result: {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            runtime: result.runtime,
            memory: result.memory
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        socket.emit('execution_error', {
          message: 'Code execution failed',
          error: (error as Error).message
        });
      }
    }
  }

  private handleChatMessage(socket: any, data: { roomId: string; message: string }) {
    const { roomId, message } = data;
    const userId = socket.data.user.id;
    const userName = socket.data.user.name;

    const room = this.rooms.get(roomId);
    if (room && room.participants.has(userId)) {
      const user = this.users.get(userId);
      
      // Broadcast chat message to all participants
      this.io.to(roomId).emit('chat_message', {
        id: `${Date.now()}-${userId}`,
        author: {
          id: userId,
          name: userName,
          color: user?.color || '#6B7280'
        },
        message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleDisconnect(socket: any) {
    const userId = socket.data.user.id;
    const userName = socket.data.user.name;

    // Remove user from all rooms they were in
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(userId)) {
        room.participants.delete(userId);
        delete room.cursor[userId];

        // Notify other participants
        socket.to(roomId).emit('user_left', {
          userId,
          userName,
          participantCount: room.participants.size
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    // Remove user from users map
    this.users.delete(userId);
    console.log(`User ${userName} disconnected`);
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', 
      '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
      '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
      '#EC4899', '#F43F5E'
    ];
    
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  private getStarterCode(problemId: number): string {
    // This would typically fetch from database
    const starterCodes: { [key: number]: string } = {
      1: `def solution(nums, target):
    # Write your solution here
    pass`,
      2: `def solution(arr, target):
    # Write your solution here
    pass`
    };
    
    return starterCodes[problemId] || `def solution():
    # Write your solution here
    pass`;
  }

  private startCleanupInterval() {
    // Clean up inactive rooms every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [roomId, room] of this.rooms.entries()) {
        const inactiveTime = now.getTime() - room.lastActivity.getTime();
        const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

        if (inactiveTime > maxInactiveTime) {
          console.log(`Cleaning up inactive room: ${roomId}`);
          this.rooms.delete(roomId);
        }
      }
    }, 5 * 60 * 1000);
  }

  // Public methods for room management
  public getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      problemId: room.problemId,
      participantCount: room.participants.size,
      language: room.language,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    };
  }

  public getAllActiveRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      problemId: room.problemId,
      participantCount: room.participants.size,
      language: room.language,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    }));
  }
}

let collaborationInstance: RealTimeCollaboration | null = null;

export function initializeCollaboration(httpServer: Server) {
  if (!collaborationInstance) {
    collaborationInstance = new RealTimeCollaboration(httpServer);
  }
  return collaborationInstance;
}

export function getCollaboration() {
  return collaborationInstance;
}