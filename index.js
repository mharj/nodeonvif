'use strict';
var fs    = require('fs'),
	nconf = require('nconf'),
	onvif = require('onvif');
nconf.argv().env().file({ file: './config.json' }); // nconf init
var Cam = require('onvif').Cam;
var AzureIotDevice = require('azure-iot-device-mqtt');
var Message = require('azure-iot-device').Message;
var client = AzureIotDevice.clientFromConnectionString( nconf.get("AZURE_IOT_DEVICE_CONNECTION_STRING") );
var deviceId = nconf.get("AZURE_IOT_DEVICE_NAME");

var cam = null;
var onvif_connected = false;
var timer = null;

function onvifConnect() {
	cam = new Cam( nconf.get("ONVIF_OPTIONS") , function(err) {
		onvif_connected = (err?false:true);
		if ( err ) {
			console.log("Error: onvif not connected "+this.hostname+":"+this.port);
		} else {
			console.log("onvif connected => "+this.hostname+":"+this.port);
		}
	});
}
onvifConnect(); // initial try to connect

timer = setTimeout(function(){ // re-try connection in 10sec
	if ( onvif_connected === false ) {
		console.log("Re-trying onvif connection");
		onvifConnect();
	}
}, 10000);

function printResultFor(op) {
	return function printResult(err, res) {
		if (err) console.log(op + ' error: ' + err.toString());
		if (res) console.log(op + ' status: ' + res.constructor.name);
	};
}

var connectCallback = function (err) {
	if (err) {
		console.log('IoT could not connect: ' + err);
	} else {
		console.log('IoT Client connected');
		client.on('message', function (msg) {
			console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
			var e = JSON.parse(msg.data);
			if ( onvif_connected === true && e && e.pan && e.tilt && e.zoom ) {
				cam.absoluteMove({ x: parseFloat(e.pan) , y: parseFloat(e.tilt), zoom: parseFloat(e.zoom) });
			}
			client.complete(msg, printResultFor('completed'));
		});
	}
};
client.open(connectCallback);
