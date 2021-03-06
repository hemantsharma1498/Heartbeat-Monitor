/**
 * CLI related taks
 */

//Dependencies
let readline=require('readline');
let util=require('util');
let debug=util.debuglog('cli');
let events=require('events');
const { match } = require('assert');
const { type } = require('os');
class _events extends events{};
let e= new _events();
let os=require('os');
let v8=require('v8');
let _data=require('./data');
let _logs=require('./logs');
let helpers=require('./helpers')
//Instantiate the CLI module object
let cli={};

//Input handlers
e.on('man', function(str){
    cli.responders.help();
});

e.on('help', function(str){
    cli.responders.help();
});

e.on('exit', function(str){
    cli.responders.exit();
});

e.on('stats', function(str){
    cli.responders.stats();
});

e.on('list users', function(str){
    cli.responders.listUsers();
});

e.on('more user info', function(str){
    cli.responders.moreUserInfo(str);
});

e.on('list checks', function(str){
    cli.responders.listChecks(str);
});

e.on('more check info', function(str){
    cli.responders.moreCheckInfo(str);
});

e.on('list logs', function(str){
    cli.responders.listLogs();
});

e.on('more log info', function(str){
    cli.responders.moreLogInfo(str);
});



//Input responders
cli.responders={};


//Help/man CLI 
cli.responders.help=function(){
    let commands={
        'exit':'Kill the app and exit',
        'man': 'Show this help page',
        'help':'Alias oet statistics on the underlying operating system and resources utilization',
        'list users':'Show all the registered (undeleted) users',
        'more user into --{userId}':'Show details of a specific user',
        'list check --up --down':'Show a list of all the active checks on the system and their state. "--up" and "--down" are optional flags',
        'more check info --{checkId}':'Show details of a specified check',
        'list logs':'Show a list of all log files available (compressed only)', 
        'more log info --{fileName}':'Show details of a specific log file'
    };

    //Show a header for the help page that is as wide as the screen
    cli.horizontalLine();
    cli.centered('CLI MANUAL');
    cli.horizontalLine();
    cli.verticalSpace(2);

    //Show each command and its expalaination 
    for(let key in commands){
        if(commands.hasOwnProperty(key)){
            let value=commands[key];
            let line='\x1b[33m'+key+'\x1b[0m';
            let padding=60-line.length;

            for(let i=0;i<padding;i++){
                line+=' ';
            }

            line+=value;
            console.log(line);
            cli.verticalSpace();
        }
    }
    cli.verticalSpace(1);
    //End with another horizontal line
    cli.horizontalLine();
    
};

//Vertical space
cli.verticalSpace=function(lines){
    lines=typeof(lines)=='number'&&lines>0?lines:1;
    for(i=0;i<lines;i++){
        console.log('');
    }
};

//Horizontal line
cli.horizontalLine=function(){
    //Get current screen size
    let width=process.stdout.columns;

    let line='';
    for(i=0;i<width;i++){
        line+='-';
    }
    console.log(line);
}

//Centered text
cli.centered=function(str){
    str=typeof(str)=='string'&&str.trim().length>0?str.trim():'';

    //Get current screen size
    let width=process.stdout.columns;
    
    //Calculate left padding
    let leftPadding=Math.floor((width-str.length)/2);
    let line='';
    //Add the left padding spaces before the text
    for(let i=0;i<leftPadding;i++){
        line+=' ';
    }
    line+=str;
    console.log(line);
}


//Stats
cli.responders.stats=function(){
    let stats={
        'Load Average':os.loadavg().join(),
        'CPU Count':os.cpus().length,
        'Free Memory':os.freemem(),
        'Current Malloced Memory':v8.getHeapStatistics().malloced_memory,
        'Peak Malloced Memory':v8.getHeapStatistics().peak_malloced_memory,
        'Allocated Heap Used (%)':Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size)*100),
        'Available Heap Allocated (%)':Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit)*100),
        'Uptime':os.uptime()+' Seconds',

    };


    //Create a header for the page
    cli.horizontalLine();
    cli.centered('PROGRAM STATISTICS');
    cli.horizontalLine();
    cli.verticalSpace(2);

    //Show each command and its expalaination 
    for(let key in stats){
        if(stats.hasOwnProperty(key)){
            let value=stats[key];
            let line='\x1b[33m'+key+'\x1b[0m';
            let padding=60-line.length;

            for(let i=0;i<padding;i++){
                line+=' ';
            }

            line+=value;
            console.log(line);
            cli.verticalSpace();
        }
    }
    cli.verticalSpace(1);

    //End with another horizontal line
    cli.horizontalLine();


};

//List users
cli.responders.listUsers=function(){
    _data.list('users', function(err, UserIds){
        if(!err&&UserIds&&UserIds.length>0){
            cli.verticalSpace();
            UserIds.forEach(function(UserId){
                _data.read('users', UserId, function(err, userData){
                    if(!err&&userData){
                        let line='Name: '+userData.firstName+' '+userData.lastName+', Phone: '+userData.phone+', Checks: ';
                        let totalChecks=typeof(userData.checks)=='object'&&userData.checks instanceof Array?userData.checks.length:0;
                        line+=totalChecks;
                        console.log(line);
                        cli.verticalSpace();
                    }
                });
            });
        }
    });
};

