//Various helper functions needed throughout the code


//Dependencies
const crypto=require('crypto');
const config=require('./config');
const https=require('https');
const querystring=require('querystring');
const path=require('path');
const fs=require('fs');
const { type } = require('os');

//Helper functions
let helpers={};






//Password hashing helper
helpers.hash=function(str){
    if(typeof(str)=='string'&&str.length>0){
        let hash=crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    }else{
        return false;
    }
};

//Parsing to JSON object helper
helpers.parsedtoJsonObject=function(str){
    try{
        let obj=JSON.parse(str);
        return obj;
    }catch(err){
        return {};
    }
}

//Creating TokenId helper
helpers.stringRandomizer=function(str){
    let strlength=typeof(str)=='number'?str:false;
    if(strlength){
        let validCharacters='abcdefghijklmnopqrstuvwxyz0123456789';
        let tokenId='';

        for(i=0;i<strlength;i++){
            let addChar=validCharacters.charAt(Math.floor(Math.random()*validCharacters.length));
            tokenId+=addChar;
        }

        return tokenId;
    }else{
        return false;
    }
}

//SMS helper: Sending SMS via Twilio
helpers.sendTwilioSms=function(phone, msg, callback){
    //Validate inputs
    phone=typeof(phone)=='string'&&phone.trim().length==10?phone.trim():false;
    msg=typeof(msg)=='string'&&msg.trim().length>0&&msg.trim().length<=160?msg.trim():false;

    if(phone&&msg){
        //Configure the request payload
        let payload={
            'From':config.twilio.fromPhone,
            'To':'+91'+phone,
            'Body':msg
        }

        //Convert payload to JSON string
        let stringPayload=querystring.stringify(payload);
        
        //Configure the request details
        let requestDetails={
            'protocol':'https:',
            'hostname':'api.twilio.com',
            'method': 'POST',
            'path':'/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth':config.twilio.accountSid+':'+config.twilio.authToken,
            'headers':{
                'Content-type':'application/x-www-form-urlencoded',
                'Content-Length':Buffer.byteLength(stringPayload)
            }
        };
        

        //Create a request object
        let request=https.request(requestDetails, function(res){
            //Get the status of the sent request
            let status=res.statusCode;

            //Success callback if request goes through
            if(status==200||status==201){
                callback(false);
            }else{
                callback('Status code returned'+status);
            }
        });

        //Error in case request is a failure
        request.on('error', function(e){
            callback(e);
        });

        //Add the payload
        request.write(stringPayload);
        
        //End the request
        request.end();
    }else{
        callback('Invalid/missing paramters');
    }
}


//Get string content of a content
helpers.getTemplate=function(templateName, data, callback){
    templateName=typeof(templateName)=='string'&&templateName.length>0?templateName:false;
    data=typeof(data)=='object'&&data!==null?data:{};

    if(templateName){
        let templatesDir=path.join(__dirname, '/../templates/');
        fs.readFile(templatesDir+templateName+'.html', 'utf-8', function(err, str){
            if(!err&&str&&str.length>0){
                //Interpolate the string
                let finalStr=helpers.interpolate(str, data);
                callback(false, finalStr);
            }else{
                callback('No template found');
            }
        })
    }else{
        callback('Valid template name was not specified');
    }
}

//Add universal header & footer to a string and pass the provided data object to the header and footer for interpolation
helpers.addUniversalTemplates=function(str, data, callback){
    str=typeof(str)=='string'&&str.length>0?str:'';
    data=typeof(data)=='object'&&data!==null?data:{};

    //Get header
    helpers.getTemplate('_header', data, function(err, headerStr){
        if(!err&&headerStr){
            helpers.getTemplate('_footer', data, function(err, footerStr){
                if(!err&&footerStr){
                    let fullStr=headerStr+str+footerStr;
                    callback(false, fullStr);
                }else{
                callback('Could not find footer template');
                }
            });
        }else{
            callback('Could not find header template');
        }
    })
}


//Take a given string and data object and find/replace all the keys in it
helpers.interpolate=function(str, data){
    str=typeof(str)=='string'&&str.length>0?str:'';
    data=typeof(data)=='object'&&data!==null?data:{};

    //Add the templateGlobals to the data objet, prepending their key with "global"
    for(let keyName in config.templateGlobals){
        if(config.templateGlobals.hasOwnProperty(keyName)){
            data['global.'+keyName]=config.templateGlobals[keyName];
        }
    }

    //For each key in the data object, insert its value into the key at the corressponding placeholder
    for(let key in data){
        if(data.hasOwnProperty(key)&&typeof(data[key])=='string'){
            let replace=data[key];
            let find='{'+key+'}';
            str=str.replace(find, replace);
        }
    }

    return str;
}

//Get contents of a static (aka public) asset
helpers.getStaticAsset=function(fileName, callback){
    fileName=typeof(fileName)=='string'&&fileName.length>0?fileName:false;
    if(fileName){
        let publicDir=path.join(__dirname, '/../public/');
        fs.readFile(publicDir+fileName, function(err, data){
            if(!err&&data){
                callback(false, data);
            }else{
                callback('No file could be found');
            }
        });
    }else{
        callback('A valid file name was not specified');
    }
}

//Export the module
module.exports=helpers;