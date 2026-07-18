const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;


// ==========================
// STOCKAGE
// ==========================

let adminClients = [];

let robloxServers = {};

let commands = {};



// ==========================
// SERVEUR HTTP
// ==========================

const server = http.createServer((req,res)=>
{

    console.log(
        "Requête :",
        req.method,
        req.url
    );


    if(req.url === "/")
    {

        res.writeHead(200);
        res.end("Roblox Admin Server Online");

        return;

    }





    // ==========================
    // ROBLOX REGISTER
    // ==========================

    if(
        req.url === "/roblox/register" &&
        req.method === "POST"
    )
    {

        let body = "";


        req.on("data",chunk =>
        {
            body += chunk;
        });



        req.on("end",() =>
        {

            let data =
                JSON.parse(body);



            robloxServers[data.jobId] =
            {
                placeId:data.placeId,
                players:data.players || [],
                lastHeartbeat:Date.now()
            };



            console.log(
                "ROBLOX REGISTER :",
                data.jobId
            );


            console.log(
                "Joueurs :",
                data.players
            );



            sendRobloxStatus();



            res.writeHead(200);

            res.end(
                JSON.stringify(
                {
                    success:true
                })
            );


        });


        return;

    }







    // ==========================
    // ROBLOX HEARTBEAT
    // ==========================

    if(
        req.url === "/roblox/heartbeat" &&
        req.method === "POST"
    )
    {

        let body = "";


        req.on("data",chunk =>
        {
            body += chunk;
        });



        req.on("end",() =>
        {

            let data =
                JSON.parse(body);



            console.log(
                "ROBLOX HEARTBEAT RECU"
            );


            console.log(
                "Joueurs reçus :",
                data.players
            );



            if(
                robloxServers[data.jobId]
            )
            {

                robloxServers[data.jobId].players =
                    data.players || [];


                robloxServers[data.jobId].lastHeartbeat =
                    Date.now();

            }



            res.writeHead(200);

            res.end(
                JSON.stringify(
                {
                    success:true
                })
            );


        });


        return;

    }







    // ==========================
    // COMMANDES ROBLOX
    // ==========================

    if(
        req.url.startsWith("/roblox/commands") &&
        req.method === "GET"
    )
    {


        const url =
            new URL(
                req.url,
                "http://localhost"
            );


        const jobId =
            url.searchParams.get("jobId");



        let result =
            commands[jobId] || [];



        commands[jobId] = [];



        res.writeHead(200);

        res.end(
            JSON.stringify(result)
        );


        return;

    }





    res.writeHead(404);

    res.end();


});








// ==========================
// WEBSOCKET WINDOWS
// ==========================

const wss =
    new WebSocket.Server(
    {
        server,
        path:"/ws"
    });




wss.on("connection",ws =>
{


    console.log(
        "Windows connecté"
    );



    ws.on("message",message =>
    {


        let data;



        try
        {

            data =
                JSON.parse(message);

        }
        catch
        {

            return;

        }







        // ======================
        // REGISTER ADMIN
        // ======================


        if(
            data.type === "register" &&
            data.client === "admin"
        )
        {

            adminClients.push(ws);


            console.log(
                "Admin enregistré"
            );


            sendRobloxStatus();


            return;

        }








        // ======================
        // ATTACH JOUEUR
        // ======================


        if(
            data.type === "attach"
        )
        {


            console.log(
                "Recherche joueur :",
                data.username
            );



            let foundServer = null;



            for(
                let id in robloxServers
            )
            {

                let players =
                    robloxServers[id].players || [];



                let found =
                    players.some(
                        player =>
                        player.toLowerCase()
                        ===
                        data.username.toLowerCase()
                    );



                if(found)
                {

                    foundServer = id;

                    break;

                }

            }





            if(foundServer)
            {


                if(!commands[foundServer])
                {
                    commands[foundServer] = [];
                }



                commands[foundServer].push(
                {
                    type:"attach",
                    username:data.username
                });



                ws.send(
                    JSON.stringify(
                    {
                        type:"attach_success",
                        server:foundServer
                    })
                );


                console.log(
                    "Attach réussi :",
                    foundServer
                );


            }
            else
            {

                ws.send(
                    JSON.stringify(
                    {
                        type:"attach_failed"
                    })
                );


                console.log(
                    "Joueur introuvable"
                );

            }


            return;

        }









        // ======================
        // COMMANDES ADMIN
        // ======================


        if(
            data.type === "command"
        )
        {


            console.log(
                "Commande reçue :",
                data.action,
                "Target :",
                data.target
            );



            let targetServer = null;



            for(
                let id in robloxServers
            )
            {


                let players =
                    robloxServers[id].players || [];



                let found =
                    players.some(
                        player =>
                        player.toLowerCase()
                        ===
                        data.target.toLowerCase()
                    );



                if(found)
                {

                    targetServer = id;

                    break;

                }

            }





            if(targetServer)
            {


                if(!commands[targetServer])
                {
                    commands[targetServer] = [];
                }




                commands[targetServer].push(
                {
                    type:"command",
                    action:data.action,
                    target:data.target
                });



                ws.send(
                    JSON.stringify(
                    {
                        type:"command_success"
                    })
                );



                console.log(
                    "Commande envoyée Roblox"
                );


            }
            else
            {


                ws.send(
                    JSON.stringify(
                    {
                        type:"command_failed"
                    })
                );



                console.log(
                    "Target introuvable"
                );


            }



        }




    });







    ws.on("close",() =>
    {

        adminClients =
            adminClients.filter(
                client =>
                client !== ws
            );

    });



});









// ==========================
// STATUS ROBLOX
// ==========================

function sendRobloxStatus()
{


    let connected =
        Object.keys(
            robloxServers
        ).length > 0;



    let message =
    {
        type:"roblox_status",
        connected:connected
    };



    adminClients.forEach(client =>
    {


        if(
            client.readyState === WebSocket.OPEN
        )
        {

            client.send(
                JSON.stringify(message)
            );

        }


    });


}









// ==========================
// NETTOYAGE SERVEURS
// ==========================

setInterval(() =>
{

    let now =
        Date.now();



    for(
        let id in robloxServers
    )
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









// ==========================
// START
// ==========================

server.listen(PORT,() =>
{

    console.log(
        "Serveur lancé sur port",
        PORT
    );

});