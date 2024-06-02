import { Prisma, PrismaClient, User } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export const generateToken = () => {
  const hasher = new Bun.CryptoHasher("sha256");
  const arr = new Uint8Array(32);

  hasher.update(arr);
  return hasher.digest("hex");
};

export const validateUser = async (
  prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  sessionId: string
): Promise<User | boolean> => {
  try {
    const currentSession = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!currentSession) {
      return false;
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: currentSession.userId,
      },
    });

    if (!currentUser) {
      return false;
    }

    return currentUser;
  } catch (error) {
    return false;
  }
};

export const db = new PrismaClient();
