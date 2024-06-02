import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createMessage = async (
  senderId: string,
  recipientId: string,
  text: string
) => {
  return await prisma.message.create({
    data: {
      sender: {
        connect: {
          id: senderId,
        },
      },
      recipient: {
        connect: {
          id: recipientId,
        },
      },
      text,
    },
  });
};

export const readMessage = async (senderId: string, recipientId: string) => {
  return await prisma.message.findMany({
    where: {
      OR: [
        {
          senderId: senderId,
          recipientId: recipientId,
        },
        {
          senderId: recipientId,
          recipientId: senderId,
        },
      ],
    },
  });
};
