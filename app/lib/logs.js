/*
Library for storing and rotating logs
 */


//Dependencies
const fs=require('fs');
const path=require('path');
const zlib=require('zlib');


//Declare log object
let lib={};


//Base directory of the log folder
lib.baseDir=path.join(__dirname, '/../.logs/');

//Append string to a file or create a new file if file doesn't exist
lib.append=function(file, str, callback){
    //Open the file to append data to
    fs.open(lib.baseDir+file+'.log', 'a', function(err, fileDescriptor){
        if(!err&&fileDescriptor){
            fs.appendFile(fileDescriptor, str+'\n', function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false);
                        }else{
                            callback('Error closing file');
                        }
                    });
                }else{
                    callback('Error appending to file');
                }
            });
        }else{
            callback('Could not open file');
        }
    });
}


//List all logs and optimally include compressed logs
lib.list=function(includeCompressedLogs, callback){
    fs.readdir(lib.baseDir, function(err, data){
        if(!err&&data&&data.length>0){
            let trimmedFileNames=[];
            data.forEach(function(fileName){
                //Add the .log files
                if(fileName.indexOf('.log')>-1){
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                //Add on the .gz files to the array, if they exist
                if(fileName.indexOf('.gz.b64')>-1&&includeCompressedLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });
            callback(false, trimmedFileNames);
        }else{
            callback(err)
        }
    })
}

//Compress the contents of one .log file into a .gz.b64 file (in the same directory)
lib.compress=function(logId, commpressedFileId, callback){
    let sourceFile=logId+'.log';
    let destFile=commpressedFileId+'.gz.b64';

    //Read the source file
    fs.readFile(lib.baseDir+sourceFile, 'utf-8', function(err, inputString){
        if(!err&&inputString){
            //Compress the data using gzip

            zlib.gzip(inputString, function(err, buffer){
                if(!err&&buffer){
                    //Send the data to the destinated file
                    fs.open(lib.baseDir+destFile, 'wx', function(err, fileDescriptor){
                        if(!err&&fileDescriptor){
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err){
                                if(!err){
                                    //Close the file
                                    fs.close(fileDescriptor, function(err){
                                        if(!err){
                                            callback(false);
                                        }else{
                                            callback(err);
                                        }
                                    })
                                }else{
                                    callback(err);
                                }
                            })
                        }else{

                        }
                    });
                }else{
                    callback(err);
                }
            });
        }else{
            callback(err);
        }
    });
};

//Decompress a .gz.b64 file into a string variable
lib.decompress=function(fileId, callback){
    let fileName=fileId+'.gz.b64';
    fs.readFile(lib.baseDir+fileName, 'utf-8', function(err, str){
        if(!err&&str){
            //Decompress the data
            let inputBuffer=Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer){
                if(!err&&outputBuffer){
                    //Callback
                    let str=outputBuffer.toString();
                    callback(false, str);
                }else{
                    callback(err);
                }
            });
        }else{
            callback(err);
        }
    })
}

//Truncate a log file
lib.truncate=function(logId, callback){
    fs.truncate(lib.baseDir+logId+'.log',0, function(err){
        if(!err){
            callback(false);
        }else{
            callback(err);
        }
    });
}

//Export the log object
module.exports=lib;