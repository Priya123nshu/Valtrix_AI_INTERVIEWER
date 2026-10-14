import { serve } from "bun";
import index from "./index.html";

const preferredPort = Number(process.env.PORT || 3002);

function startServer(initialPort: number) {
  let port = initialPort;
  const maxPort = initialPort + 10;

  while (port <= maxPort) {
    try {
      const server = serve({
        port,
        routes: {
          // Serve index.html for all unmatched routes.
          "/*": index,

          "/api/hello": {
            async GET() {
              return Response.json({
                message: "Hello from Valtrix Interview!",
                method: "GET",
              });
            },
            async PUT() {
              return Response.json({
                message: "Hello from Valtrix Interview!",
                method: "PUT",
              });
            },
          },

          "/api/hello/:name": async (req) => {
            const name = req.params.name;
            return Response.json({
              message: `Hello, ${name}!`,
            });
          },
        },

        development: process.env.NODE_ENV !== "production" && {
          // Enable browser hot reloading in development
          hmr: true,
          // Echo console logs from the browser to the server
          console: true,
        },
      });

      console.log(`🚀 Valtrix Interview Frontend running at ${server.url}`);
      return server;
    } catch (err: any) {
      if (err.code === "EADDRINUSE" && port < maxPort) {
        console.warn(`⚠️ Port ${port} is in use. Trying port ${port + 1}...`);
        port++;
      } else {
        throw err;
      }
    }
  }
}

startServer(preferredPort);

