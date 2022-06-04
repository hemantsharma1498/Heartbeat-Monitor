//Dependencies
let server=require('./lib/server');
let workers=require('./lib/workers');
let cli=require('./lib/cli');

//Declare the app
let app={};

//App initilisation function
app.init=function(){
    //Start the server
    server.init();

    //Start the workers
    workers.init();

    //Start the CLI at last
    setTimeout(function(){
        cli.init();
    }, 50);
};

//Execute the function
app.init();

//Export the app
module.exports=app;