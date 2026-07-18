const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;


// ==============================
// Stockage
// ==============================

let adminClients = [];

let robloxServers = {};

let commands = {};



// ==============================
// Serveur HTTP
// ==============================

const server = http.createServer((req, res) => {


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




    // ==============================
    // Roblox Register
    // ==============================

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

            const data =
                JSON.parse(body);



            robloxServers[data.jobId] =
            {
                placeId:data.placeId,
                players:data.players,
                lastHeartbeat:Date.now()
            };



            console.log(
                "Roblox connecté :",
                data.jobId
            );



            sendRobloxStatus();



            res.writeHead(200);

            res.end(
                JSON.stringify({
                    success:true
                })
            );

        });


        return;

    }






    // ==============================
    // Roblox Heartbeat
    // ==============================

    if(
        req.url === "/roblox/heartbeat"
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

            const data =
                JSON.parse(body);



            if(robloxServers[data.jobId])
            {

                robloxServers[data.jobId].players =
                    data.players;


                robloxServers[data.jobId].lastHeartbeat =
                    Date.now();

            }



            res.writeHead(200);

            res.end(
                JSON.stringify({
                    success:true
                })
            );

        });


        return;

    }







    // ==============================
    // Roblox récupère commandes
    // ==============================

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








    // ==============================
    // Attach joueur
    // ==============================

    if(
        req.url === "/attach"
        &&
        req.method === "POST"
    )
    {


        let body="";



        req.on("data",chunk=>
        {
            body += chunk;
        });



        req.on("end",()=>{


            const data =
                JSON.parse(body);



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


                if(!commands[foundServer])
                {
                    commands[foundServer] = [];
                }



                commands[foundServer].push(
                {
                    type:"attach",
                    username:data.username
                });



                console.log(
                    "Attach envoyé à",
                    foundServer
                );



                res.writeHead(200);


                res.end(
                    JSON.stringify(
                    {
                        success:true,
                        server:foundServer
                    })
                );

            }
            else
            {

                res.writeHead(200);


                res.end(
                    JSON.stringify(
                    {
                        success:false
                    })
                );

            }


        });



        return;

    }







    res.writeHead(404);
    res.end();


});







// ==============================
// WebSocket Windows
// ==============================

const wss = new WebSocket.Server(
{
    server,
    path:"/ws"
});



wss.on("connection", ws =>
{


    console.log(
        "Windows connecté"
    );



    ws.on("message", message =>
    {


        const data =
            JSON.parse(message);



        if(
            data.type==="register"
            &&
            data.client==="admin"
        )
        {


            adminClients.push(ws);


            sendRobloxStatus();

        }



    });



    ws.on("close",()=>{


        adminClients =
            adminClients.filter(
                x=>x!==ws
            );


    });


});







function sendRobloxStatus()
{

    const status =
        Object.keys(
            robloxServers
        ).length > 0;



    const message =
    {
        type:"roblox_status",
        connected:status
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







// Nettoyage

setInterval(()=>{


    const now = Date.now();



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

            delete robloxServers[id];

        }

    }


},10000);






server.listen(PORT,()=>{

    console.log(
        "Serveur lancé sur port",
        PORT
    );

});