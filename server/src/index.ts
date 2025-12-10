import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { createServer } from 'http';
import express from 'express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser'; // [NEW]
import jwt from 'jsonwebtoken'; // Token verify karne ke liye
// import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Log } from './models/Logs';
import { User } from './models/User'; // User Model Import


dotenv.config();

// 1. PubSub System (Radio Station) 📻
// Iska kaam hai events broadcast karna
const pubsub = new PubSub() as any;
// Database Connect
const MONGODB_URI = process.env.MONGODB_URI || '';
mongoose.connect(MONGODB_URI).then(() => console.log('✅ MongoDB Connected'));

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
    logs(offset: Int, limit: Int, search: String): [Log]
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
const setAuthCookie = (res: any, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,  // 🛡️ JS isse read nahi kar payega (XSS Safe)
    secure: process.env.NODE_ENV === 'production', // HTTPS par true, Localhost par false
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 Days
  });
};

// 3. Resolvers (Updated)
const resolvers = {
  Query: {
    // [UPDATED] Search Logic
    logs: async (_: any, { offset = 0, limit = 20, search }: { offset: number, limit: number, search?: string }) => {

      // 1. Filter Object Banao
      const filter: any = {};

      // 2. Agar search term aaya hai, toh Regex lagao
      if (search) {
        filter.$or = [
          // Message mein dhundo (Case Insensitive 'i')
          { message: { $regex: search, $options: 'i' } },
          // Ya Source mein dhundo
          { source: { $regex: search, $options: 'i' } }
        ];
      }

      // 3. Query Run karo
      return await Log.find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit);
    },
    me: async (_: any, __: any, context: any) => {
      // Context mein user tabhi hoga agar Cookie valid thi
      if (!context.user) return null;
      return await User.findById(context.user.userId);
    },
    // [NEW] Aggregation Logic
    logStats: async () => {
      // MongoDB Magic: Group by 'level' and Count
      const stats = await Log.aggregate([
        {
          $group: {
            _id: "$level",     // 'ERROR', 'INFO' etc. ke basis par group karo
            count: { $sum: 1 } // Har match ke liye +1 karo
          }
        }
      ]);

      // MongoDB data ko GraphQL format mein convert karo
      // Mongo return: [{ _id: 'ERROR', count: 5 }]
      // GraphQL wants: [{ level: 'ERROR', count: 5 }]
      return stats.map(s => ({ level: s._id, count: s.count }));
    },
  },
  Mutation: {
    createLog: async (_: any, args: any) => {
      const newLog = new Log({
        ...args,
        timestamp: new Date(),
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`
      });
      await newLog.save();

      // 📢 EVENT PUBLISH: "Hello listeners, naya log aaya hai!"
      pubsub.publish('LOG_ADDED', { logAdded: newLog });

      return newLog;
    },
    // [SECURITY CHECK] UPDATE LOG ⛔
    updateLog: async (_: any, { id, message }: any, context: any) => {
      if (!context.user) throw new Error('Not Authenticated');
      const user = await User.findById(context.user.userId);

      if (user?.role !== 'ADMIN') {
        throw new Error('Access Denied: Only ADMINs can edit logs.');
      }

      const updatedLog = await Log.findByIdAndUpdate(id, { message }, { new: true });
      pubsub.publish('LOG_UPDATED', { logUpdated: updatedLog });
      return updatedLog;
    },

    // [SECURITY CHECK] DELETE LOG ⛔
    deleteLog: async (_: any, { id }: { id: string }, context: any) => {
      // 1. Pehle check karo user logged in hai kya?
      if (!context.user) throw new Error('Not Authenticated');

      // 2. Database se fresh user fetch karo (kyunki cookie purani ho sakti hai)
      const user = await User.findById(context.user.userId);

      // 3. Check Role: Sirf ADMIN allow hai
      if (user?.role !== 'ADMIN') {
        throw new Error('Access Denied: You need ADMIN role to delete logs.');
      }

      await Log.findByIdAndDelete(id);
      pubsub.publish('LOG_DELETED', { logDeleted: id });
      return id;
    },

    // [NEW] REGISTER LOGIC 📝
    registerUser: async (_: any, { username, email, password, role }: any, context: any) => {
      // A. Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // B. Hash Password (Security) 🔒
      const hashedPassword = await bcrypt.hash(password, 10);

      // C. Create User
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=random`,
        role: role || 'USER' // [NEW] Agar role nahi bheja toh USER banega
      });
      await newUser.save();

      // D. Generate Token 🎟️
      const token = jwt.sign({ userId: newUser.id, email }, process.env.JWT_SECRET!, { expiresIn: '7d' });

      // [NEW] Cookie Set karo
      setAuthCookie(context.res, token);

      return { user: newUser }; // Token return karne ki zaroorat nahi
    },

    // [NEW] LOGIN LOGIC 🔑
    loginUser: async (_: any, { email, password }: any, context: any) => {
      // A. Find User
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      // B. Check Password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }

      const token = jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET!, { expiresIn: '7d' });

      // [NEW] Cookie Set karo
      setAuthCookie(context.res, token);

      return { user };
    },

    // [NEW] LOGOUT (Frontend cookie delete nahi kar sakta, Backend karega)
    logoutUser: async (_: any, __: any, context: any) => {
      context.res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      });
      return true;
    }
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
const app = express();
const httpServer = createServer(app); // HTTP Server create kiya

// Schema banaya (Zaroori hai WS ke liye)
const schema = makeExecutableSchema({ typeDefs, resolvers });

// WebSocket Server banaya
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql', // Is path par WS chalega
});

// WebSocket cleanup logic (Server band hone par)
const serverCleanup = useServer({ schema }, wsServer);

// Apollo Server Setup
const server = new ApolloServer({
  schema,
  plugins: [
    // Server shutdown hone par WS bhi band karo
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

async function startServer() {
  await server.start();

  // Middleware setup
  app.use('/graphql',
    // 1. Cookie Parser Add karein
    cookieParser(),
    // 1. CORS: Frontend ko headers bhejne ki permission do
    cors<cors.CorsRequest>({
      origin: ['http://localhost:4200', 'https://studio.apollographql.com'],
      credentials: true,
      // allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Source']
    }),

    // 2. BODY PARSER: JSON data padhne ke liye (Express Built-in)
    express.json(),

    // 3. Apollo Middleware
    // 3. Context Update (Req/Res pass karein)
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        // A. Token Cookie se nikalo
        const token = req.cookies.token || '';

        let user = null;
        if (token) {
          try {
            user = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
          } catch (err) {
            // Invalid token
          }
        }

        // B. Context return karo (User + Response Object)
        return { user, res, req };
      }
    })
  );

  // Listen on Port
  httpServer.listen(4000, () => {
    console.log(`🚀 Server ready at http://localhost:4000/graphql`);
    console.log(`🚀 Subscriptions ready at ws://localhost:4000/graphql`);
  });
}

startServer();