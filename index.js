const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({
    port: PORT
});

console.log("Serveur démarré.");

wss.on("connection", (ws) => {

    console.log("Nouvelle connexion.");

    ws.send(JSON.stringify({
        type: "connected",
        message: "Bienvenue"
    }));

    ws.on("message", (message) => {

        console.log(message.toString());

    });

    ws.on("close", () => {

        console.log("Déconnexion.");

    });

});