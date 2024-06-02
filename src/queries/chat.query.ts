import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createChatDataUsers = async (userId: string[]) => {
  return await prisma.chat.create({
    data: {
      users: {
        create: userId.map((id) => ({
          user: {
            connect: {
              id: id,
            },
          },
        })),
      },
    },
    include: {
      users: true,
    },
  });
};

export const createMessage = async (
  chatId: string,
  senderId: string,
  recipientId: string[],
  data: {
    text: string;
    sentAt: Date;
  }
) => {
  return await prisma.message.create({
    data: {
      text: data.text,
      sentAt: new Date(),
      chat: {
        connect: {
          id: chatId,
        },
      },
      sender: {
        connect: {
          id: senderId,
        },
      },
      recipients: {
        create: recipientId.map((id) => ({
          user: {
            connect: {
              id: id,
            },
          },
        })),
      },
    },
    include: {
      chat: {
        include: {
          messages: {
            select: {
              sender: {
                select: {
                  username: true,
                },
              },
              recipients: {
                select: {
                  user: {
                    select: {
                      username: true,
                    },
                  },
                },
              },
              sentAt: true,
              text: true,
              chatId: true,
            },
          },
        },
      },
      sender: {
        select: {
          email: true,
          username: true,
          id: true,
          name: true,
        },
      },
      recipients: {
        include: {
          user: {
            select: {
              email: true,
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });
};

export const readChatById = async (chatId: string) => {
  return await prisma.chat.findUnique({
    where: {
      id: chatId,
    },
    include: {
      messages: true,
      users: true,
    },
  });
};

export const readMessagesById = async (chatId: string) => {
  return await prisma.message.findMany({
    where: {
      chatId: chatId,
    },
    include: {
      chat: true,
      sender: true,
      recipients: {
        include: {
          user: true,
        },
      },
    },
  });
};

export const readChatByUserIds = async (userId: string) => {
  return await prisma.chat.findFirst({
    where: {
      users: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      users: true,
    },
  });
};
