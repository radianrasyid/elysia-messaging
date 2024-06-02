import cookie from "@elysiajs/cookie";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { auth } from "./routes/auth.routes";
import { chat } from "./routes/chat.routes";
import { contact } from "./routes/contact.routes";
import { message } from "./routes/message.routes";
import { profile } from "./routes/profile.routes";
import { user } from "./routes/user.routes";

// webpush.setVapidDetails(
//   "mailto:radian.rasyid9@gmail.com",
//   process.env.PUBLIC_VAPID_KEY as string,
//   process.env.PRIVATE_VAPID_KEY as string
// );

// const app = new Elysia()
//   .state("pubVapidKey", process.env.PUBLIC_VAPID_KEY)
//   .state("privVapidKey", process.env.PRIVATE_VAPID_KEY)
//   .use(
//     staticPlugin({
//       assets: "./src/public",
//       prefix: "/",
//     })
//   )
//   .use(cors())
//   .use(
//     jwt({
//       name: "jwt",
//       secret: process.env.JWT_SECRET!,
//     })
//   )
//   .use(cookie())
//   .get("/register", () => Bun.file("./src/public/index.html"))
//   .post("/subscribe", async ({ request, set }) => {
//     console.log("masuk ke subscribe");
//     const subscription = await request.json();
//     console.log("ini subscription", subscription);
//     const payload = JSON.stringify({
//       title: "Radian Rasyid",
//       body: "Testing notification",
//     });

//     webpush
//       .sendNotification(subscription, payload)
//       .catch((e) => console.log("shit happened", e));
//   })
//   .listen(3000);

// console.log(
//   `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
// );

const PORT = Bun.env.PORT || 8080;

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .use(
    jwt({
      name: "jwt_auth",
      secret: "radianrasyid",
      schema: t.Object({
        id: t.String(),
      }),
    })
  )
  .use(cookie())
  .use(auth)
  .use(user)
  .use(chat)
  .use(profile)
  .use(contact)
  .use(message)
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
