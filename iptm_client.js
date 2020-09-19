// Institusi Pendidikan Tinggi Malaysia (IPTM) Blockchain Project: Bootnodes for IPTM Blockchain Nodes
// Programmer: Dr. Mohd Anuar Mat Isa, iExploTech & IPTM Secretariat
// Website: https://github.com/iexplotech  www.iptm.online, www.mhei.online, www.iexplotech.com
// License: GNU General Public License v3.0

const Bootnodes_Client_Version = 'alpha:0.2:IPTM:iExploTech';
const server = 'iptmbootnodes.iexplotech.com';
const port = '8080';
console.log('IPTM BOOTNODES CLIENT, Version: ' + Bootnodes_Client_Version);


// check OS platform
var win32 = process.platform === "win32"; // Same for x64 Win OS
var darwin = process.platform === "darwin";  // Mac
var linux = process.platform === "linux";
console.log(`Supported OS Platform = Windows:${win32} Linux:${linux} Mac:${linux}`);
console.log(`This OS Platform is ${process.platform}`);

if(win32 == true) {
	console.log('OK! Supported Operating System');
	var ipc_path = `data_IPTM\\node1\\geth.ipc`;
	var geth_path = `..\\geth`;
}
else if (true == (darwin || linux)) {
	console.log('OK! Supported Operating System');
	var ipc_path = `../data_IPTM/node1/geth.ipc`;
	var geth_path = `../geth`;
} else {
	console.log('Halted! Not Supported Operating System');
	process.exit(-1);
}


// Configuration Flag
const MACHINE_HOST_CLIENT_SERVER = false; // for IPTM Secretariat!, default false, set true if this machine running both bootnode server and client 
const MACHINE_HOST_CLIENT_SERVER_IP = '47.254.195.137'; // for IPTM Secretariat!, this machine or cloud vm must used fixed public IPv4 

// Import modules
var fs = require('fs');
var events = require('events');
var http = require('http');

// execute cmd line
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const Length_Range = 20;
const Length_InputFileData = 591 - Length_Range;
const Length_InputFileDataNodeId = 3;
const Length_enodId = 165;
const Length_Min_enodId = 151;
const Length_minerAddress = 44;
const Length_bootnode = 300;

const list_bootnodes_txt = 'list_bootnodes.txt';
const file_NodeId = 'nodeId.txt';
const inCmd_getEnodeId_DefaultEthAccount = 'InCmd_getEnodeId_DefaultEthAccount.txt';
const outCmd_getEnodeId_DefaultEthAccount = 'outCmd_getEnodeId_DefaultEthAccount.txt';

var looping_program_counter = 0; // looping main program
var session_counter = 0; // looping main program
var enodeId = '';
var minerAddress = '';
var nodeId = '';
var timeStamp = '';
var bootnode = '';  // in string format, need to parse to JSON format
var local_enodeId =  ''; // this is this node enodeId  without ip & port info
var server_response =  '';

// Event States
var request_Geth_Enode_EthAccount = false;
var read_Geth_Enode_EthAccount = false;
var read_NodeId = false;
var submitBootnodeDataToServer = false;
var set_bootnode = false;
var set_Server_response = false;

// Create an eventEmitter object
var eventEmitter = new events.EventEmitter();

