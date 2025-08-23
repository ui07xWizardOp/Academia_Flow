import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { storage } from './storage';
import jwt from 'jsonwebtoken';
import type { User } from '@shared/schema';

export interface CollaborationRoom {
  id: string;
  name: string;
  type: 'pair-programming' | 'study-group' | 'interview-practice' | 'code-review';
  host: number;
  participants: Map<string, RoomParticipant>;
  code: string;
  language: string;
  problemId?: number;
  settings: RoomSettings;
  createdAt: Date;
  activeConnections: number;
}

export interface RoomParticipant {
  userId: number;
  userName: string;
  socketId: string;
  role: 'host' | 'collaborator' | 'viewer';
  cursor?: CursorPosition;
  selection?: SelectionRange;
  isTyping: boolean;
  lastActivity: Date;
  permissions: {
    canEdit: boolean;
    canChat: boolean;
    canVoice: boolean;
    canShare: boolean;
  };
}

export interface CursorPosition {
  line: number;
  column: number;
  color: string;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface RoomSettings {
  maxParticipants: number;
  allowAnonymous: boolean;
  requireApproval: boolean;
  enableVoice: boolean;
  enableVideo: boolean;
  enableChat: boolean;
  enableWhiteboard: boolean;
  autoSave: boolean;
  saveInterval: number; // in seconds
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  text?: string;
  range?: SelectionRange;
  userId: number;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'code' | 'system';
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  leaderId: number;
  members: number[];
  schedule: {
    dayOfWeek: number;
    time: string;
    duration: number;
  }[];
  topics: string[];
  currentProblemId?: number;
  progress: Map<number, GroupMemberProgress>;
  resources: GroupResource[];
  createdAt: Date;
}

export interface GroupMemberProgress {
  userId: number;
  problemsSolved: number;
  contributionScore: number;
  lastActive: Date;
  streakDays: number;
}

export interface GroupResource {
  id: string;
  type: 'document' | 'video' | 'problem-set' | 'note';
  title: string;
  url?: string;
  content?: string;
  addedBy: number;
  addedAt: Date;
}

export class RealtimeCollaboration {
  private io: SocketIOServer | null = null;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private userSockets: Map<number, Set<string>> = new Map();
  private studyGroups: Map<string, StudyGroup> = new Map();
  private roomHistory: Map<string, CodeChange[]> = new Map();
  private chatHistory: Map<string, ChatMessage[]> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const user = await storage.getUser(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid authentication'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('[Realtime Collaboration] Socket.IO server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket) {
    const user = socket.data.user as User;
    console.log(`[Collaboration] User ${user.name} connected (${socket.id})`);

    // Track user sockets
    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    this.userSockets.get(user.id)!.add(socket.id);

    // Socket event handlers
    socket.on('create-room', (data, callback) => this.handleCreateRoom(socket, data, callback));
    socket.on('join-room', (data, callback) => this.handleJoinRoom(socket, data, callback));
    socket.on('leave-room', (data) => this.handleLeaveRoom(socket, data));
    socket.on('code-change', (data) => this.handleCodeChange(socket, data));
    socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
    socket.on('selection-change', (data) => this.handleSelectionChange(socket, data));
    socket.on('chat-message', (data) => this.handleChatMessage(socket, data));
    socket.on('request-control', (data) => this.handleRequestControl(socket, data));
    socket.on('grant-control', (data) => this.handleGrantControl(socket, data));
    socket.on('start-voice', (data) => this.handleStartVoice(socket, data));
    socket.on('voice-signal', (data) => this.handleVoiceSignal(socket, data));
    socket.on('create-study-group', (data, callback) => this.handleCreateStudyGroup(socket, data, callback));
    socket.on('join-study-group', (data, callback) => this.handleJoinStudyGroup(socket, data, callback));
    socket.on('study-group-action', (data) => this.handleStudyGroupAction(socket, data));
    socket.on('whiteboard-draw', (data) => this.handleWhiteboardDraw(socket, data));
    socket.on('save-session', (data) => this.handleSaveSession(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Create a new collaboration room
   */
  private async handleCreateRoom(
    socket: Socket,
    data: {
      name: string;
      type: CollaborationRoom['type'];
      problemId?: number;
      settings?: Partial<RoomSettings>;
    },
    callback: (response: any) => void
  ) {
    const user = socket.data.user as User;
    const roomId = this.generateRoomId();

    const defaultSettings: RoomSettings = {
      maxParticipants: 10,
      allowAnonymous: false,
      requireApproval: false,
      enableVoice: true,
      enableVideo: true,
      enableChat: true,
      enableWhiteboard: true,
      autoSave: true,
      saveInterval: 30
    };

    const room: CollaborationRoom = {
      id: roomId,
      name: data.name,
      type: data.type,
      host: user.id,
      participants: new Map(),
      code: '',
      language: 'javascript',
      problemId: data.problemId,
      settings: { ...defaultSettings, ...data.settings },
      createdAt: new Date(),
      activeConnections: 0
    };

    // Add host as participant
    const hostParticipant: RoomParticipant = {
      userId: user.id,
      userName: user.name,
      socketId: socket.id,
      role: 'host',
      isTyping: false,
      lastActivity: new Date(),
      permissions: {
        canEdit: true,
        canChat: true,
        canVoice: true,
        canShare: true
      }
    };

    room.participants.set(socket.id, hostParticipant);
    room.activeConnections = 1;

    this.rooms.set(roomId, room);
    socket.join(roomId);

    // Initialize room history
    this.roomHistory.set(roomId, []);
    this.chatHistory.set(roomId, []);

    // Setup auto-save if enabled
    if (room.settings.autoSave) {
      this.setupAutoSave(roomId);
    }

    // Load problem if specified
    if (data.problemId) {
      const problem = await storage.getProblem(data.problemId);
      if (problem && problem.starterCode) {
        room.code = (problem.starterCode as any)[room.language] || '';
      }
    }

    callback({
      success: true,
      roomId,
      room: this.serializeRoom(room)
    });

    // Notify others
    this.io?.emit('room-created', {
      roomId,
      name: room.name,
      type: room.type,
      host: user.name
    });
  }

  /**
   * Join an existing room
   */
  private async handleJoinRoom(
    socket: Socket,
    data: { roomId: string },
    callback: (response: any) => void
  ) {
    const user = socket.data.user as User;
    const room = this.rooms.get(data.roomId);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Check if room is full
    if (room.participants.size >= room.settings.maxParticipants) {
      return callback({ success: false, error: 'Room is full' });
    }

    // Check if approval is required
    if (room.settings.requireApproval && room.host !== user.id) {
      // Request approval from host
      const hostSocket = this.getHostSocket(room);
      if (hostSocket) {
        hostSocket.emit('join-request', {
          userId: user.id,
          userName: user.name,
          roomId: data.roomId
        });
        return callback({ success: false, error: 'Waiting for host approval' });
      }
    }

    // Add participant
    const participant: RoomParticipant = {
      userId: user.id,
      userName: user.name,
      socketId: socket.id,
      role: room.host === user.id ? 'host' : 'collaborator',
      isTyping: false,
      lastActivity: new Date(),
      cursor: {
        line: 0,
        column: 0,
        color: this.generateUserColor(room.participants.size)
      },
      permissions: {
        canEdit: room.host === user.id || room.type !== 'interview-practice',
        canChat: true,
        canVoice: true,
        canShare: room.host === user.id
      }
    };

    room.participants.set(socket.id, participant);
    room.activeConnections++;
    socket.join(data.roomId);

    // Send room state to new participant
    callback({
      success: true,
      room: this.serializeRoom(room),
      history: this.roomHistory.get(data.roomId) || [],
      chat: this.chatHistory.get(data.roomId) || []
    });

    // Notify other participants
    socket.to(data.roomId).emit('participant-joined', {
      participant: this.serializeParticipant(participant)
    });

    // Send system message
    this.broadcastChatMessage(data.roomId, {
      id: this.generateMessageId(),
      roomId: data.roomId,
      userId: 0,
      userName: 'System',
      message: `${user.name} joined the room`,
      timestamp: new Date(),
      type: 'system'
    });
  }

  /**
   * Handle leaving a room
   */
  private handleLeaveRoom(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    room.participants.delete(socket.id);
    room.activeConnections--;
    socket.leave(data.roomId);

    // Notify others
    socket.to(data.roomId).emit('participant-left', {
      userId: participant.userId,
      userName: participant.userName
    });

    // Clean up empty rooms
    if (room.activeConnections === 0) {
      this.cleanupRoom(data.roomId);
    } else if (participant.role === 'host') {
      // Transfer host to another participant
      this.transferHost(room);
    }
  }

  /**
   * Handle code changes
   */
  private handleCodeChange(
    socket: Socket,
    data: {
      roomId: string;
      change: CodeChange;
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || !participant.permissions.canEdit) return;

    // Apply change to room code
    room.code = this.applyCodeChange(room.code, data.change);

    // Add to history
    const history = this.roomHistory.get(data.roomId) || [];
    history.push({
      ...data.change,
      userId: participant.userId,
      timestamp: new Date()
    });
    this.roomHistory.set(data.roomId, history);

    // Broadcast to other participants
    socket.to(data.roomId).emit('code-changed', {
      change: data.change,
      userId: participant.userId,
      userName: participant.userName
    });

    // Update participant activity
    participant.lastActivity = new Date();
    participant.isTyping = true;

    // Clear typing indicator after delay
    setTimeout(() => {
      participant.isTyping = false;
      socket.to(data.roomId).emit('typing-status', {
        userId: participant.userId,
        isTyping: false
      });
    }, 1000);
  }

  /**
   * Handle cursor movement
   */
  private handleCursorMove(
    socket: Socket,
    data: {
      roomId: string;
      position: CursorPosition;
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    participant.cursor = data.position;

    // Broadcast to others
    socket.to(data.roomId).emit('cursor-moved', {
      userId: participant.userId,
      userName: participant.userName,
      position: data.position
    });
  }

  /**
   * Handle selection changes
   */
  private handleSelectionChange(
    socket: Socket,
    data: {
      roomId: string;
      selection: SelectionRange;
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    participant.selection = data.selection;

    // Broadcast to others
    socket.to(data.roomId).emit('selection-changed', {
      userId: participant.userId,
      userName: participant.userName,
      selection: data.selection
    });
  }

  /**
   * Handle chat messages
   */
  private handleChatMessage(
    socket: Socket,
    data: {
      roomId: string;
      message: string;
      type?: 'text' | 'code';
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || !participant.permissions.canChat) return;

    const chatMessage: ChatMessage = {
      id: this.generateMessageId(),
      roomId: data.roomId,
      userId: participant.userId,
      userName: participant.userName,
      message: data.message,
      timestamp: new Date(),
      type: data.type || 'text'
    };

    // Store message
    const history = this.chatHistory.get(data.roomId) || [];
    history.push(chatMessage);
    this.chatHistory.set(data.roomId, history);

    // Broadcast message
    this.io?.to(data.roomId).emit('chat-message', chatMessage);
  }

  /**
   * Handle control requests
   */
  private handleRequestControl(
    socket: Socket,
    data: { roomId: string }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    // Notify host
    const hostSocket = this.getHostSocket(room);
    if (hostSocket) {
      hostSocket.emit('control-requested', {
        userId: participant.userId,
        userName: participant.userName
      });
    }
  }

  /**
   * Handle granting control
   */
  private handleGrantControl(
    socket: Socket,
    data: {
      roomId: string;
      userId: number;
      permissions: Partial<RoomParticipant['permissions']>;
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const hostParticipant = room.participants.get(socket.id);
    if (!hostParticipant || hostParticipant.role !== 'host') return;

    // Find target participant
    const targetParticipant = Array.from(room.participants.values())
      .find(p => p.userId === data.userId);
    
    if (targetParticipant) {
      targetParticipant.permissions = {
        ...targetParticipant.permissions,
        ...data.permissions
      };

      // Notify target
      const targetSocket = this.io?.sockets.sockets.get(targetParticipant.socketId);
      if (targetSocket) {
        targetSocket.emit('permissions-updated', targetParticipant.permissions);
      }
    }
  }

  /**
   * Handle voice chat initialization
   */
  private handleStartVoice(
    socket: Socket,
    data: { roomId: string }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room || !room.settings.enableVoice) return;

    const participant = room.participants.get(socket.id);
    if (!participant || !participant.permissions.canVoice) return;

    // Notify others that voice is available
    socket.to(data.roomId).emit('voice-available', {
      userId: participant.userId,
      userName: participant.userName
    });
  }

  /**
   * Handle WebRTC signaling for voice/video
   */
  private handleVoiceSignal(
    socket: Socket,
    data: {
      roomId: string;
      targetUserId: number;
      signal: any;
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    // Find target participant
    const targetParticipant = Array.from(room.participants.values())
      .find(p => p.userId === data.targetUserId);
    
    if (targetParticipant) {
      const targetSocket = this.io?.sockets.sockets.get(targetParticipant.socketId);
      if (targetSocket) {
        targetSocket.emit('voice-signal', {
          userId: participant.userId,
          signal: data.signal
        });
      }
    }
  }

  /**
   * Create a study group
   */
  private async handleCreateStudyGroup(
    socket: Socket,
    data: {
      name: string;
      description: string;
      schedule: StudyGroup['schedule'];
      topics: string[];
    },
    callback: (response: any) => void
  ) {
    const user = socket.data.user as User;
    const groupId = this.generateGroupId();

    const studyGroup: StudyGroup = {
      id: groupId,
      name: data.name,
      description: data.description,
      leaderId: user.id,
      members: [user.id],
      schedule: data.schedule,
      topics: data.topics,
      progress: new Map([[user.id, {
        userId: user.id,
        problemsSolved: 0,
        contributionScore: 0,
        lastActive: new Date(),
        streakDays: 0
      }]]),
      resources: [],
      createdAt: new Date()
    };

    this.studyGroups.set(groupId, studyGroup);
    
    callback({
      success: true,
      groupId,
      group: this.serializeStudyGroup(studyGroup)
    });

    // Notify others about new study group
    this.io?.emit('study-group-created', {
      groupId,
      name: studyGroup.name,
      topics: studyGroup.topics,
      leaderId: user.id
    });
  }

  /**
   * Join a study group
   */
  private async handleJoinStudyGroup(
    socket: Socket,
    data: { groupId: string },
    callback: (response: any) => void
  ) {
    const user = socket.data.user as User;
    const group = this.studyGroups.get(data.groupId);

    if (!group) {
      return callback({ success: false, error: 'Study group not found' });
    }

    if (group.members.includes(user.id)) {
      return callback({ success: false, error: 'Already a member' });
    }

    // Add member
    group.members.push(user.id);
    group.progress.set(user.id, {
      userId: user.id,
      problemsSolved: 0,
      contributionScore: 0,
      lastActive: new Date(),
      streakDays: 0
    });

    callback({
      success: true,
      group: this.serializeStudyGroup(group)
    });

    // Notify group members
    this.notifyGroupMembers(group.id, 'member-joined', {
      userId: user.id,
      userName: user.name
    });
  }

  /**
   * Handle study group actions
   */
  private handleStudyGroupAction(
    socket: Socket,
    data: {
      groupId: string;
      action: 'set-problem' | 'add-resource' | 'update-progress';
      payload: any;
    }
  ) {
    const user = socket.data.user as User;
    const group = this.studyGroups.get(data.groupId);

    if (!group || !group.members.includes(user.id)) return;

    switch (data.action) {
      case 'set-problem':
        group.currentProblemId = data.payload.problemId;
        this.notifyGroupMembers(group.id, 'problem-changed', {
          problemId: data.payload.problemId
        });
        break;

      case 'add-resource':
        const resource: GroupResource = {
          id: this.generateResourceId(),
          ...data.payload,
          addedBy: user.id,
          addedAt: new Date()
        };
        group.resources.push(resource);
        this.notifyGroupMembers(group.id, 'resource-added', resource);
        break;

      case 'update-progress':
        const progress = group.progress.get(user.id);
        if (progress) {
          progress.problemsSolved = data.payload.problemsSolved || progress.problemsSolved;
          progress.contributionScore += data.payload.contributionDelta || 0;
          progress.lastActive = new Date();
        }
        this.notifyGroupMembers(group.id, 'progress-updated', {
          userId: user.id,
          progress
        });
        break;
    }
  }

  /**
   * Handle whiteboard drawing
   */
  private handleWhiteboardDraw(
    socket: Socket,
    data: {
      roomId: string;
      drawing: any;
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room || !room.settings.enableWhiteboard) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    // Broadcast drawing to others
    socket.to(data.roomId).emit('whiteboard-update', {
      userId: participant.userId,
      drawing: data.drawing
    });
  }

  /**
   * Save session data
   */
  private async handleSaveSession(
    socket: Socket,
    data: { roomId: string }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || participant.role !== 'host') return;

    await this.saveRoomSession(room);
    
    socket.emit('session-saved', {
      roomId: data.roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(socket: Socket) {
    const user = socket.data.user as User;
    
    // Remove from user sockets
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.id);
      }
    }

    // Remove from all rooms
    this.rooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        this.handleLeaveRoom(socket, { roomId });
      }
    });

    console.log(`[Collaboration] User ${user.name} disconnected (${socket.id})`);
  }

  /**
   * Utility functions
   */

  private generateRoomId(): string {
    return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGroupId(): string {
    return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResourceId(): string {
    return `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserColor(index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FECA57', '#DDA0DD', '#98D8C8', '#FFB6C1'
    ];
    return colors[index % colors.length];
  }

  private getHostSocket(room: CollaborationRoom): Socket | null {
    const hostParticipant = Array.from(room.participants.values())
      .find(p => p.role === 'host');
    
    if (hostParticipant) {
      return this.io?.sockets.sockets.get(hostParticipant.socketId) || null;
    }
    return null;
  }

  private transferHost(room: CollaborationRoom) {
    const participants = Array.from(room.participants.values());
    if (participants.length > 0) {
      participants[0].role = 'host';
      participants[0].permissions = {
        canEdit: true,
        canChat: true,
        canVoice: true,
        canShare: true
      };
      
      // Notify new host
      const socket = this.io?.sockets.sockets.get(participants[0].socketId);
      if (socket) {
        socket.emit('host-transferred', {
          roomId: room.id
        });
      }
    }
  }

  private applyCodeChange(code: string, change: CodeChange): string {
    // Simple implementation - in production, use operational transformation
    const lines = code.split('\n');
    
    switch (change.type) {
      case 'insert':
        if (change.text) {
          const line = lines[change.position.line] || '';
          lines[change.position.line] = 
            line.slice(0, change.position.column) + 
            change.text + 
            line.slice(change.position.column);
        }
        break;
      
      case 'delete':
        if (change.range) {
          // Handle delete across multiple lines
          const startLine = change.range.start.line;
          const endLine = change.range.end.line;
          
          if (startLine === endLine) {
            lines[startLine] = 
              lines[startLine].slice(0, change.range.start.column) +
              lines[startLine].slice(change.range.end.column);
          } else {
            const newLine = 
              lines[startLine].slice(0, change.range.start.column) +
              lines[endLine].slice(change.range.end.column);
            lines.splice(startLine, endLine - startLine + 1, newLine);
          }
        }
        break;
      
      case 'replace':
        if (change.range && change.text) {
          // Delete then insert
          this.applyCodeChange(code, { ...change, type: 'delete' });
          this.applyCodeChange(code, { ...change, type: 'insert' });
        }
        break;
    }
    
    return lines.join('\n');
  }

  private setupAutoSave(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const timer = setInterval(() => {
      this.saveRoomSession(room);
    }, room.settings.saveInterval * 1000);

    this.autoSaveTimers.set(roomId, timer);
  }

  private async saveRoomSession(room: CollaborationRoom) {
    // Save to database or file system
    const sessionData = {
      roomId: room.id,
      name: room.name,
      code: room.code,
      language: room.language,
      participants: Array.from(room.participants.values()).map(p => ({
        userId: p.userId,
        userName: p.userName,
        role: p.role
      })),
      history: this.roomHistory.get(room.id) || [],
      chat: this.chatHistory.get(room.id) || [],
      savedAt: new Date()
    };

    // Store in database
    console.log(`[Collaboration] Session saved for room ${room.id}`);
    
    // In production, save to database
    // await storage.saveCollaborationSession(sessionData);
  }

  private cleanupRoom(roomId: string) {
    // Clear auto-save timer
    const timer = this.autoSaveTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(roomId);
    }

    // Save final session
    const room = this.rooms.get(roomId);
    if (room) {
      this.saveRoomSession(room);
    }

    // Clean up data
    this.rooms.delete(roomId);
    this.roomHistory.delete(roomId);
    this.chatHistory.delete(roomId);
    
    console.log(`[Collaboration] Room ${roomId} cleaned up`);
  }

  private broadcastChatMessage(roomId: string, message: ChatMessage) {
    const history = this.chatHistory.get(roomId) || [];
    history.push(message);
    this.chatHistory.set(roomId, history);
    
    this.io?.to(roomId).emit('chat-message', message);
  }

  private notifyGroupMembers(groupId: string, event: string, data: any) {
    const group = this.studyGroups.get(groupId);
    if (!group) return;

    group.members.forEach(memberId => {
      const sockets = this.userSockets.get(memberId);
      if (sockets) {
        sockets.forEach(socketId => {
          const socket = this.io?.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit(`study-group-${event}`, {
              groupId,
              ...data
            });
          }
        });
      }
    });
  }

  private serializeRoom(room: CollaborationRoom): any {
    return {
      id: room.id,
      name: room.name,
      type: room.type,
      host: room.host,
      participants: Array.from(room.participants.values()).map(p => 
        this.serializeParticipant(p)
      ),
      code: room.code,
      language: room.language,
      problemId: room.problemId,
      settings: room.settings,
      createdAt: room.createdAt,
      activeConnections: room.activeConnections
    };
  }

  private serializeParticipant(participant: RoomParticipant): any {
    return {
      userId: participant.userId,
      userName: participant.userName,
      role: participant.role,
      cursor: participant.cursor,
      selection: participant.selection,
      isTyping: participant.isTyping,
      permissions: participant.permissions
    };
  }

  private serializeStudyGroup(group: StudyGroup): any {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      leaderId: group.leaderId,
      members: group.members,
      schedule: group.schedule,
      topics: group.topics,
      currentProblemId: group.currentProblemId,
      progress: Array.from(group.progress.entries()).map(([userId, prog]) => ({
        userId,
        ...prog
      })),
      resources: group.resources,
      createdAt: group.createdAt
    };
  }

  /**
   * Public API methods
   */

  getActiveRooms(): CollaborationRoom[] {
    return Array.from(this.rooms.values());
  }

  getStudyGroups(): StudyGroup[] {
    return Array.from(this.studyGroups.values());
  }

  getRoomParticipants(roomId: string): RoomParticipant[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }

  getGroupMembers(groupId: string): number[] {
    const group = this.studyGroups.get(groupId);
    return group ? group.members : [];
  }
}

export const realtimeCollaboration = new RealtimeCollaboration();