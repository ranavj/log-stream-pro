"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const schema_1 = require("@graphql-tools/schema");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const cookie_parser_1 = __importDefault(require("cookie-parser")); // [NEW]
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // Token verify karne ke liye
// import bodyParser from 'body-parser';
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv = __importStar(require("dotenv"));
const Logs_1 = require("./models/Logs");
const User_1 = require("./models/User"); // User Model Import
dotenv.config();
// 1. PubSub System (Radio Station) 📻
// Iska kaam hai events broadcast karna
const pubsub = new graphql_subscriptions_1.PubSub();
// Database Connect
const MONGODB_URI = process.env.MONGODB_URI || '';
mongoose_1.default.connect(MONGODB_URI).then(() => console.log('✅ MongoDB Connected'));
// 2. Schema (Added Subscription)
const typeDefs = `#graphql
  type Log {
    id: ID!
    level: String!
    message: String!
    source: String!
    timestamp: String
    avatar: String
    details: String
  }

  # [NEW] User Type
  type User {
    id: ID!
    username: String!
    email: String!
    avatar: String
    role: String! # [NEW]
  }

  # [CHANGE 1] 'token' field hata diya.
  # Ab frontend ko token JSON mein nahi chahiye, kyunki wo Cookie mein hai.
  type AuthPayload {
    user: User!
  }

  # [NEW] Stats Type
  type LogStats {
    level: String!
    count: Int!
  }
  type Query {
  # [UPDATED] Arguments add kiye: offset aur limit
    logs(offset: Int, limit: Int, search: String, startDate: String, endDate: String): [Log]
  # [NEW] Check karne ke liye ki user logged in hai ya nahi
    me: User
  # [NEW] Stats Query
    logStats: [LogStats]
  }

  type Mutation {
    createLog(level: String!, message: String!, source: String!): Log
    # [FIX] Ye Dono Missing Thay 👇
    deleteLog(id: ID!): Boolean
    updateLog(id: ID!, message: String!): Log
    # Register mein 'role' optional rakhte hain (Default: USER)
    registerUser(username: String!, email: String!, password: String!, role: String): AuthPayload
    loginUser(email: String!, password: String!): AuthPayload
    # [CHANGE 2] Logout Mutation Add kiya
    logoutUser: Boolean
  }

  # [NEW] Subscription Type
  type Subscription {
    logAdded: Log # Frontend isko sunega
    logUpdated: Log   # [NEW] Edit ke liye
    logDeleted: ID    # [NEW] Delete ke liye
  }
`;
// Helper Function: Cookie Set karne ke liye
const setAuthCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true, // 🛡️ JS isse read nahi kar payega (XSS Safe)
        secure: process.env.NODE_ENV === 'production', // HTTPS par true, Localhost par false
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 Days
    });
};
// 3. Resolvers (Updated)
const resolvers = {
    Query: {
        // [UPDATED] Search Logic
        logs: (_1, _a) => __awaiter(void 0, [_1, _a], void 0, function* (_, { offset = 0, limit = 20, search, startDate, endDate }) {
            // 1. Filter Object Banao
            const filter = {};
            // 2. Agar search term aaya hai, toh Regex lagao
            if (search) {
                filter.$or = [
                    // Message mein dhundo (Case Insensitive 'i')
                    { message: { $regex: search, $options: 'i' } },
                    // Ya Source mein dhundo
                    { source: { $regex: search, $options: 'i' } }
                ];
            }
            // B. [NEW] Date Filter Logic 📅
            if (startDate && endDate) {
                filter.timestamp = {
                    $gte: new Date(startDate), // Greater than or Equal (Start)
                    $lte: new Date(endDate) // Less than or Equal (End)
                };
            }
            // 3. Query Run karo
            return yield Logs_1.Log.find(filter)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit);
        }),
        me: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            // Context mein user tabhi hoga agar Cookie valid thi
            if (!context.user)
                return null;
            return yield User_1.User.findById(context.user.userId);
        }),
        // [NEW] Aggregation Logic
        logStats: () => __awaiter(void 0, void 0, void 0, function* () {
            // MongoDB Magic: Group by 'level' and Count
            const stats = yield Logs_1.Log.aggregate([
                {
                    $group: {
                        _id: "$level", // 'ERROR', 'INFO' etc. ke basis par group karo
                        count: { $sum: 1 } // Har match ke liye +1 karo
                    }
                }
            ]);
            // MongoDB data ko GraphQL format mein convert karo
            // Mongo return: [{ _id: 'ERROR', count: 5 }]
            // GraphQL wants: [{ level: 'ERROR', count: 5 }]
            return stats.map(s => ({ level: s._id, count: s.count }));
        }),
    },
    Mutation: {
        createLog: (_, args) => __awaiter(void 0, void 0, void 0, function* () {
            const newLog = new Logs_1.Log(Object.assign(Object.assign({}, args), { timestamp: new Date(), avatar: `https://i.pravatar.cc/150?u=${Date.now()}` }));
            yield newLog.save();
            // 📢 EVENT PUBLISH: "Hello listeners, naya log aaya hai!"
            pubsub.publish('LOG_ADDED', { logAdded: newLog });
            return newLog;
        }),
        // [SECURITY CHECK] UPDATE LOG ⛔
        updateLog: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id, message }, context) {
            if (!context.user)
                throw new Error('Not Authenticated');
            const user = yield User_1.User.findById(context.user.userId);
            if ((user === null || user === void 0 ? void 0 : user.role) !== 'ADMIN') {
                throw new Error('Access Denied: Only ADMINs can edit logs.');
            }
            const updatedLog = yield Logs_1.Log.findByIdAndUpdate(id, { message }, { new: true });
            pubsub.publish('LOG_UPDATED', { logUpdated: updatedLog });
            return updatedLog;
        }),
        // [SECURITY CHECK] DELETE LOG ⛔
        deleteLog: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { id }, context) {
            // 1. Pehle check karo user logged in hai kya?
            if (!context.user)
                throw new Error('Not Authenticated');
            // 2. Database se fresh user fetch karo (kyunki cookie purani ho sakti hai)
            const user = yield User_1.User.findById(context.user.userId);
            // 3. Check Role: Sirf ADMIN allow hai
            if ((user === null || user === void 0 ? void 0 : user.role) !== 'ADMIN') {
                throw new Error('Access Denied: You need ADMIN role to delete logs.');
            }
            yield Logs_1.Log.findByIdAndDelete(id);
            pubsub.publish('LOG_DELETED', { logDeleted: id });
            return id;
        }),
        // [NEW] REGISTER LOGIC 📝
        registerUser: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { username, email, password, role }, context) {
            // A. Check if user exists
            const existingUser = yield User_1.User.findOne({ email });
            if (existingUser) {
                throw new Error('User already exists with this email');
            }
            // B. Hash Password (Security) 🔒
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            // C. Create User
            const newUser = new User_1.User({
                username,
                email,
                password: hashedPassword,
                avatar: `https://ui-avatars.com/api/?name=${username}&background=random`,
                role: role || 'USER' // [NEW] Agar role nahi bheja toh USER banega
            });
            yield newUser.save();
            // D. Generate Token 🎟️
            const token = jsonwebtoken_1.default.sign({ userId: newUser.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            // [NEW] Cookie Set karo
            setAuthCookie(context.res, token);
            return { user: newUser }; // Token return karne ki zaroorat nahi
        }),
        // [NEW] LOGIN LOGIC 🔑
        loginUser: (_1, _a, context_1) => __awaiter(void 0, [_1, _a, context_1], void 0, function* (_, { email, password }, context) {
            // A. Find User
            const user = yield User_1.User.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }
            // B. Check Password
            const valid = yield bcryptjs_1.default.compare(password, user.password);
            if (!valid) {
                throw new Error('Invalid password');
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            // [NEW] Cookie Set karo
            setAuthCookie(context.res, token);
            return { user };
        }),
        // [NEW] LOGOUT (Frontend cookie delete nahi kar sakta, Backend karega)
        logoutUser: (_, __, context) => __awaiter(void 0, void 0, void 0, function* () {
            context.res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });
            return true;
        })
    },
    Subscription: {
        logAdded: {
            // 🎧 EVENT LISTEN: Is channel par subscribe karo
            subscribe: () => pubsub.asyncIterator(['LOG_ADDED']),
        },
        // [NEW] Listeners
        logUpdated: {
            subscribe: () => pubsub.asyncIterator(['LOG_UPDATED']),
        },
        logDeleted: {
            subscribe: () => pubsub.asyncIterator(['LOG_DELETED']),
        }
    },
};
// 4. Server Setup (Express + HTTP + WS)
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app); // HTTP Server create kiya
// Schema banaya (Zaroori hai WS ke liye)
const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
// WebSocket Server banaya
const wsServer = new ws_1.WebSocketServer({
    server: httpServer,
    path: '/graphql', // Is path par WS chalega
});
// WebSocket cleanup logic (Server band hone par)
const serverCleanup = (0, ws_2.useServer)({ schema }, wsServer);
// Apollo Server Setup
const server = new server_1.ApolloServer({
    schema,
    plugins: [
        // Server shutdown hone par WS bhi band karo
        {
            serverWillStart() {
                return __awaiter(this, void 0, void 0, function* () {
                    return {
                        drainServer() {
                            return __awaiter(this, void 0, void 0, function* () {
                                yield serverCleanup.dispose();
                            });
                        },
                    };
                });
            },
        },
    ],
});
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield server.start();
        // Middleware setup
        app.use('/graphql', 
        // 1. Cookie Parser Add karein
        (0, cookie_parser_1.default)(), 
        // 1. CORS: Frontend ko headers bhejne ki permission do
        (0, cors_1.default)({
            origin: ['http://localhost:4200', 'https://studio.apollographql.com'],
            credentials: true,
            // allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Source']
        }), 
        // 2. BODY PARSER: JSON data padhne ke liye (Express Built-in)
        express_1.default.json(), 
        // 3. Apollo Middleware
        // 3. Context Update (Req/Res pass karein)
        (0, express4_1.expressMiddleware)(server, {
            context: (_a) => __awaiter(this, [_a], void 0, function* ({ req, res }) {
                // A. Token Cookie se nikalo
                const token = req.cookies.token || '';
                let user = null;
                if (token) {
                    try {
                        user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
                    }
                    catch (err) {
                        // Invalid token
                    }
                }
                // B. Context return karo (User + Response Object)
                return { user, res, req };
            })
        }));
        // Listen on Port
        httpServer.listen(4000, () => {
            console.log(`🚀 Server ready at http://localhost:4000/graphql`);
            console.log(`🚀 Subscriptions ready at ws://localhost:4000/graphql`);
        });
    });
}
startServer();
