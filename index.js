const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Roblox Admin Server Online");
});

const wss = new WebSocket.Server({
    server,
    path: "/ws"
});

let adminClients = [];
let robloxServers = [];

console.log("Serveur prêt.");

wss.on("connection", (ws) => {

    console.log("Nouvelle connexion.");

    ws.on("message", (message) => {

        try {

            const data = JSON.parse(message);

            if (data.type === "register") {

                if (data.client === "admin") {

                    adminClients.push(ws);

                    console.log("Application Windows connectée.");

                }

                else if (data.client === "roblox") {

                    robloxServers.push(ws);

                    console.log("Serveur Roblox connecté.");

                }

                ws.send(JSON.stringify({
                    type: "registered"
                }));

            }

        }
        catch (err) {

            console.log(err);

        }

    });

    ws.on("close", () => {

        adminClients = adminClients.filter(x => x !== ws);
        robloxServers = robloxServers.filter(x => x !== ws);

        console.log("Client déconnecté.");

    });

});

server.listen(PORT, () => {

    console.log(`Serveur lancé sur le port ${PORT}`);

});