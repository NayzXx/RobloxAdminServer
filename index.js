const http = require("http");
const WebSocket = require("ws");


const PORT = process.env.PORT || 3000;



let adminClients = [];

let robloxServers = {};





const server = http.createServer((req,res)=>{


    console.log(
        "Requête reçue :",
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
    // Roblox Register
    // ==========================


    if(
        req.url === "/roblox/register"
        &&
        req.method === "POST"
    )
    {


        console.log(
            "ROBLOX REGISTER RECU"
        );


        let body="";


        req.on("data",chunk=>
        {
            body += chunk;
        });



        req.on("end",()=>{


            const data =
                JSON.parse(body);



            robloxServers[data.jobId] =
            {

                placeId:data.placeId,

                players:data.players,

                lastHeartbeat:Date.now()

            };



            console.log(
                "Serveur Roblox :",
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
    // Roblox Heartbeat
    // ==========================


    if(
        req.url === "/roblox/heartbeat"
        &&
        req.method === "POST"
    )
    {


        console.log(
            "ROBLOX HEARTBEAT RECU"
        );



        let body="";


        req.on("data",chunk=>
        {
            body += chunk;
        });



        req.on("end",()=>{


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
                JSON.stringify(
                {
                    success:true
                })
            );

        });



        return;

    }





    res.writeHead(404);
    res.end();


});









// ==========================
// WebSocket Windows
// ==========================


const wss = new WebSocket.Server(
{
    server,
    path:"/ws"
});




wss.on("connection",ws=>{


    console.log(
        "Connexion WebSocket"
    );



    ws.on("message",message=>{


        const data =
            JSON.parse(message);



        if(
            data.type==="register"
            &&
            data.client==="admin"
        )
        {


            adminClients.push(ws);



            console.log(
                "Admin connecté"
            );



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


    const connected =
        Object.keys(
            robloxServers
        ).length > 0;




    console.log(
        "Statut Roblox :",
        connected
    );



    let message =
    {

        type:"roblox_status",

        connected:connected

    };




    adminClients.forEach(client=>{


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








// Nettoyage des serveurs morts

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


            console.log(
                "Serveur supprimé :",
                id
            );


            delete robloxServers[id];


        }


    }



    sendRobloxStatus();



},10000);






server.listen(PORT,()=>{


    console.log(
        "Serveur lancé sur port",
        PORT
    );


});