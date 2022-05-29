/*
Create and export configuration variables
*/


//General container for all the environments

var environments={

};

//Staging (default) object
environments.staging={
    'httpPort': 3000,
    'httpsPort':3001,
    'envName':'staging',
    'hashingSecret':'thisIsASecret',
    'maxChecks': 5,
    'twilio' : {
        'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone' : '+15005550006'
      }
};

//Production object
environments.production={
    'httpPort': 5000,
    'httpsPort':5001,
    'envName':'production',
    'hashingSecret':'thisIsAlsoASecret',
    'maxChecks': 5,
    'twilio':{
        'accountSid':'',
        'authToken':'',
        'fromPhone':''
    }
};

//Determine which environment was passed as a command-line argument
var currentEnv=typeof(process.env.NODE_ENV)=='string'?process.env.NODE_ENV.toLowerCase():'';

//Check if the environment in use is a defined environment
var envToExport=typeof(environments[currentEnv])=='object'?environments[currentEnv]:environments.staging;

//Export module
module.exports=envToExport;