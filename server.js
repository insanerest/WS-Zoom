const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const express = require("express");
const app = express();
const privateKey = fs.readFileSync("certificates/server.key", "utf8");
const certificate = fs.readFileSync("certificates/server.crt", "utf8");
const credentials = { key: privateKey, cert: certificate };
const server = http.createServer(credentials, app);
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
const wss = new WebSocket.Server({ server: server });
const clients = new Map();

function broadcastUserList() {
  const users = Array.from(clients.keys());
  for (const client of clients.values()) {
    client.send(JSON.stringify({ type: "userlist", users }));
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "offer":
      case "answer":
      case "candidate":
        const target = clients.get(data.target);
        if (target) {
          target.send(JSON.stringify(data));
        }
        break;
      case "login":
        clients.set(data.name, ws);
        ws.send(JSON.stringify({ type: "login", success: true }));
        broadcastUserList();
        break;
    }
  });

  ws.on("close", () => {
    for (let [name, client] of clients) {
      if (client === ws) {
        clients.delete(name);
        break;
      }
    }
    broadcastUserList();
  });
});
