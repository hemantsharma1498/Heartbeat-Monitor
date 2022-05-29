//Various helper functions needed throughout the code


//Dependencies
const crypto=require('crypto');
const config=require('./config');
const https=require('https');
const querystring=require('querystring');

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



//Export the module
module.exports=helpers;