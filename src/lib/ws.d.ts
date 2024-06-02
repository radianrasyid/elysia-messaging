interface newServerWebSocket {
  userId: string;
}

declare module "bun" {
  interface MyWebSocket extends ServerWebSocket {
    data: {
      userId: string;
    };
  }
}