// https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
function timeConverter(UNIX_timestamp){
	var a = new Date(UNIX_timestamp * 1000);
	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var year = a.getFullYear();
	var month = months[a.getMonth()];
	var date = a.getDate();
	var hour = a.getHours();
	var min = a.getMinutes();
	var sec = a.getSeconds();
	var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

var IsJsonString = function (str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}


// Bind the data_received event with functions
// Event for getEnodeId_MinerAddress ()
eventEmitter.on('FAILURE01', function(msg) {
	read_Geth_Enode_EthAccount = false;
	console.log('Failed: ' + msg);
});

eventEmitter.on('SUCCESS01', function(msg) {
	read_Geth_Enode_EthAccount = true;
	console.log('Completed: ' + msg);
});

eventEmitter.on('REQUEST_ENODEID_MINER_ADDRESS', function(msg) {
	request_Geth_Enode_EthAccount = true;
	console.log('Completed: ' + msg);
});

eventEmitter.on('SET_ENODEID_MINER_ADDRESS', function(msg, _enodeId, _minerAddress) {
	enodeId = _enodeId;
	minerAddress = _minerAddress;
	console.log('Completed: ' + msg);
});

// Event for getNodeId ()
eventEmitter.on('FAILURE02', function(msg) {
	read_NodeId = false;
	console.log('Failed: ' + msg);
});

eventEmitter.on('SUCCESS02', function(msg) {
	read_NodeId = true;
	console.log('Completed: ' + msg);
});

eventEmitter.on('SET_NODEID', function(msg, _nodeId) {
	nodeId = _nodeId;
	console.log('Completed: ' + msg);
});

// Event for setTimeStamp ()
eventEmitter.on('SET_TIMESTAMP', function(msg, _timeStamp) {
	timeStamp = _timeStamp;
	console.log('Completed: ' + msg);
});

// Event for checkCompleteBootnodeData ()
eventEmitter.on('CHECK_BOOTNODE_DATA_COMPLETED', function(msg) {
	submitBootnodeDataToServer = true;
	console.log('Completed: ' + msg);
	setBootnode ();
});

// Event for setBootnode ()
eventEmitter.on('FAILURE03', function(msg) {
	set_bootnode = false;
	console.log('Failed: ' + msg);
});

eventEmitter.on('SUCCESS03', function(msg) {
	set_bootnode = true;
	console.log('Completed: ' + msg);
});

eventEmitter.on('SET_BOOTNODE', function(msg, _bootnode) {
	bootnode = _bootnode;
	console.log('Completed: ' + msg);
	connectToServer ();
});

// Event for connectToServer ()
eventEmitter.on('FAILURE04', function(msg) {
	set_Server_response = false;
	console.log('Failed: ' + msg);
});

eventEmitter.on('SUCCESS04', function(msg) {
	set_Server_response  = true;
	console.log('Completed: ' + msg);
});
eventEmitter.on('SET_SERVER_RESPONSE', function(msg, response) {
	//server_response = response; // cannot use it, may cause problem by asynchoronous, empty
	console.log('Completed: ' + msg);
	pushBootnodesintoGeth(response);
});

async function getEnodeId_MinerAddress (filename) {
	
	pushReadEnodeId_DefautEthAccountintoGeth();
	
	// wait until enodeId and Defaut Eth Account push into file
	while (request_Geth_Enode_EthAccount == false) {
		await sleep(100);
	}

	fs.readFile(filename, function (err, data) {
		
		if (err) {
			console.log(err);
			eventEmitter.emit('FAILURE02', 'Cannot Access File:' + filename);
			return false;
		} else {
			console.log('Loaded: ' + filename)
			//console.log(data.toString().length + '\n'+ data.toString());
			
			if(data.toString().length >= Length_InputFileData) {
				var result = /"([^']*)"/.exec(data.toString())
				//console.log(result[0]);
				
				if(result[0] === null)
				{
					eventEmitter.emit('FAILURE01', 'Empty/Invalid data input from file: ' + filename);
					return false;
				}
					
				var array = result[0].split('>');
				var enodeId = array[0].substr(0 , array[0].length -1);
				local_enodeId = enodeId.substr(1 , 136);
				
				var ethDefaultAcc = array[1].substr(2);
				
				console.log(enodeId.length +' '+ enodeId);
				console.log(ethDefaultAcc.length +' '+ ethDefaultAcc);
				console.log(local_enodeId.length +' '+ local_enodeId);
				
				if(enodeId.length != Length_enodId) {
					eventEmitter.emit('FAILURE01', 'Invalid lenght of enodeId');
					return false;
				}
					
				if(ethDefaultAcc.length != Length_minerAddress) {
					eventEmitter.emit('FAILURE01', 'Invalid lenght of minerAddress');
					return false;
				}
				
				eventEmitter.emit('SUCCESS01', 'Read enodeId and minerAddress');
				
				if (MACHINE_HOST_CLIENT_SERVER == true) { // update bootnode data with updated public IPv4 Address 
					enodeId = enodeId.replace('127.0.0.1', MACHINE_HOST_CLIENT_SERVER_IP); // replace to public IPv4 Address
					console.log('enodeId from Client updated to Fixed Public IP: ' + enodeId);
				} 
					
				eventEmitter.emit('SET_ENODEID_MINER_ADDRESS', 'Set enodeId and minerAddress', enodeId, ethDefaultAcc);
				
				return true;
			
			}else {
				eventEmitter.emit('FAILURE01', 'Invalid lenght of: ' + filename);
				return false;
			}
	
		}
	});
}

async function pushReadEnodeId_DefautEthAccountintoGeth() {
	
		if(win32 == true) {
			await execCmd(`${geth_path} attach ipc:\\\\.\\pipe\\${ipc_path} < ${inCmd_getEnodeId_DefaultEthAccount} > ${outCmd_getEnodeId_DefaultEthAccount}`);
		}
		else if (true == (darwin || linux)) {
			await execCmd(`${geth_path} attach ipc:${ipc_path} < ${inCmd_getEnodeId_DefaultEthAccount} > ${outCmd_getEnodeId_DefaultEthAccount}`);
		}
		
		// console.log('Done, pushReadEnodeId_DefautEthAccountintoGeth');
		eventEmitter.emit('REQUEST_ENODEID_MINER_ADDRESS', 'pushReadEnodeId_DefautEthAccountintoGeth');
}

function getNodeId (filename) {
	
		fs.readFile(filename, function (err, data) {
		
		if (err) {
			console.log(err);
			eventEmitter.emit('FAILURE02', 'Cannot Access File:' + filename);
			return false;
		} else {
			console.log('Loaded: ' + filename)
			
			console.log('NodeId: ' + data.toString().length + '\n'+ data.toString());
			
			var result = data.toString().trim();  // remove \n
			console.log('NodeId: ' + result.length + '\n'+ result);
			
			if(result.length >= Length_InputFileDataNodeId) {
				
				console.log(result.length +' '+ result);
				
				eventEmitter.emit('SUCCESS02', 'Read nodeId');
				eventEmitter.emit('SET_NODEID', 'Set nodeId', result);
				
				return true;
			
			}else {
				eventEmitter.emit('FAILURE02', 'Invalid lenght of: ' + filename);
				return false;
			}
	
		}
	});
}

function setTimeStamp () {
	var date = new Date();
	var date_formated = timeConverter(date/1000);
	console.log(date_formated);
	eventEmitter.emit('SET_TIMESTAMP', 'Set timeStamp', date_formated);
}

function setBootnode () {
	
	var temp_bootnode = `{"bootnodes":[{"nodeId":"${nodeId}","enodeId":"${enodeId.substr(1, enodeId.length - 2)}","minerAddress":"${minerAddress.substr(1, minerAddress.length - 2)}", "timeStamp":"${timeStamp}"}]}`;
	console.log(temp_bootnode.length +' '+ temp_bootnode);
	
	if(temp_bootnode.length >= Length_bootnode && IsJsonString(temp_bootnode) == true) {
		//console.log('setBootnode: Done');
		eventEmitter.emit('SUCCESS03', 'Created Bootnode JSON format');
		eventEmitter.emit('SET_BOOTNODE', 'Set Bootnode Completed, Ready to POST to Server', temp_bootnode);
	} else {
		//console.log('setBootnode: Failed');
		eventEmitter.emit('FAILURE03', 'Cannot Create Bootnode JSON format');
	}
}

function connectToServer () {
	
	var bootnode_json = JSON.stringify(JSON.parse(bootnode));
	
	// Options to be used by for http request 
	var options = {
	//	host: 'localhost',
	//	host: 'iptmbootnodes.iexplotech.com',
		host: server,
	//	port: '8080',
		port: port,
		path: '/list_bootnodes.json',
		timeout: 5000,
	//	path: '/table.html',
		method: 'POST',
		headers: {
		'Content-Type': 'application/json',
		'Content-Length': bootnode_json.length
		}
	};
	
	try {
		var data = [];
		
		var req = http.request(options, res => {
		console.log(`Server Response statusCode: ${res.statusCode}`);
		
		res.on('data', function(chunk) {
			data.push(chunk);
		}).on('end', function() {
        //at this point data is an array of Buffers
        //so Buffer.concat() can make us a new Buffer
        //of all of them together
        var buffer = Buffer.concat(data);
        //console.log(buffer.toString('base64'));
		console.log('Received Response from Server:\n\n' + buffer + '\n\n');
		checkServerResponse(buffer);
		});
	
	/*
		res.on('data', server_respone => {
				console.log('Received Response from Server:\n' + server_respone);		
				checkServerResponse(server_respone);
			})
		})
	*/
	
		req.on('error', error => {
			eventEmitter.emit('FAILURE04', 'Error Connecting to Server');
			console.error(error);
		});
	});
	
		// this the starting point to invoke http request
		req.write(bootnode_json);
		req.end();
		
	} catch (e) {
		console.log(e)
	}
}

function checkServerResponse (server_respone) {
	
	console.log('server_respone.length: ' + server_respone.length);
	console.log('IsJsonString: ' + IsJsonString(server_respone));
	if(server_respone.length >= Length_bootnode && IsJsonString(server_respone) == true) {
		//console.log('setBootnode: Done');
		eventEmitter.emit('SUCCESS04', 'Check Server Bootnodes JSON format');
		eventEmitter.emit('SET_SERVER_RESPONSE','Bootnodes data from Server is ready to be stored into a file', server_respone);
	} else {
		//console.log('setBootnode: Failed');
		eventEmitter.emit('FAILURE04', 'Check Server Bootnodes JSON format');
	}
}

function pushBootnodesintoGeth(server_respone) {
	
	var server_respone_json_obj = JSON.parse(server_respone);
	var list_addPeer = '';
	
	for (i in server_respone_json_obj.bootnodes) {
		//console.log(server_respone_json_obj.bootnodes[i]);
		console.log(server_respone_json_obj.bootnodes[i].enodeId);
		
		if(server_respone_json_obj.bootnodes[i].enodeId.length < Length_Min_enodId)
			continue;
		
		//console.log('From Server:' + server_respone_json_obj.bootnodes[i].enodeId.substr(0 , 136));
		//console.log('From Local :' + local_enodeId);
		if(server_respone_json_obj.bootnodes[i].enodeId.substr(0 , 136) === local_enodeId) {
				console.log('Same enodeId in local node, skip this enodeId from list of addPeer()');
				continue;
			}
				
		list_addPeer = list_addPeer + `admin.addPeer("${server_respone_json_obj.bootnodes[i].enodeId}")\n`;
	}
	
	console.log('list_addPeer:\n' + list_addPeer);

	fs.writeFile(list_bootnodes_txt, list_addPeer, function (err) {
		if (err) {
			console.log(err);
			console.log('Error Write: ' + list_bootnodes_txt);
		}
		
		console.log('Write: ' + list_bootnodes_txt);
		
		if(win32 == true) {
			execCmd(`${geth_path} attach ipc:\\\\.\\pipe\\${ipc_path} < ${list_bootnodes_txt}`);
		}
		else if (true == (darwin || linux)) {
			execCmd(`${geth_path} attach ipc:${ipc_path} < ${list_bootnodes_txt}`);
		}
		
	});
		
}


async function execCmd(cmd) {
	try {
		const { stdout, stderr } = await exec(cmd);
		console.log('stdout:', stdout);
		console.log('stderr:', stderr);
	}catch (err) {
		console.error(err);
  };
};

function initializeState () {
	request_Geth_Enode_EthAccount = false;
	read_Geth_Enode_EthAccount = false;
	read_NodeId = false;
	submitBootnodeDataToServer = false;
	set_bootnode = false;
	set_Server_response = false;
	enodeId = '';
	minerAddress = '';
	nodeId = '';
	timeStamp = '';
	server_response = '';
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function loopCheckBootnodeData () {
	console.log(read_Geth_Enode_EthAccount +' '+ read_NodeId);
	
	if(read_Geth_Enode_EthAccount == true && read_NodeId == true) {
		console.log('true true');
		
		if(enodeId !== '' && minerAddress !== '' && nodeId !== '' && timeStamp !== '') {
			eventEmitter.emit('CHECK_BOOTNODE_DATA_COMPLETED', 'Ready to check for bootnode JSON format');
		} else {
			console.log('Some Bootnode Data Empty');
		}
	} else {
			console.log('Still Accessing Geth Bootnode Data');
	}
}

async function checkCompleteBootnodeData (counter) {
	
	console.log(counter +' '+ looping_program_counter +' '+ submitBootnodeDataToServer);
	
	while (counter === looping_program_counter && submitBootnodeDataToServer == false) {
		console.log(counter +' '+ looping_program_counter +' '+ submitBootnodeDataToServer);
		console.log('loopCheckBootnodeData');
		loopCheckBootnodeData ();
		
		if(submitBootnodeDataToServer == false) {
			await sleep(2000);
			console.log('after sleep');
			console.log(counter +' '+ looping_program_counter +' '+ submitBootnodeDataToServer);
		}
	}
}

// Main Program
function loopBootnodeClient () {
	looping_program_counter += 1;
	session_counter = looping_program_counter;
	console.log('\n\nEXECUTION COUNTER: ' + looping_program_counter);
	
	initializeState ();
	
	getEnodeId_MinerAddress(outCmd_getEnodeId_DefaultEthAccount);
	getNodeId(file_NodeId);
	setTimeStamp();
	
	checkCompleteBootnodeData (session_counter);
}


loopBootnodeClient();
// Execute Main Program every ms interval
setInterval(loopBootnodeClient, 60000);