//More user info
cli.responders.moreUserInfo=function(str){
    //Get ID from the string input
    let arr=str.split('--');
    let userId=typeof(arr[1])=='string'&&arr[1].trim().length>0?arr[1].trim():false;
    if(userId){
        //Find user
        _data.read('users', userId, function(err, userData){
            if(!err&&userData){
                //Remove hashed password
                delete userData.hashedPassword;

                //Print JSON object with text highlighting
                cli.verticalSpace();
                console.dir(userData, {'colors': true});
                cli.verticalSpace();
            }
        });
    }
};

//Checks
cli.responders.listChecks=function(str){
    _data.list('checks', function(err, checkIds){
        if(!err&&checkIds&&checkIds.length>0){
            cli.verticalSpace();
            checkIds.forEach(function(checkId){
                _data.read('checks', checkId, function(err, checkData){
                    let includeCheck=false;
                    let lowerString=str.toLowerCase();

                    //Get the state of the check, default to down
                    let state=typeof(checkData.state)=='string'?checkData.state:'down';

                    //Get the state or default to unknown
                    let stateorUknown=typeof(checkData.state)=='string'?checkData.state:'unknown';
                    
                    //Include the current check based on user state requirements
                    if(lowerString.indexOf('--'+state)>-1||lowerString.indexOf('down')==-1&&lowerString.indexOf('up')==-1){
                        let line={
                            'ID':checkData.id,
                            'Method':checkData.method.toUpperCase(),
                            'Url':checkData.protocol+'://'+checkData.url,
                            'State': stateorUknown
                        };

                        for(key in line){
                            if(line.hasOwnProperty(key)){
                                console.log(key+': '+line[key]);
                            }
                        }
                        // console.log(line);
                        cli.verticalSpace();
                    }
                });
            });
        }
    });
};

//More check info
cli.responders.moreCheckInfo=function(str){
    //Get checkId from the string input
    let arr=str.split('--');
    let checkId=typeof(arr[1])=='string'&&arr[1].trim().length>0?arr[1].trim():false;
    if(checkId){
        //Find user
        _data.read('checks', checkId, function(err, checkData){
            if(!err&&checkData){
                
                //Print JSON object with text highlighting
                cli.verticalSpace();
                console.dir(checkData, {'colors': true});
                cli.verticalSpace();
            }
        });
    }
};

//List logs
cli.responders.listLogs=function(){
    _logs.list(true, function(err, logFiles){
        if(!err&&logFiles&&logFiles.length>0){
            cli.verticalSpace();
            logFiles.forEach(function(file){
                if(file.indexOf('-')>-1){
                    console.log(file);
                }
            });
        }
    });
};

//More logs info
cli.responders.moreLogInfo=function(str){
    //Get log ID from the string input
    let arr=str.split('--');
    let logFileName=typeof(arr[1])=='string'&&arr[1].trim().length>0?arr[1].trim():false;
    
    if(logFileName){
        cli.verticalSpace();

        //Decompress the log
        _logs.decompress(logFileName, function(err, logData){
            if(!err&&logData){
                let logArr=logData.split('\n');
                logArr.forEach(function(jsonString){
                    let logObject=helpers.parseJsonToObject(jsonString);
                    if(logObject&&JSON.stringify(logObject)!=={}){
                        console.dir(logObject, {colors: true});
                        cli.verticalSpace();
                    }
                });
            }
        });
    }
};



//Exit
cli.responders.exit=function(){
    process.exit(0);
};


//Input processor
cli.processInput=function(str){
    str=typeof(str)=='string'&&str.trim().length>0?str.trim():false;

    //Only process for non empty spaces/characters
    if(str){
        //Lay out different unique strings that identify questions
        let uniqueInputs=[
            'man',
            'help',
            'exit',
            'stats',
            'list users',
            'more user info',
            'list checks',
            'more check info',
            'list logs', 
            'more log info'
        ];

        //Go through the array to find a match for the input string
        let matchFound=false;
        let counter=0;


        // uniqueInputs.forEach(function(input){
        //     if(uniqueInputs.indexOf(str.toLowerCase())>-1){
        //         matchFound=true;

        //         //Emit an event that corresponds to the input provided by the user
        //         e.emit(input, str);
        //         return true;
        //     }
        // })


        uniqueInputs.some(function(input){
           if(str.toLowerCase().indexOf(input)>-1){
               matchFound=true;

               //Emit an event that corresponds to the input provided by the user
               e.emit(input, str);
               return true;
           }
        });

        if(!matchFound){
            console.log("Please try again");
        }


    }
};



//Init script
cli.init=function(){
    //Send the start message in dark blue
    console.log('\x1b[34m%s\x1b[0m', "The CLI is running");

    //Start the interface
    let _interface=readline.createInterface({
        input:process.stdin,
        output:process.stdout,
        prompt:'> '
    });    

    //Create an initial prompt for the user
    _interface.prompt();

    //Handle each line of input seperately
    _interface.on('line', function(str){
        //Send to the input processor
        cli.processInput(str);

        //Reinitialise the prompt for the user
        _interface.prompt();
    });

    //If the user stops the CLI, kill relevant processes
    _interface.on('close', function(){
        process.exit(0);
    });

};


//Export the module
module.exports=cli;
