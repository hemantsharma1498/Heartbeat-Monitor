//Dependencies
const path=require('path');
const fs=require('fs');
const _data=require('./data');
const http=require('http');
const https=require('https');
const helpers=require('./helpers');
const url=require('url');
const { type } = require('os');
const _logs=require('./logs');
const util=require('util');
const debug=util.debuglog('workers');

//Creating workers object
let workers={};

//Look up all the checks, get the data and send to a validator
workers.gatherAllChecks=function(){
    _data.list('checks', function(err, checks){
        if(!err&&checks&&checks.length>0){
            checks.forEach(function(check){
                //Read the check data
                _data.read('checks', check, function(err, ogCheckData){
                    if(!err&&ogCheckData){
                        //Send ogCheckData to check validator
                        //Validator will let the function continue or log an error
                        workers.validateCheckData(ogCheckData);
                    }else{
                        debug("Error: Could not read check(s) data")
                    }
                });
            });
        }else{
            debug("Error: Could not find any checks to prcoess");
        }
    });
};


//Validate check data
workers.validateCheckData=function(ogCheckData){
    ogCheckData=typeof(ogCheckData)=='object'&&ogCheckData!==null?ogCheckData:{};
   
    ogCheckData.id=typeof(ogCheckData.id)=='string'&&ogCheckData.id.trim().length==20?ogCheckData.id:false;
    ogCheckData.phone=typeof(ogCheckData.phone)=='string'&&ogCheckData.phone.trim().length==10?ogCheckData.phone:false;
    ogCheckData.protocol=typeof(ogCheckData.protocol)=='string'&&['http', 'https']?ogCheckData.protocol:false;
    ogCheckData.url=typeof(ogCheckData.url)=='string'&&ogCheckData.url.trim().length>0?ogCheckData.url:false;
    ogCheckData.method=typeof(ogCheckData.method)=='string'&&['post', 'get', 'put', 'delete']?ogCheckData.method:false;
    ogCheckData.successCodes=typeof(ogCheckData.successCodes)=='object'&&ogCheckData.successCodes instanceof Array&&ogCheckData.successCodes.length>0?ogCheckData.successCodes:false;
    ogCheckData.timeoutSeconds=typeof(ogCheckData.timeoutSeconds)=='number'&&ogCheckData.timeoutSeconds<5&&ogCheckData.timeoutSeconds%1===0&&ogCheckData.timeoutSeconds>=0?ogCheckData.timeoutSeconds:false;

    //Set the keys that may not be set (if the workers have never seen this check before)
    ogCheckData.state=typeof(ogCheckData.state)=='string'&&['up', 'down']?ogCheckData.state:'down';
    ogCheckData.lastChecked=typeof(ogCheckData.lastChecked)=='number'&&ogCheckData.lastChecked>0?ogCheckData.lastChecked:false;

    //If all checks pass, send data over
    if(ogCheckData.id&&
        ogCheckData.phone&&
        ogCheckData.protocol&&
        ogCheckData.url&&
        ogCheckData.method&&
        ogCheckData.successCodes&&
        ogCheckData.timeoutSeconds    
     ){
        workers.performCheck(ogCheckData);
     }else{
         debug("Error: Impropper formatting. Skipping.");
     }

};


//Perform the check, send the check data as well as outcome
workers.performCheck=function(ogCheckData){
    //Prepare initial check outcome
    let checkOutcome={
        'error':false,
        'responseCode':false
    };

    //Mark the outcome hasn't been sent yet
    let outcomeSent=false;

    //Parse the hostname and the path out of the original check data
    let parsedURL=url.parse(ogCheckData.protocol+'://'+ogCheckData.url, true);
    let hostName=parsedURL.hostname;
    let path=parsedURL.path; //Using path to get the query string

    //Construct the request
    let requestDetails={
        'protocol': ogCheckData.protocol+':',
        'hostname': hostName,
        'method': ogCheckData.method.toUpperCase(),
        'path': path, 
        'timeout':ogCheckData.timeoutSeconds*1000
    };

    //Insantiate the request object using HTTP/HTTPS module
    let _moduleToUse=ogCheckData.protocol=='http'?http:https;
    
    let req=_moduleToUse.request(requestDetails, function(res){
        //Get status of the request sent
        let status=res.statusCode;
        
        //Update checkOutcome
        checkOutcome.responseCode=status;
        if(!outcomeSent){
            workers.processCheckOutcome(ogCheckData, checkOutcome);
            outcomeSent=true;
        }
    });

    //Case for the error event so error isn't thrown
    req.on('error', function(e){
        //Update checkOutcome
        checkOutcome.error={
            'error':true,
            'value':e
        };

        if(!outcomeSent){
            workers.processCheckOutcome(ogCheckData, checkOutcome);
            outcomeSent=true;
        }
    });

    //Bind to the timeout event
    req.on('timeout', function(e){
        //Update checkOutcome
        checkOutcome.error={
            'error':true,
            'value':'timeout'
        };

        if(!outcomeSent){
            workers.processCheckOutcome(ogCheckData, checkOutcome);
            outcomeSent=true;
        }
    });

    req.end();

};


