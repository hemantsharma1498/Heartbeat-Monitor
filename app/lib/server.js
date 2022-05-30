

//Dependencies
const http=require('http');
const https=require('https');
const url=require('url');
const StringDecoder=require('string_decoder').StringDecoder;
const fs=require('fs');
const config=require('./config');
const _data=require('./data');
const helpers = require('./helpers');
const handlers=require('./handlers');
const path=require('path');


//Instantiate the server module object
let server={};



//Instatiating the HTTP server
server.httpServer=http.createServer(function(req, res){
    server.unifiedServer(req, res);
});

//Instatiating the HTTPS server
server.httpsServerOptions={
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer=https.createServer(server.httpsServerOptions, function(req, res){
    server.unifiedServer(req, res);
});



//Server logic for both http & https
server.unifiedServer=function(req, res){
    //Get URL and parse it
    var parsedUrl=url.parse(req.url, true);

    //Get Path from the URL
    var path=parsedUrl.pathname;    
    var trimmedPath=path.replace(/^\/+|\/+$/g, '');
    
    //Get Query string
    var queryStringObj=parsedUrl.query;

    //Get HTTP method
    var method=req.method.toLowerCase();

    //Get the headers as an object
    var headers=req.headers;

    //Get the payload if any
    var decoder=new StringDecoder('utf-8');
    var buffer='';
    req.on('data', function(data){
        buffer+=decoder.write(data);
    });
        //To end the stream of data into var buffer
    req.on('end', function(){
        buffer+=decoder.end();

        //Choose handler to route the request to. If not found, route to 404 handler

        var chosenHandler=typeof(server.router[trimmedPath])!== 'undefined'?server.router[trimmedPath]:handlers.notFound;

        //Construct the data object to send to the handler

        var data={
            'trimmedPath':trimmedPath,
            'queryStringObject':queryStringObj,
            'method':method,
            'headers':headers,
            'payload':helpers.parsedtoJsonObject(buffer)
        };

       

        //Route the request to the handler specified
        chosenHandler(data, function(statusCode, payload){
            //Use the status code called back by the handler or default to empty object
            statusCode=typeof(statusCode)=='number'?statusCode:200;
            
            //use the payload called back by the handler or default to empty object
            payload=typeof(payload)=='object'?payload:{};

            //Convert the payload to a string
            var payloadString=JSON.stringify(payload);

            //Return the response
            res.setHeader('Content-type', 'application/JSON')
            res.writeHead(statusCode);
            res.end(payloadString);
            console.log('Return response: ', statusCode, payloadString);
        });


     });
    
};



//Initialise the server
server.init=function(){

    //Starting the HTTP server
    server.httpServer.listen(config.httpPort, function(){
        console.log("Server is listening on port: "+config.httpPort);
    });

    //Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log("Server is listening on port: "+config.httpsPort);
    });

};



//Defining a request router
server.router={
    'ping': handlers.ping, 
    'users':handlers.users,
    'tokens':handlers.tokens,
    'checks':handlers.checks
}



//Export the module
module.exports=server;