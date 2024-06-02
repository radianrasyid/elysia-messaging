import jwt from "@elysiajs/jwt";
import Elysia, { t } from "elysia";
import { readUserById } from "../queries/auth.query";

const profile = new Elysia({ prefix: "/profile" })
  .use(
    jwt({
      name: "jwt_auth",
      secret: "radianrasyid",
      schema: t.Object({
        id: t.String(),
      }),
    })
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

    const { id } = profile;

    const user = await readUserById(id);
    if (!user) {
      set.status = 400;
      return {
        ok: false,
        message: "user does not exist",
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
  });

export { profile };