//Process the check outcome, update data if need and trigger alerts if needed
//Special logic for previously untested check, no alerts
workers.processCheckOutcome=function(ogCheckData, checkOutcome){
    //Decide if check is 'up' or 'down'
    let state=!checkOutcome.error&&checkOutcome.responseCode&&ogCheckData.successCodes.indexOf(checkOutcome.responseCode)>-1?'up':'down';

    //Decide if an alert is needed
    let alertWarranted=ogCheckData.lastChecked&&ogCheckData.state!=state?true:false;

    let checkTime=Date.now();
    workers.log(ogCheckData, checkOutcome, state, alertWarranted, checkTime);


    //Update the check data
    let newCheckData=ogCheckData;
    newCheckData.state=state;
    newCheckData.lastChecked=Date.now();


    //Save the updates to disk
    _data.update('checks', newCheckData.id, newCheckData, function(err){
        if(!err){
            if(alertWarranted){
                workers.alertUser(newCheckData);
            }else{
                debug("Check outcome unchanged");
            }
        }else{
            debug("Error while saving updates to check");
        }
    });
};


//Alert the user according to the change in the check status
workers.alertUser=function(newCheckData){
    let msg='Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.phone, msg, function(err){
        if(!err){
            debug("User alerted successfully via SMS: ", msg);
        }else{
            debug("Unable to alert user to state change");
        }
    });
}


workers.log=function(ogCheckData, checkOutcome, state, alertWarranted, checkTime){
    let logData={
        'check':ogCheckData,
        'outcome':checkOutcome,
        'state':state,
        'alert':alertWarranted,
        'time':checkTime
    }

    //Convert JSON object to JSON string
    let logDataString=JSON.stringify(logData);

    //Determine the name of the log file
    let logFileName=ogCheckData.id;
    _logs.append(logFileName, logDataString, function(err){
        if(!err){
            debug("Log successfull");
        }else{ 
            debug("Unable to save log to file");
        }
    });
};



//Workers loop which executes the worke process once a minute
workers.loop=function(){
    setInterval(function(){
        workers.gatherAllChecks();
    }, 1000*60);
}


//Rotate (compress) log files
workers.rotateLogs=function(){
    //List all uncompressed files in .log
    _logs.list(false, function(err, logs){
        if(!err&&logs&&logs.length>0){
            logs.forEach(function(logName){
                //Compress data to a different file
                let logId=logName.replace('.log', '');
                let compressFileId=logId+'-'+Date.now();

                _logs.compress(logId, compressFileId, function(err){
                    if(!err){
                        //Truncate the log
                        _logs.truncate(logId, function(err){
                            if(!err){
                                debug("Success truncating log file");
                            }else{
                                debug("Unable to truncate log file");
                            }
                        });
                    }else{
                        debug("Error compress log files", err);
                    }
                });
            });
        }else{
            debug('No logs to rotate');
        }
    });
}


//Timer to execute the log process once a day
workers.logRotationLoop=function(){
    setInterval(function(){
        workers.rotateLogs();
    }, 1000*60*60*24);
};



//Instantiate the object
workers.init=function(){
    //Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

    //Execute all the checks immediately
    workers.gatherAllChecks();

    //Call the loop so the checks will exceute later
    workers.loop();

    //Compress all logs immmediately
    workers.rotateLogs();

    //Call the compression loop, so logs get compressed later on
    workers.logRotationLoop();
};









//Export the workers module
module.exports=workers;