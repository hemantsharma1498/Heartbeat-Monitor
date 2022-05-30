//Dependencies
let server=require('./lib/server');
let workers=require('./lib/workers');

//Declare the app
let app={};

//App initilisation function
app.init=function(){
    //Start the server
    server.init();

    //Start the workers
    workers.init();
};

//Execute the function
app.init();

//Export the app
module.exports=app;