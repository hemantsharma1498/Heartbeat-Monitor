/*
Library for storing and editing data
*/

//Dependencies
const fs=require('fs');
const { parse } = require('path');
const path=require('path');
const helpers = require('./helpers');

//Container for the module (to be exported)
var lib={};

//Base directory of the data folder
lib.baseDir=path.join(__dirname, '/../.data/');

//Write data to the file
lib.create=function(dir, file, data, callback){
    //Open the file to write to it

    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){
        if(!err&&fileDescriptor){
            
            //Convert data to string
            var stringData=JSON.stringify(data);

            //Write to file and close it
            fs.writeFile(fileDescriptor, stringData, function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false); //Err parameter of the function expects the error property to be true, if there's no error the parameter will be false
                        } else{
                            callback('Error closing new file');
                        }
                    });
                } else{
                    callback('Error writing to new file');
                }
            });
        } else{
            callback('Could not create new file, it may already exist');
        }
    });
};


//Read the data into the file
lib.read=function(dir, file, callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf-8', function(err, data){
        if(!err&&data){
            let parsedData=helpers.parsedtoJsonObject(data);
            callback(false, parsedData);
        }else{
            callback(err, data);
        }
    });
};



// Update data inside a file
lib.update=function(dir, file, data, callback){
    //Open the required file
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', function(err, fileDescriptor){
        if(!err&&fileDescriptor){
            var stringData= JSON.stringify(data);
            //Truncate the contents of the file
            fs.ftruncate(fileDescriptor, function(err){
                if(!err){
                    //Write to the file and close it
                    fs.writeFile(fileDescriptor, stringData, function(err){
                        if(!err){
                            fs.close(fileDescriptor, function(err){
                                if(!err){
                                    callback(false);
                                }else{
                                    callback('Error while closing the file');
                                }
                            });
                        }else{
                            callback('Erro while writing to file');
                        }
                    });
                }else{
                    callback('Error while truncating file');
                }
            });
        }else{
            callback('Could not open the file, it may not exist yet');
        }
    });
};
  

//Delete file
lib.delete=function(dir, file, callback){
    //Unlinking the file
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err, fileDescriptor){
        if(!err&&fileDescriptor){
            //Convert data to string
            let stringData=JSON.stringify(data);

            //Write to file and close it
            fs.writeFile(fileDescriptor, stringData, function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false);
                        }else{
                            callback('Error while closing file');
                        }
                    });
                }else{
                    callback('Error while writing to file');
                }
            });
            
        }else{
            callback('Could not open file for deletion (may not exist)');
        }
    
    
    
    
    
    
    });

    
};

//List all files in the directory
lib.list=function(dir, callback){
    fs.readdir(lib.baseDir+dir+'/', function(err, data){
        if(!err&&data&&data.length>0){
            let list=[];
            data.forEach(function(fileName){
                list.push(fileName.replace('.json', ''));
            });
            callback(false, list);
        }else{
            callback(err, data);
        }
    });
};




//Export the module
module.exports=lib;