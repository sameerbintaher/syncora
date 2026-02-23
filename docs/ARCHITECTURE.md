# Syncora Architecture

## Security

- **Input validation**: express-validator on all routes (body, param, query)
- **Rate limiting**: Global 200/15min, auth login 10/15min, chat 100/min
- **XSS protection**: Helmet CSP headers, message sanitization (validator.escape)
- **CORS**: Configured origins from CLIENT_URL (comma-separated for multiple)
- **Error handling**: JWT, Mongoose (duplicate key, validation, CastError)
- **Message sanitization**: Text messages escaped on save/edit; reply content sanitized

## Performance

- **Message pagination**: Cursor-based with limit (default 50, max 100)
- **MongoDB indexes**: room+createdAt, room+sender, members, createdAt
- **Optimistic UI**: Messages appear immediately; replaced when server confirms
- **lean()**: Queries use `.lean()` for plain objects where possible

---

## Database Schemas (MongoDB)

### User Schema
| Field | Type | Description | Index |
|-------|------|-------------|-------|
| name | String | Display name | - |
| username | String | Login handle | unique |
| email | String | Email address | unique |
| password | String | Hashed (bcrypt) | - |
| avatar | String | Avatar URL | - |
| isOnline | Boolean | Online status | - |
| lastSeen | Date | Last seen timestamp | - |
| timestamps | auto | createdAt, updatedAt | - |

### Chat Schema (Room)
| Field | Type | Description | Index |
|-------|------|-------------|-------|
| isGroup | virtual | type === 'group' | - |
| type | String | 'direct' \| 'group' | type + members |
| members | ObjectId[] | Room members | members |
| groupName | String | Name for groups | - |
| groupAdmin | ObjectId | Primary admin | - |
| name | String | Alias for groupName | - |
| admins | ObjectId[] | Admin list | - |
| timestamps | auto | createdAt, updatedAt | createdAt |

### Message Schema
| Field | Type | Description | Index |
|-------|------|-------------|-------|
| chatId | virtual | Alias for room | - |
| room | ObjectId | Chat reference | room, room+createdAt |
| sender | ObjectId | Sender user | - |
| content | String | Message text | - |
| seenBy | ObjectId[] | Read receipts | - |
| readBy | ObjectId[] | (same as seenBy) | - |
| timestamps | auto | createdAt, updatedAt | createdAt |

---

## Socket Architecture

### Authentication
- **JWT middleware**: Socket handshake must include `auth.token` or `Authorization: Bearer <token>`
- Token verified on every connection; invalid token rejects connection

### Room Joining
- **room:join** (chatId): Client emits when entering a chat. Server validates membership before joining.
- **room:leave** (chatId): Client emits when leaving a chat. Socket leaves the room.
- **Scalable**: Users join only the rooms they are actively viewing; no bulk pre-join on connect.

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| message:send | Client → Server | Send message (supports clientMessageId for dedup) |
| message:new | Server → Room | New message broadcast |
| typing:start | Client → Server | User started typing |
| typing:stop | Client → Server | User stopped typing |
| room:join | Client → Server | Join chat room |
| room:leave | Client → Server | Leave chat room |
| user:online | Server → All | User came online |
| user:offline | Server → All | User went offline |

### Reconnect Handling
- Client: `reconnection: true` with `reconnectionAttempts: 5`
- On `connect` (including after reconnect): Client re-emits `room:join` for `activeRoomId`
- Server: Treats each connect as fresh; user must re-join rooms

### Disconnection
- On `disconnect`: If no other sockets for user, set `isOnline: false`, emit `user:offline`
- `lastSeen` updated on disconnect

### Duplicate Message Prevention
- Client sends optional `clientMessageId` with each message
- Server caches `{ userId:roomId:clientMessageId } → messageId` for 10s
- Duplicate send within window returns cached message; no DB write
