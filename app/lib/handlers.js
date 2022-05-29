//Dependencies
const _data=require('./data')
const helpers=require('./helpers');
const config=require('./config');

//Defining the handlers
const handlers={};

//Ping handler
handlers.ping=function(data, callback){
    callback(200);
};


handlers.users=function(data, callback){
    let acceptableMethods=['post', 'put', 'get', 'delete'];
    if(acceptableMethods.indexOf(data.method)>-1){
        handlers._users[data.method](data, callback);
    }else{
        callback(405);
    }
};

//Subhandlers for the method
handlers._users={};


//Users POST
//Required data: firstName, lastName, phone, password, tosAgreement
handlers._users.post=function(data, callback){
    //Check if firstName, lastName, phone, password, tosAgreement values are valid
    let firstName=typeof(data.payload.firstName)=='string' && data.payload.firstName.trim().length>0?data.payload.firstName:false;
    let lastName=typeof(data.payload.lastName)=='string' && data.payload.lastName.trim().length>0?data.payload.lastName:false;
    let phone=typeof(data.payload.phone)=='string' && data.payload.phone.trim().length==10?data.payload.phone:false;
    let password=typeof(data.payload.password)=='string' && data.payload.password.trim().length>0?data.payload.password:false;
    let tosAgreement=typeof(data.payload.tosAgreement)=='boolean'&&data.payload.tosAgreement==true?data.payload.tosAgreement:false;

    //Check if user doesn't already exist for the given phone number
    if(firstName&&lastName&&phone&&tosAgreement){
        _data.read('users', phone, function(err){
            if(err){
                
                let hashedPassword=helpers.hash(password);

                if(hashedPassword){
                    //Create user object
                    let userObj={
                        'firstName':firstName,
                        'lastName':lastName,
                        'phone':phone,
                        'hashedPassword':hashedPassword,
                        'tosAgreement':true
                    };

                    _data.create('users', phone, userObj, function(err){
                        if(!err){
                            callback(200);
                        }else{
                            console.log(err);
                            callback(500,{'Error':'Could not create the user'});
                        }
                    });
                }else{
                    callback(500, {'Error': 'Could not hash user password'});
                }


                
            }else{
                callback(400, {'Error':'User exists for the given phone number'});
            }
        });
    }else{
        callback(400, {'Error':'Missing required field(s)'});
    }

};

//Users GET
//Required data: phone
handlers._users.get=function(data, callback){
    //Check validity of phone number
    let phone=typeof(data.queryStringObject.phone)=='string'&&data.queryStringObject.phone.trim().length==10?data.queryStringObject.phone:false;

    if(phone){

        let token=typeof(data.headers.token)=='string'?data.headers.token:false;
        handlers._tokens.verifyToken(token, phone, function(isValid){
            if(isValid){
                _data.read('users', phone, function(err, data){
                    if(!err&&data){
                        //Remove hashing from password before returning data to user
                        delete data.hashedPassword;
                        callback(200, data);
                    }else{
                        callback(404, {'Error': 'User not found'});
                    }
                });
            }else{
                callback(403, {'Error':'Token either missing in header or invalid'});
            }
        });
       
    }else{
        callback(404, {'Error': 'Invalid phone number entered. Please try again'});
    }
};


//Users put
//Required data: phone & one of firstName, lastName, password
//Optional: Any other data except required data
//Only let authenticated users change data
handlers._users.put=function(data, callback){
    let phone=typeof(data.payload.phone)=='string'&&data.payload.phone.trim().length==10?data.payload.phone:false;
    
    let firstName=typeof(data.payload.firstName)=='string' && data.payload.firstName.trim().length>0?data.payload.firstName:false;
    let lastName=typeof(data.payload.lastName)=='string' && data.payload.lastName.trim().length>0?data.payload.lastName:false;
    let password=typeof(data.payload.password)=='string' && data.payload.password.trim().length>10?data.payload.password:false;

    if(phone){
        
        if(firstName||lastName||password){
            //Authenticate user using token
            let token=typeof(data.headers.token)=='string'?data.headers.token:false;
            handlers._tokens.verifyToken(token, phone, function(isValid){
                if(isValid){
                    if(firstName){
                        _data.read('users', phone, function(err, userData){
                            //If no error and user exists, update the data
                            if(!err&&userData){
                                if(firstName){
                                    userData.firstName=firstName;
                                }
                                if(lastName){
                                    userData.lastName=lastName;
                                }
                                if(password){
                                    let hashedPassword=helpers.hash(password);
                                    userData.hashedPassword=hashedPassword;
                                }
                                //Store the updates
                                _data.update('users', phone, userData, function(err){
                                    if(!err){
                                        callback(200);
                                    }else{
                                        console.log(err);
                                        callback(500, {'Error':'Could not update details'});
                                    }
                                });
                            }else{
                                callback(400, {'Error': 'User does not exist'});
                            }
                        });
                    
                }else{
                    callback(403, {'Error':'Token either missing in header or invalid'});
                }
            }else{
                callback(400, {'Error':'Missing required token header/incorrect token provided'});
            }
            });
        }else{
            callback(400, {'Error': 'Mandatory field(s) not entered'});
        }
    }else{
        callback(400, {'Error': 'Mandatory field(s) not entered'});
    }
};

