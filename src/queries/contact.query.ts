import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createContact = async (userId: string, contactId: string) => {
  return await prisma.contact.create({
    data: {
      user: {
        connect: {
          id: userId,
        },
      },
      contact: {
        connect: {
          id: contactId,
        },
      },
    },
    include: {
      contact: {
        select: {
          email: true,
          avatar: true,
          username: true,
        },
      },
    },
  });
};

export const readContactsByUser = async (userId: string) => {
  return await prisma.contact.findMany({
    where: { userId: userId },
    include: {
      contact: {
        select: {
          email: true,
          avatar: true,
          username: true,
        },
      },
    },
  });
};

export const readContactById = async (contactId: number) => {
  return await prisma.contact.findUnique({
    where: {
      id: contactId,
    },
  });
};
