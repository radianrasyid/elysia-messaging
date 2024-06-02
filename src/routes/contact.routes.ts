import jwt from "@elysiajs/jwt";
import Elysia, { t } from "elysia";
import { readByUsername, readUserById } from "../queries/auth.query";
import { createContact, readContactsByUser } from "../queries/contact.query";

const contact = new Elysia({ prefix: "/contact" })
  .use(
    jwt({
      name: "jwt_auth",
      secret: "radianrasyid",
      schema: t.Object({
        id: t.String(),
      }),
    })
  )
  .get("/", async ({ body, set, jwt_auth, cookie: { session } }) => {
    const profile = await jwt_auth.verify(session.value);
    if (!profile) {
      set.status = 401;
      return {
        ok: false,
        message: "unauthorized",
      };
    }

    const contactList = await readContactsByUser(profile.id);

    if (!contactList || contactList.length == 0) {
      set.status = 200;
      return {
        ok: false,
        message: "user has no contacts",
      };
    }

    const contacts = contactList.map((item) => ({
      id: item.id,
      userId: item.contactId,
      username: item.contact.username,
      avatar: item.contact.avatar,
    }));

    set.status = 200;
    return {
      ok: true,
      message: "success",
      data: contacts,
    };
  })
  .post(
    "/",
    async ({ body, set, jwt_auth, cookie: { session } }) => {
      const profile = await jwt_auth.verify(session.value);

      if (!profile) {
        set.status = 401;
        return {
          ok: false,
          message: "unauthorized",
        };
      }

      const { username } = body;
      const contact = await readByUsername(username);

      if (!contact) {
        set.status = 400;
        return {
          ok: false,
          message: "contact can not be found",
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

      if (user.id === contact.id) {
        set.status = 400;
        return {
          ok: false,
          message: "can not add yourself as a contact",
        };
      }

      try {
        const result = await createContact(user.id, contact.id);
        const data = {
          id: result.id,
          userId: result.contactId,
          username: result.contact.username,
          avatar: result.contact.avatar,
        };

        set.status = 200;
        return {
          ok: true,
          message: "successfully added",
          data,
        };
      } catch (error) {
        set.status = 400;
        return {
          ok: false,
          message: "contact already added",
        };
      }
    },
    {
      body: t.Object({
        username: t.String(),
      }),
    }
  );

export { contact };