//Users DELETE
//Required field: phone
// @TODO cleanup any other data files associated with user
handlers._users.delete=function(data, callback){
    //Check valitity of phone number
    let phone=typeof(data.queryStringObject.phone)=='string'&&data.queryStringObject.phone.trim().length==10?data.queryStringObject.phone:false;

    if(phone){
        //Authenticate user before letting delete data
        let token=typeof(data.headers.token)=='string'?data.headers.token:false;
        handlers._tokens.verifyToken(token, phone, function(isValid){
        if(isValid){
            _data.read('users', phone, function(err, userData){
                if(!err&&userData){
                   
                    //Delete the user's data
                    let userChecks=typeof(userData.checks)=='object'&&userData.checks instanceof Array?userData.checks:[];
                    let totalChecks=userChecks.length;

                    _data.delete('users', phone, function(err){
                        if(totalChecks>0){
                            let deletedChecks=0;
                            let deletionErr=false;

                            userChecks.forEach(function(checkId){
                                _data.delete('checks', checkId, function(err){
                                    if(err){
                                        deletionErr=true;
                                    }
                                    deletedChecks++;
                                    if(deletedChecks==totalChecks){
                                        callback(200);
                                    }
                                });
                            });
                        }else{
                            callback(200);
                        }
                    });
                          
                    
                }else{
                    callback(404, {'Error': 'User not found'});
                }
            });
        
        }else{
            callback(403, {'Error':'Token either missing in header or invalid'});
        }
        });
        }else{
        callback(404, {'Error': 'Could not find user'});
    }
};

//Handlers to for tokens
handlers.tokens=function(data, callback){
    let acceptableMethods=['post','get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method)>-1){
        handlers._tokens[data.method](data, callback);
    }else{
        callback(405);
    }
};


//Tokens subhandlers object
handlers._tokens={};


//Tokens post subhandler
//Required data: phone, password
handlers._tokens.post=function(data, callback){
    //Check validity of phone number and password
    let phone=typeof(data.payload.phone)=='string'&&data.payload.phone.trim().length==10?data.payload.phone:false;
    let password=typeof(data.payload.password)=='string'&&data.payload.password.trim().length>0?data.payload.password:false;

    if(phone&&password){
        //Lookup the user
        _data.read('users', phone, function(err, userData){
            //Check if password matches
            if(!err&&userData){
                let hashedPassword=helpers.hash(password);
                if(hashedPassword==userData.hashedPassword){
                    let tokenId=helpers.stringRandomizer(20);
                    let expiry=Date.now()+1000*3600;

                    let tokenObj={
                        'phone':phone,
                        'id':tokenId,
                        'expires':expiry
                    };

                    //Store the token
                    _data.create('tokens', tokenId, tokenObj, function(err, tokenData){
                        if(!err){
                            callback(200, tokenObj);
                        }else{
                            callback(500, {'Error':'Encountered an error'});
                        }
                    });
                }else{
                    callback(400, {'Error': 'Incorrect password entered'});
                }
            }else{
                callback(400, {'Error': 'User not found'});
            }
        });
    }else{
        callback(400, {'Error': 'Missing required field(s)'});
    }
};

//Tokens get subhandler
//Required data: Token ID
handlers._tokens.get=function(data, callback){
    let id=typeof(data.queryStringObject.id)=='string'&&data.queryStringObject.id.trim().length==20?data.queryStringObject.id:false;

    if(id){
        _data.read('tokens', id, function(err, tokenData){
            if(!err&&tokenData){
                callback(200, tokenData);
            }else{
                callback(500, {'Error': 'Unable to read from file'});
            }
        });
    }else{
        callback(400, {'Error': 'Not found, token may not exist'});
    }
};

