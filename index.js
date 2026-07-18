const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;


// ===============================
// Clients connectés
// ===============================

let adminClients = [];
let robloxServers = {};



// ===============================
// HTTP Server
// ===============================

const server = http.createServer((req, res) => {


    if(req.url === "/")
    {
        res.writeHead(200);
        res.end("Roblox Admin Server Online");
        return;
    }



    // ===============================
    // Roblox Register
    // ===============================

    if(req.url === "/roblox/register" && req.method === "POST")
    {

        console.log("ROBLOX REGISTER RECU");


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
                console.log(error);

                res.writeHead(400);
                res.end();
            }

        });


        return;

    }





    // ===============================
    // Roblox Heartbeat
    // ===============================

    if(req.url === "/roblox/heartbeat" && req.method === "POST")
    {

        console.log("ROBLOX HEARTBEAT RECU");


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

                    robloxServers[data.jobId].players =
                        data.players;


                    robloxServers[data.jobId].lastHeartbeat =
                        Date.now();

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





// ===============================
// WebSocket Windows
// ===============================

const wss = new WebSocket.Server({
    server,
    path:"/ws"
});



wss.on("connection", ws =>
{

    console.log(
        "Connexion WebSocket reçue"
    );



    ws.on("message", message =>
    {

        try
        {

            const data =
                JSON.parse(message);



            if(
                data.type === "register" &&
                data.client === "admin"
            )
            {

                adminClients.push(ws);


                console.log(
                    "Application Admin connectée"
                );


                sendRobloxStatus();


                ws.send(JSON.stringify({
                    type:"registered"
                }));

            }


        }
        catch(error)
        {
            console.log(
                "Erreur websocket:",
                error
            );
        }

    });




    ws.on("close", () =>
    {

        adminClients =
            adminClients.filter(
                client => client !== ws
            );


        console.log(
            "Application déconnectée"
        );

    });

});






// ===============================
// Statut Roblox
// ===============================

function sendRobloxStatus()
{

    const connected =
        Object.keys(robloxServers).length > 0;



    console.log(
        "Statut Roblox :",
        connected
    );



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






// ===============================
// Nettoyage
// ===============================

setInterval(() =>
{

    const now = Date.now();


    for(const id in robloxServers)
    {

        if(
            now -
            robloxServers[id].lastHeartbeat
            >
            30000
        )
        {

            console.log(
                "Serveur Roblox supprimé :",
                id
            );


            delete robloxServers[id];

        }

    }


    sendRobloxStatus();


},10000);





server.listen(PORT, () =>
{
    console.log(
        "Serveur lancé sur port " + PORT
    );
});