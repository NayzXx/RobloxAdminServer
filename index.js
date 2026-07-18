const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;


// =========================
// Stockage des connexions
// =========================

let adminClients = [];

let robloxServers = {};



// =========================
// Serveur HTTP
// =========================

const server = http.createServer((req, res) => {

    // Test navigateur
    if(req.url === "/")
    {
        res.writeHead(200);
        res.end("Roblox Admin Server Online");
        return;
    }



    // Roblox Register
    if(req.url === "/roblox/register" && req.method === "POST")
    {

        let body = "";

        req.on("data", chunk =>
        {
            body += chunk;
        });


        req.on("end", () =>
        {
            try
            {

                const data = JSON.parse(body);


                robloxServers[data.jobId] =
                {
                    placeId: data.placeId,
                    players: data.players,
                    lastHeartbeat: Date.now()
                };


                console.log(
                    "Serveur Roblox connecté :",
                    data.jobId
                );


                sendRobloxStatus();


                res.writeHead(200);
                res.end(JSON.stringify({
                    success:true
                }));

            }
            catch(error)
            {
                res.writeHead(400);
                res.end();
            }

        });


        return;
    }





    // Roblox Heartbeat
    if(req.url === "/roblox/heartbeat" && req.method === "POST")
    {

        let body = "";


        req.on("data", chunk =>
        {
            body += chunk;
        });



        req.on("end", () =>
        {

            try
            {

                const data = JSON.parse(body);


                if(robloxServers[data.jobId])
                {
                    robloxServers[data.jobId].lastHeartbeat =
                        Date.now();


                    robloxServers[data.jobId].players =
                        data.players;
                }


                res.writeHead(200);
                res.end(JSON.stringify({
                    success:true
                }));

            }
            catch(error)
            {
                res.writeHead(400);
                res.end();
            }


        });


        return;
    }



    res.writeHead(404);
    res.end();

});




// =========================
// WebSocket Windows
// =========================

const wss = new WebSocket.Server({
    server,
    path:"/ws"
});



wss.on("connection", ws =>
{

    console.log(
        "Application connectée."
    );


    ws.on("message", message =>
    {

        try
        {

            const data =
                JSON.parse(message);


            if(data.type === "register"
            && data.client === "admin")
            {

                adminClients.push(ws);


                console.log(
                    "Admin enregistré."
                );


                sendRobloxStatus();

            }


        }
        catch(error)
        {
            console.log(error);
        }

    });



    ws.on("close", () =>
    {

        adminClients =
            adminClients.filter(
                x => x !== ws
            );

    });

});




// =========================
// Statut Roblox
// =========================

function sendRobloxStatus()
{

    const connected =
        Object.keys(robloxServers).length > 0;



    const message =
    {
        type:"roblox_status",
        connected:connected
    };



    adminClients.forEach(client =>
    {

        if(client.readyState === WebSocket.OPEN)
        {

            client.send(
                JSON.stringify(message)
            );

        }

    });

}



// Nettoyage des serveurs Roblox morts

setInterval(() =>
{

    const now = Date.now();


    for(const id in robloxServers)
    {

        if(now -
        robloxServers[id].lastHeartbeat
        > 30000)
        {

            delete robloxServers[id];


            console.log(
                "Serveur Roblox retiré :",
                id
            );

        }

    }


    sendRobloxStatus();


},10000);





server.listen(PORT, () =>
{

    console.log(
        "Serveur lancé sur le port " + PORT
    );

});