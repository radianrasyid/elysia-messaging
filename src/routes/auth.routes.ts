import { jwt } from "@elysiajs/jwt";
import argon2 from "argon2";
import Elysia, { t } from "elysia";
import {
  createUser,
  readByEmail,
  readByUsername,
  readUserById,
  updateUserToken,
} from "../queries/auth.query";
import { generateToken } from "../utils";

const auth = new Elysia()
  .use(
    jwt({
      name: "jwt_auth",
      secret: "radianrasyid",
      schema: t.Object({
        id: t.String(),
      }),
    })
  )
  .post(
    "/register",
    async ({ body, set }) => {
      const { username, email, password, avatar } = body;

      const userByEmail = await readByEmail(email);
      const userByUsername = await readByUsername(username);

      if (userByEmail || userByUsername) {
        set.status = 400;
        return {
          ok: false,
          message:
            "cannot register that username/email and password combination",
        };
      }

      const hash = await argon2.hash(password);

      const result = await createUser(username, email, hash, avatar);

      if (!result) {
        set.status = 500;
        return {
          ok: false,
          message: "cannot register, please try again later",
        };
      }

      const data = {
        id: result.id,
        email: result.email,
        username: result.username,
        avatar: result.avatar,
      };

      set.status = 201;
      return {
        ok: true,
        message: "successfully registered",
        data,
      };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        email: t.String(),
        avatar: t.String(),
        agreeToTermsAndConditions: t.Boolean(),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set, cookie: { session, persist }, jwt_auth }) => {
      const { username, password, rememberMe } = body;

      const user = await readByUsername(username);

      if (!user) {
        set.status = 400;
        return {
          ok: false,
          message: "username or password incorrect",
        };
      }

      const isPasswordMatch = await argon2.verify(
        password,
        user.hashedPassword
      );

      if (!isPasswordMatch) {
        set.status = 400;
        return {
          ok: false,
          message: "username or password incorrect",
        };
      }

      session.set({
        httpOnly: true,
        maxAge: 7 * 86400,
        secure: true,
        value: await jwt_auth.sign({ id: user.id }),
      });

      if (rememberMe) {
        const token = generateToken();

        persist.set({
          value: token,
          httpOnly: true,
          secure: true,
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });

        const res = await updateUserToken(user.id, token);
        if (!res) {
          set.status = 500;
          return {
            ok: false,
            message: "something went wrong, please try again",
          };
        }
      }

      const data = {
        id: user.id,
        email: user.email,
        avatar: user.avatar,
        username: user.username,
      };

      set.status = 200;
      return {
        ok: true,
        message: "successfully logged in",
        data,
      };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        rememberMe: t.Boolean(),
      }),
    }
  )
  .get(
    "/check-auth",
    async ({ set, jwt_auth, cookie: { session, persist } }) => {
      const profile = await jwt_auth.verify(session.value);

      if (!profile || !persist.value) {
        set.status = 401;
        return {
          ok: false,
          message: "unauthorized",
        };
      }

      const user = await readUserById(profile.id);
      const token = persist as unknown as string;

      if (!user?.token || user.token !== token) {
        set.status = 401;
        return {
          ok: false,
          message: "unauthorized",
        };
      }

      return {
        ok: true,
        message: "authorized",
      };
    }
  );

export { auth };
