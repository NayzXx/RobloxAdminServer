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
// HTTP SERVER
// ==========================

const server = http.createServer((req, res) =>
{

    console.log(
        "Requête :",
        req.method,
        req.url
    );



    if(req.url === "/")
    {

        res.writeHead(200);

        res.end(
            "Roblox Admin Server Online"
        );

        return;

    }






    // ==========================
    // ROBLOX REGISTER
    // ==========================

    if(
        req.url === "/roblox/register"
        &&
        req.method === "POST"
    )
    {

        let body = "";


        req.on("data", chunk =>
        {
            body += chunk;
        });



        req.on("end", () =>
        {

            let data =
                JSON.parse(body);



            robloxServers[data.jobId] =
            {
                placeId:data.placeId,
                players:data.players,
                lastHeartbeat:Date.now()
            };



            console.log(
                "ROBLOX REGISTER :",
                data.jobId
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
        req.url === "/roblox/heartbeat"
        &&
        req.method === "POST"
    )
    {

        let body="";


        req.on("data",chunk =>
        {
            body += chunk;
        });



        req.on("end",() =>
        {

            let data =
                JSON.parse(body);



            if(
                robloxServers[data.jobId]
            )
            {

                robloxServers[data.jobId].players =
                    data.players;


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
    // ROBLOX COMMANDS
    // ==========================

    if(
        req.url.startsWith("/roblox/commands")
        &&
        req.method === "GET"
    )
    {


        const url =
            new URL(
                req.url,
                "http://localhost"
            );


        const jobId =
            url.searchParams.get(
                "jobId"
            );



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





wss.on("connection", ws =>
{


    console.log(
        "Client WebSocket connecté"
    );





    ws.on("message", message =>
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
        // ADMIN REGISTER
        // ======================


        if(
            data.type === "register"
            &&
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
        // ATTACH PLAYER
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
                    robloxServers[id].players;



                if(
                    players.includes(
                        data.username
                    )
                )
                {

                    foundServer = id;

                    break;

                }


            }







            if(foundServer)
            {


                if(
                    !commands[foundServer]
                )
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
// CLEAN OLD SERVERS
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