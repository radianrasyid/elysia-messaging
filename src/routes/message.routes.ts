import jwt from "@elysiajs/jwt";
import Elysia, { t } from "elysia";
import { readUserById } from "../queries/auth.query";
import { readContactById } from "../queries/contact.query";
import { readMessage } from "../queries/message.query";

const message = new Elysia({ prefix: "/messages" })
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
    "/",
    async ({ query, set, jwt_auth, cookie: { session } }) => {
      const { contactId } = query;
      const profile = await jwt_auth.verify(session.value);
      if (!profile) {
        set.status = 401;
        return {
          ok: false,
          message: "unauthorized",
        };
      }

      const user = await readUserById(profile.id);
      if (!user) {
        set.status = 400;
        return {
          ok: false,
          message: "user can not be found",
        };
      }

      const contact = await readContactById(Number(contactId));
      if (!contact) {
        set.status = 400;
        return {
          ok: false,
          message: "contact can not be found",
        };
      }

      const messages = await readMessage(user.id, contact.contactId);
      set.status = 200;
      return {
        ok: false,
        message: "successfull",
        data: messages,
      };
    },
    {
      query: t.Object({
        contactId: t.String(),
      }),
    }
  );

export { message };