//Tokens put subhandler
//Required data: Token Id, extend time
handlers._tokens.put=function(data, callback){
    let id=typeof(data.queryStringObject.id)=='string'&&data.queryStringObject.id.trim().length==20?data.queryStringObject.id.trim():false;
    let extend=typeof(data.queryStringObject.extend)=='boolean'?data.queryStringObject.extend:false;
    
    if(id&&extend){
        //Read token data to check if the token has expired
        _data.read('tokens', id, function(err, tokenData){
            if(tokenData.expires>Date.now()){
                //Add additional time to the expiry
                tokenData.expires=Date.now()+1000*3600;

                //Store the token
                _data.update('tokens', id, tokenData, function(err){
                    if(!err){
                        callback(200);
                    }else{
                        callback(500, {'Error':'Unable to update token'});
                    }
                });
            }else{
                callback(400, {'Error':'Token has expired. Create new token'});
            }
        });
    }else{
        callback(400, {'Error':'Required data missing'});
    }

};

//Tokens delete subhandler
//Required data: Token Id   
handlers._tokens.delete=function(data, callback){
     //Check valitity of phone number
     let id=typeof(data.queryStringObject.id)=='string'&&data.queryStringObject.id.trim().length==20?data.queryStringObject.id:false;

     if(id){
         _data.read('tokens', id, function(err, data){
             if(!err&&data){
                _data.delete('tokens', id, function(err){
                    callback(200);
                });
             }else{
                 callback(404, {'Error': 'Token not found'});
             }
         });
     }else{
         callback(404, {'Error': 'Could not find token'});
     }
};


//General token validity check
handlers._tokens.verifyToken=function(id, phone, callback){
   
    _data.read('tokens', id, function(err, tokenData){
        if(!err&&tokenData){
            if(tokenData.phone==phone){
                if(tokenData.expires>Date.now()){
                    callback(true);
                }else{
                    callback(false);
                }
            }    
        }
        else{
            callback(false);
        }
    });

    
};


//Checks service

handlers.checks=function(data, callback){
    let appropriateMethods=['post', 'get', 'put', 'delete'];
    if(appropriateMethods.indexOf(data.method)>-1){
        handlers._checks[data.method](data, callback);
    }else{
        callback(400)
    }
};

//Object containing all the subhandlers
handlers._checks={};

//Checks- post subhandler
//Data required: protocol, url,method, successCodes, timeoutSeconds
handlers._checks.post=function(data, callback){
    
    //Check if inputs are valid
    let protocol=typeof(data.payload.protocol)=='string'&&['http', 'https']?data.payload.protocol:false;
    let url=typeof(data.payload.url)=='string'&&data.payload.url.length>0?data.payload.url.trim():false;
    let method=typeof(data.payload.method)=='string'&&['get', 'post', 'put', 'delete']?data.payload.method:false;
    let successCodes=typeof(data.payload.successCodes)=='object'&&data.payload.successCodes instanceof Array&&data.payload.successCodes.length>0?data.payload.successCodes:false;
    let timeoutSeconds=typeof(data.payload.timeoutSeconds)=='number'&&data.payload.timeoutSeconds<5&&data.payload.timeoutSeconds%1===0&&data.payload.timeoutSeconds>=0?data.payload.timeoutSeconds:false;

    if(protocol&&url&&method&&successCodes&&timeoutSeconds){
        //Check if token is valid for the user
        let tokenId=typeof(data.headers.token)=='string'&&data.headers.token.length>0?data.headers.token:false;
        if(tokenId){
            //Read data from system to check if user exists
            _data.read('tokens', tokenId, function(err, tokenData){
                
                if(!err&&tokenData){
                    let userPhone=tokenData.phone;


                    _data.read('users', userPhone, function(err, userData){
                        if(!err&&userData){
                            
                            //Create a checkId for the user
                            let userChecks=typeof(userData.checks)=='object'&&userData.checks instanceof Array ?userData.checks:[];

                            if(userChecks.length<config.maxChecks){
                                
                                //Create checkId for the instance
                                let checkId=helpers.stringRandomizer(20);

                                let checkObj={
                                    'id':checkId,
                                    'phone':userPhone,
                                    'protocol':protocol,
                                    'url':url,
                                    'method':method,
                                    'successCodes':successCodes,
                                    'timeoutSeconds':timeoutSeconds
                                };

                                //Save checks data to memory
                                _data.create('checks', checkId, checkObj, function(err){
                                    if(!err){
                                        userData.checks=userChecks;
                                        userData.checks.push(checkId);

                                        _data.update('users', userPhone, userData, function(err){
                                            if(!err){
                                                callback(200, checkObj);
                                            }else{
                                                callback(500, {'Error':'Trouble updating user data'})
                                            }
                                        });
                                    }else{
                                        callback(500, {'Error':'Trouble saving check'});
                                    }
                                });
                            }else{
                                callback(403, {'Error': 'Checks exceeded maximum limit: ('+config.maxChecks+')'})
                            }    
                        }else{
                            callback(403, {'Error':'Encountered an error, user may not exist'});    

                        }
                    });
                }else{
                callback(403, {'Error':'Token not valid'});    
                }
            });
        }else{
            callback(403, {'Error':'Token not valid'});
        }


    }else{
        callback(403, {'Error':'Invalid input'});
    }



};

