import jwt from "@elysiajs/jwt";
import { PrismaClient, User } from "@prisma/client";
import Elysia, { t } from "elysia";
import { readByUsername, readUserById } from "../queries/auth.query";
import {
  createChatDataUsers,
  createMessage,
  readChatByUserIds,
} from "../queries/chat.query";
import { db, validateUser } from "../utils";

const prisma = new PrismaClient();

interface SubscribeMessage {
  type: "subscribe";
  chatId: string;
  usernameToSubscribe: string;
}

interface ChatMessage {
  type: "message";
  text: string;
  chatId: string;
  recipientId: string;
  senderId: string;
}

interface Client {
  id: string;
  client: any;
  chatId: string;
}

const chat = new Elysia({
  prefix: "/chat",
  cookie: { httpOnly: true, secure: true },
})
  .use(
    jwt({
      name: "jwt_auth",
      secret: "radianrasyid",
      schema: t.Object({
        id: t.String(),
      }),
    })
  )
  .state("clients", [] as Client[])
  .ws("/ws", {
    body: t.Union([
      t.Object({
        type: t.Literal("subscribe"),
        chatId: t.String(),
        usernameToSubscribe: t.String(),
        myId: t.String(),
      }),
      t.Object({
        type: t.Literal("message"),
        chatId: t.String(),
        recipientId: t.String(),
        senderId: t.String(),
        text: t.String(),
      }),
    ]),
    open: async (ws) => {
      console.log(`[open] connection established`);
      ws.subscribe("chat-pool");
    },
    message: async (ws, message) => {
      const { type } = message;
      if (type === "subscribe") {
        ws.subscribe("chat-pool");
        const { chatId, myId, usernameToSubscribe } = message;
        const senderData = await readUserById(myId);
        const recipientData = await readByUsername(usernameToSubscribe);
        if (typeof senderData === "boolean") {
          ws.send({
            ok: false,
            message: "unauthorized",
          });
          ws.close();
          return;
        } else {
          if (recipientData == null) {
            ws.send({
              ok: false,
              message: "recipient does not registered",
            });
          }
          const amIInChat = await readChatByUserIds(myId);
          if (amIInChat !== null) {
            ws.subscribe(amIInChat.id);
          }
          const currentData = [...ws.data.store.clients].find(
            (e) => e.id === senderData!.id
          );
          ws.subscribe(chatId);
          if (!currentData) {
            ws.data.store.clients.push({
              id: senderData!.id,
              chatId: chatId,
              client: ws as typeof ws,
            });
          }
          console.log("ini current client", ws.data.store.clients.length);
        }
        return;
      } else if (type === "message") {
        console.log("MASUK KE MESSAGE COK1");
        const { chatId, recipientId, senderId, text } = message;
        // ws.publish("chat-pool", {
        //   recipientId,
        //   senderId,
        //   text,
        // });
        // let currentClients = ws.data.store.clients;
        // for (let i = 0; i < currentClients.length - 1; i++) {
        //   if (currentClients[i].id === senderId) {
        //     currentClients[i].client.send({
        //       recipientId,
        //       senderId,
        //       text,
        //     });
        //     await createMessage(chatId, currentClients[i].id, [recipientId], {
        //       text,
        //       sentAt: new Date(),
        //     });
        //   } else if (currentClients[i].id === recipientId) {
        //     currentClients[i].client.send({
        //       recipientId,
        //       senderId,
        //       text,
        //     });
        //   }
        // }
        ws.data.store.clients.map(async (item) => {
          if (item.id === recipientId || item.id === senderId) {
            console.log("ini item id", item.chatId);
            item.client.send({
              recipientId,
              senderId,
              text,
            });
            if (item.id === senderId) {
              const createMessages = await createMessage(
                chatId,
                senderId,
                [recipientId],
                {
                  text,
                  sentAt: new Date(),
                }
              );
              console.log("ini created message", createMessages);
            }
          }
        });
      }
    },
  })
  .post(
    "/create-chat",
    async ({ body, cookie: { auth_session }, set, request }) => {
      const cookie = request.headers.get("cookie")!;
      const isUserValid = await validateUser(db, cookie);
      if (typeof isUserValid === "boolean") {
        set.status = 401;
        return { ok: false, message: "unauthorized" };
      }

      const { recipientUsername } = body;
      const { username, id } = isUserValid;

      if (Array.isArray(recipientUsername)) {
        let currentRecipients: User[] = [];
        for (const recipient of recipientUsername) {
          const currentUser = await readByUsername(recipient);
          if (currentUser?.id) {
            currentRecipients.push(currentUser);
          }
        }

        const chatId = `${username}-${new Date().getTime()}`;
        const peopleOnChat = currentRecipients.map((i) => i.id);
        const createChat = await createChatDataUsers([...peopleOnChat, id]);

        if (!createChat) {
          set.status = 400;
          return { ok: false, message: "problem occurred when creating chat" };
        }

        set.status = 200;
        return {
          ok: true,
          message: "chat successfully created",
          data: createChat,
        };
      } else {
        const currentUser = await readByUsername(recipientUsername);
        if (currentUser?.id) {
          // Implement logic for single user chat creation if needed
        }
      }
    },
    {
      body: t.Object({
        recipientUsername: t.Array(t.String()),
      }),
    }
  );

async function handleSubscribe(
  ws: any,
  data: SubscribeMessage,
  userId: string
) {
  const { chatId, usernameToSubscribe } = data;
  const userToSubscribe = await readByUsername(usernameToSubscribe);

  if (!userToSubscribe) {
    ws.send(JSON.stringify({ ok: false, message: "user not found" }));
    return;
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { users: true },
  });

  if (!chat || !chat.users.some((user) => user.userId === userId)) {
    ws.send(
      JSON.stringify({ ok: false, message: "you are not part of the chat" })
    );
    ws.close();
    return;
  }

  ws.subscribe(chatId);
  ws.publish(
    chatId,
    JSON.stringify({
      message: `User ${userId} has subscribed to chat ${chatId}`,
    })
  );

  const clients = ws.data.store.clients;
  if (clients[userToSubscribe.id]) {
    clients[userToSubscribe.id].subscribe(chatId);
    clients[userToSubscribe.id].publish(
      chatId,
      JSON.stringify({
        message: `User ${usernameToSubscribe} has joined the chat`,
      })
    );
  }
}

async function handleMessage(ws: any, data: ChatMessage, userId: string) {
  const { chatId, text, recipientId } = data;
  const clients = ws.data.store.clients;

  if (!clients[userId] || !clients[recipientId]) {
    ws.send(
      JSON.stringify({ ok: false, message: "recipient or sender not found" })
    );
    return;
  }

  ws.publish(chatId, JSON.stringify({ message: "test", senderId: userId }));

  if (clients[recipientId]) {
    clients[recipientId].send(
      JSON.stringify({ message: "test", chatId, senderId: userId })
    );
  }
  ws.send("TAI");
}

export { chat };
