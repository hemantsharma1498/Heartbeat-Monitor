

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
const util=require('util');
const { type } = require('os');
const debug=util.debuglog('server');


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
    let parsedUrl=url.parse(req.url, true);

    //Get Path from the URL
    let path=parsedUrl.pathname;    
    let trimmedPath=path.replace(/^\/+|\/+$/g, '');
    
    //Get Query string
    let queryStringObj=parsedUrl.query;

    //Get HTTP method
    let method=req.method.toLowerCase();

    //Get the headers as an object
    let headers=req.headers;

    //Get the payload if any
    let decoder=new StringDecoder('utf-8');
    let buffer='';
    req.on('data', function(data){
        buffer+=decoder.write(data);
    });
        //To end the stream of data into let buffer
    req.on('end', function(){
        buffer+=decoder.end();

        //Choose handler to route the request to. If not found, route to 404 handler

        let chosenHandler=typeof(server.router[trimmedPath])!== 'undefined'?server.router[trimmedPath]:handlers.notFound;

        //If request is within the public directory, use public handler instead
        chosenHandler=trimmedPath.indexOf('public/')>-1?handlers.public:chosenHandler;

        //Construct the data object to send to the handler

        let data={
            'trimmedPath':trimmedPath,
            'queryStringObject':queryStringObj,
            'method':method,
            'headers':headers,
            'payload':helpers.parseJsonToObject(buffer)
        };

       

        //Route the request to the handler specified
        chosenHandler(data, function(statusCode, payload, contentType){
            
            //Determine the type of response
            contentType=typeof(contentType)=='string'?contentType:'json';

            //Use the status code called back by the handler or default to empty object
            statusCode=typeof(statusCode)=='number'?statusCode:200;
            
            let payloadString;
            //Return the response parts that are content specific
            if(contentType=='json'){
                res.setHeader('Content-type', 'application/json')
                payload=typeof(payload)=='object'?payload:{};
                payloadString=JSON.stringify(payload);
            }else if(contentType=='html'){
                res.setHeader('Content-type', 'text/html');
                payloadString=typeof(payload)=='string'?payload:'';

            }else if(contentType=='favicon'){
                res.setHeader('Content-type', 'image/x-icon');
                payloadString=typeof(payload)!=='undefined'?payload:'';

            }
            else if(contentType=='css'){
                res.setHeader('Content-type', 'text/css');
                payloadString=typeof(payload)!=='undefined'?payload:'';

            }
            else if(contentType=='png'){
                res.setHeader('Content-type', 'image/png');
                payloadString=typeof(payload)!=='undefined'?payload:'';

            }
            else if(contentType=='jpg'){
                res.setHeader('Content-type', 'image/jpeg');
                payloadString=typeof(payload)!=='undefined'?payload:'';

            }
            else if(contentType=='plain'){
                res.setHeader('Content-type', 'text/plain');
                payloadString=typeof(payload)!=='undefined'?payload:'';

            }
            //Return response-parts that are common to all content types
            res.writeHead(statusCode);
            res.end(payloadString);

            //If the response is 200, print green. Otherwise print red
            if(statusCode==200){
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+'/ '+trimmedPath+' '+statusCode);
            }else{
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+'/ '+trimmedPath+' '+statusCode);
            }
        });


     });
    
};



//Initialise the server
server.init=function(){

    //Starting the HTTP server
    server.httpServer.listen(config.httpPort, function(){
    console.log('\x1b[34m%s\x1b[0m', "Server is listening on port: "+config.httpPort);
    });

    //Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log('\x1b[35m%s\x1b[0m', "Server is listening on port: "+config.httpsPort);
    
    });

};



//Defining a request router
server.router={
    '':handlers.index,
    'account/create':handlers.accountCreate,
    'account/edit':handlers.accountEdit,
    'account/deleted':handlers.accountDeleted,
    'session/create':handlers.sessionCreate,
    'session/deleted':handlers.sessionDeleted,
    'checks/all':handlers.checksList,
    'checks/create':handlers.checksCreate,
    'checks/edit':handlers.checksEdit,
    'ping': handlers.ping, 
    'api/users':handlers.users,
    'api/tokens':handlers.tokens,
    'api/checks':handlers.checks,
    'favicon.ico':handlers.favicon,
    'public':handlers.public
}



//Export the module
module.exports=server;