//Checks- get subhandler
//Required data: checkId
handlers._checks.get=function(data, callback){
    let id=typeof(data.queryStringObject.id)=='string'&&data.queryStringObject.id.length==20?data.queryStringObject.id.trim():false;

    if(id){
        //Confirm if check exists for the given id
        _data.read('checks', id, function(err, checkData){
            if(!err&&checkData){

                 //Authenticate the user using token
                let tokenId=typeof(data.headers.token)=='string'&&data.headers.token.trim().length>0?data.headers.token:false;
                handlers._tokens.verifyToken(tokenId, checkData.phone, function(isValid){
                    if(isValid){
                        callback(200, checkData);
                    }else{
                        callback(403, {'Error':'Incorrect token ID'});
                    }
                });
                
            }else{
                callback(404, {'Error': 'Check does not exist'});
            }
        });
    }else{
        callback(400, {'Error': 'Missing required fiel(d)s'});
    }

};

//Checks- put subhandler
//Required data: id
//Optional data: protocol, url, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put=function(data, callback){
    //Check all the validity of inputs
    let id=typeof(data.queryStringObject.id)=='string'&&data.queryStringObject.id.trim().length==20?data.queryStringObject.id:false;
    let protocol=typeof(data.payload.protocol)=='string'&&['http', 'https']?data.payload.protocol:false;
    let url=typeof(data.payload.url)=='string'&&data.payload.url.length>0?data.payload.url.trim():false;
    let method=typeof(data.payload.method)=='string'&&['get', 'post', 'put', 'delete']?data.payload.method:false;
    let successCodes=typeof(data.payload.successCodes)=='object'&&data.payload.successCodes instanceof Array&&data.payload.successCodes.length>0?data.payload.successCodes:false;
    let timeoutSeconds=typeof(data.payload.timeoutSeconds)=='number'&&data.payload.timeoutSeconds<5&&data.payload.timeoutSeconds%1===0&&data.payload.timeoutSeconds>=0?data.payload.timeoutSeconds:false;

    if(id&&timeoutSeconds){
        if(protocol||url||method||successCodes||timeoutSeconds){
            //Confirm if check exists for the given ID
            _data.read('checks', id, function(err, checkData){
                if(!err&&checkData){
                    let token=typeof(data.headers.token)=='string'&&data.headers.token.trim().length==20?data.headers.token:false;
                    handlers._tokens.verifyToken(token, checkData.phone, function(isValid){
                        if(isValid){
                            if(protocol){
                                checkData.protocol=protocol;
                            }
                            if(url){
                                checkData.url=url;
                            }
                            if(method){
                                checkData.method=method;
                            }
                            if(successCodes){
                                checkData.successCodes=successCodes;
                            }
                            
                            if(timeoutSeconds){
                                checkData.timeoutSeconds=timeoutSeconds;
                            }
                            //Write updates to file
                            _data.update('checks', id, checkData, function(err){
                                if(!err){
                                    callback(200);
                                }else{
                                    callback(500, {'Error':'Trouble in saving updates'});
                                }
                            });

                        }else{
                            callback(403, {'Error':'Invalid token'});
                        }
                    });
                }else{
                    callback(400, {'Error':'Check ID does not exist'});
                }
            });

        }else{
            callback(400, {'Error':'Missing required field(s)'});
        }
    }else{
        callback(400, {'Error':'Invalid check ID entered'});       
    }

};

//Checks- delete subhandler
handlers._checks.delete=function(data, callback){
    let id=typeof(data.queryStringObject.id)=='string'&&data.queryStringObject.id.trim().length>0?data.queryStringObject.id:false;

    if(id){
        //Confirm if check exists for the given ID
        _data.read('checks', id, function(err, checkData){
            if(!err&&checkData){
                //Authenticate user before letting delete data
                let token=typeof(data.headers.token)=='string'?data.headers.token:false;
                handlers._tokens.verifyToken(token, checkData.phone, function(isValid){
                if(isValid){
                    _data.read('checks', id, function(err, checkData){
                        if(!err&&checkData){
                        _data.delete('checks', id, function(err){
                            callback(200);
                        });
                        }else{
                            callback(404, {'Error': 'User not found'});
                        }
                    });
                
                }else{
                    callback(403, {'Error':'Token either missing in header or invalid'});
                }
                });
                

            }else{
                callback(404, {'Error':'Check does not exist for given ID'});
            }
        });
    }else{
        callback(400, {'Error':'Missing required field(s)'});
    }
};

//Not found (default) handler
handlers.notFound=function(data, callback){
    callback(404);
};

//Export required module
module.exports=handlers;