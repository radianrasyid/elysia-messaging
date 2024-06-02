import jwt from "@elysiajs/jwt";
import Elysia, { t } from "elysia";
import { readUserById } from "../queries/auth.query";
import { readContactsByUser } from "../queries/contact.query";
import { readAllUser } from "../queries/user.query";
import { db, validateUser } from "../utils";

const user = new Elysia({ prefix: "/user" })
  .use(
    jwt({
      name: "jwt_auth",
      secret: "radianrasyid",
      schema: t.Object({
        id: t.String(),
      }),
    })
  )
  .get(
    "/:id",
    async ({ params, set, jwt_auth, cookie: { auth_session }, request }) => {
      const currentAuthSession = await request.headers.get("cookie")!;
      const profile = await validateUser(db, currentAuthSession);

      if (typeof profile === "boolean") {
        set.status = 401;
        return {
          ok: false,
          message: "unauthorized",
        };
      }

      const { id } = params;

      const user = await readUserById(id);
      if (!user) {
        set.status = 400;
        return {
          ok: false,
          message: "user not found",
        };
      }

      const data = {
        id: user.id,
        email: user.email,
        username: user.username,
      };

      return {
        ok: true,
        message: "user found",
        data,
      };
    }
  )
  .get(
    "/find-user",
    async ({ query, request, set }) => {
      const cookie = request.headers.get("cookie")!;
      const validatedUser = await validateUser(db, cookie);

      if (typeof validatedUser === "boolean") {
        set.status = 401;
        return {
          ok: false,
          message: "unauthorized",
        };
      }

      const { username } = query;
      const foundUser = await db.user.findMany({
        where: {
          username: {
            contains: username,
          },
        },
        select: {
          email: true,
          id: true,
          username: true,
        },
      });

      if (foundUser.length == 0) {
        set.status = 200;
        return {
          ok: false,
          message: "no user found",
        };
      }

      set.status = 200;
      return {
        ok: false,
        message: "users found",
        data: foundUser,
      };
    },
    {
      query: t.Object({
        username: t.String(),
      }),
    }
  )
  .get("/", async ({ set, jwt_auth, cookie: { session } }) => {
    const profile = await jwt_auth.verify(session.value);
    if (!profile) {
      set.status = 401;
      return {
        ok: false,
        message: "unauthorized",
      };
    }

    const users = await readAllUser();
    if (!users) {
      set.status = 200;
      return {
        ok: false,
        message: "no user found",
      };
    }

    const contactList = await readContactsByUser(profile.id);

    const removeUser = users.filter((item) => item.id !== profile.id);
    const data = removeUser.filter(
      (item) =>
        !contactList.some((contact) => contact.id.toString() === item.id)
    );
    return {
      ok: true,
      message: "user found",
      data,
    };
  });

export { user };
