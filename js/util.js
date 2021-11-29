
function log(...str){
	console.log(str.length == 1 ? str[0] : str);
}

function loadScript(url, callback)
{
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = url;

	script.onreadystatechange = callback;
	script.onload = callback;

	head.appendChild(script);

	log("Script loaded: " + url);
}

function loadScript(url, callback)
{
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('link');
	script.rel = 'stylesheet';
	script.type = 'text/css';
	script.src = url;

	script.onreadystatechange = callback;
	script.onload = callback;

	head.appendChild(script);

	log("Style loaded: " + url);
}

//38° 3.0' N; 122° 10.4' W
//38°03'00.0"N; 122°10'24.0"W
//38.050000, -122.173333 
function parseLonLat(str){
	var elements = str.trim().split(" ");
	var degree = parseInt(elements[0].replace('°'));
	//find floating point and split 
	var number = String(elements[1].match(/[\d\.]+/)[0]);
	var numberParts = number.split(".");
	var min = parseInt(numberParts[0]);
	var sec = parseInt(numberParts[1]);
	var value = (degree + (min/60) + (sec/600));

	if(elements[2].toLowerCase() === "w" || elements[2].toLowerCase() === "s"){
		value= value * -1;
	}
	return value;
}

function normalizeLongitude(lon) {
	return ((BORDER_N - lon)/(BORDER_N - BORDER_S)) * CANVAS_HEIGHT;
}

function normalizeLatitude(lat) {
	return ((BORDER_W - lat)/(BORDER_W - BORDER_O)) * CANVAS_WIDTH;
}

function getBoundaries(xOff_,yOff_, zoom){
	var xOff = xOff_;
	var yOff = yOff_;
	if(xOff > 0) {
		xOff = 0;
	} else {
		var marginX = (canvas.width * zoom) - canvas.width;
		if(marginX + xOff < 0){
			xOff = -1 * marginX;
		}
	}
	if(yOff > 0) {
		yOff = 0;
	} else {
		var marginY = (canvas.height * zoom) - canvas.height;
		if(marginY + yOff < 0){
			yOff = -1 * marginY;
		}
	}

	var boundaries ={};
	boundaries['x'] = xOff;
	boundaries['y'] = yOff;

	return boundaries;
}

function hexAlphaToRgbString(hex, alpha) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	
	if(alpha === undefined) {
		alpha = 1.0
	}

	return "rgba(" + parseInt(result[1], 16) + "," 
	+ parseInt(result[2], 16) + ","
	+ parseInt(result[3], 16) + ","
	+ alpha + ")";
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
