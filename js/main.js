const MAP_SVG = 'img/map.svg';
const MAP_SVG_NEW = 'img/map_new.svg';
const MAP_PNG = 'img/map.png';
const PATHS_SVG = 'img/paths.svg';
const ALL_DATA = 'data/SFBay.csv';
const ALL_STATIONS = 'data/stations.csv';

const COLOR_PALETTE = 
["#FF0000", "#FF1C1C", "#FF3838", "#FF5555", "#FF7171", "#FF8D8D", "#FFAAAA", "#FFC6C6", "#FFE2E2", "#9bd1a9", "#E2E2FF", "#C6C6FF", "#AAAAFF", "#8D8DFF", "#7171FF", "#5555FF", "#3838FF", "#1C1CFF", "#0000FF"]

const STEPS = [
{"from":5, "to":14},
{"from":15, "to":24},
{"from":25, "to":34},
{"from":35, "to":44},
{"from":45, "to":54},
{"from":55, "to":64},
{"from":65, "to":74},
{"from":75, "to":84},
{"from":85, "to":94},
{"from":95, "to":104},
{"from":105, "to":114},
{"from":115, "to":124},
{"from":125, "to":134},
{"from":135, "to":144},
{"from":145, "to":154},
{"from":155, "to":164},
{"from":165, "to":174},
{"from":175, "to":184},
{"from":185, "to":194}
];


const BORDER_N=38.2033;
const BORDER_O=-121.5871;
const BORDER_S=37.1897;
const BORDER_W=-122.6445;

const CANVAS_WIDTH=742;
const CANVAS_HEIGHT=900;

const RED='#f06';
const BLUE='#3498db';
const SONNY_BLACK='#111111';

const RADIUS = 4;

var canvas; 
var dataSet = [];
var stations = [];
var sectors = [];
var currentData = [];

var grStations;
var paths;

var pathDown;
var lastStation;
var isDown = false;
var moveOriginX;
var moveOriginY;


$(document).ready(function() {
	init();
	loadMap(MAP_SVG_NEW);
	
	var deg = 0;
	$('#compass').click(function(){
		$('#compass').css("transform", function() {
			deg = (deg+10) % 360;
			return "rotate("+deg+ "deg)";
		});
	});
});

function init(){
	$.ajaxSetup({ cache: false });
	
	$("#loader").show();
	$("#drawing").hide();
	$("#compass").hide();
	$("#mapCanvas").css({ opacity: 0.5 });
	$('.input-group.date').datepicker({
		format: "mm.yyyy",
		startView: "months",
		minViewMode: "months",
		maxViewMode: "decade",
		startDate: '04/1969',
		endDate: '02/2014',
		autoclose: true
	}).on('changeDate', function(e) {
		colorSectors(e.dates[0].getMonth() + 1, e.dates[0].getFullYear());
	});

	for (var i = 0; i < STEPS.length; i++) {
		$(document.createElement('strong'))
		.html(STEPS[i].from + 5)
		.addClass("legend-element")
		.width(CANVAS_WIDTH/STEPS.length)
		.css("background-color", COLOR_PALETTE[i])
		.appendTo("#colorLegend");
	}

	var context = document.getElementById('mapCanvas').getContext('2d');
	context.canvas.width = CANVAS_WIDTH;
	context.canvas.height = CANVAS_HEIGHT;

	canvas = new fabric.Canvas('mapCanvas', {
		imageSmoothingEnabled: true
	});
	canvas.selection = false;
	
	grStations = new fabric.Group();
	grStations.selectable = false;
	canvas.add(grStations);

	registerCanvasEvents();
}

function handlePathClick(path){
	var station = stations.find(s => s.stationnr == path.id);
	var sector = sectors.find(s => s.id == path.id);
	sectors.forEach(function(s){
		s.dirty = true;
		if(s == sector) {
			s.stroke = "#aaa";
		} else {
			s.stroke = "#ddd";
		}
		canvas.requestRenderAll();
	});
	pathSelected = false;
	return showInfo(station);
}

function showInfo(station) {
	lastStation = station;
	$("#station-info").empty().append(station.name + " (" + station.stationnr + ")");
	$("#station-data").empty();

	var sector = sectors.find(s => s.id == station.stationnr);
	sector.dirty = true;
	sector.stroke = "#aaa";
	canvas.requestRenderAll();

	var splits = splitCruises(currentData.filter(function(data){
		return station.stationnr == data['Station.Number'];
	}));

	if(isEmpty(splits)){
		$("#station-data").append("No data");
		return;
	}
	
	var oKeys = [], depths = new Set();

	for(var key in splits) {
		oKeys.push(key);
		splits[key].forEach(s => depths.add(s.Depth));
	}

	let depthsArr = Array.from(depths).sort((a, b) => a - b);


	var table = $('<table></table>').addClass("dataTable");
	var thead = $('<thead></thead>');
	var row1 = $('<tr></tr>');
	var rowdata1 = $('<th></th>').text("DEPTH");
	row1.append(rowdata1);

	for(var i = 0; i < oKeys.length; i++) {
		var date = splits[oKeys[i]][0]["jsTime"].toLocaleDateString("de-DE");
		rowdata1 = $('<th></th>').text(date);
		row1.append(rowdata1);		
	}
	thead.append(row1);
	table.append(thead);

	var tbody = $('<tbody></tbody>');
	depthsArr.forEach(function(d){
		var rowRest = $('<tr></tr>').addClass("tableRow");
		var rowDataRest = $('<td></td>').text(d);
		rowRest.append(rowDataRest);

		oKeys.forEach(function(k) {
			var entry = splits[k].find(s => s.Depth == d);
			rowDataRest = $('<td></td>');

			if(entry && entry["Oxygen.Saturation.percent"]) {
				
				rowDataRest.text(entry["Oxygen.Saturation.percent"])
				.css("background-color", getColorForSaturation(entry["Oxygen.Saturation.percent"]));
			} else {
				rowDataRest.text("NO DATA")
				.css("background-color", "#FFFFFF");
			}
			rowRest.append(rowDataRest);
		});
		tbody.append(rowRest);
	});

	tbody.appendTo(table);
	table.appendTo("#station-data");
}



function splitCruises(data){
	var subsets = {};
	data.forEach(function(e) { 
		var day = e.jsTime.getDate();
		if(subsets[day] === undefined) {
			subsets[day] = [];
		}
		subsets[day].push(e);
	});
	return subsets;
}

function colorSectors(month, year){

	resetAllColoring();

	currentData = getDataForTime(month, year);
	if(currentData.length == 0) {
		log("No data found for "+  month + "." + year);
		return;
	}

	var surfaceEntries = getUniqueSurfaceEntries(currentData);
	var recheckSectors = [];
	surfaceEntries.forEach(function(entry){

		var sector = sectors.find(s => s['id'] == entry['Station.Number']);
		if(sector === undefined){ 
			log("Sector not found: " + entry['Station.Number']);
			return;
		}

		if(entry['Oxygen.Saturation.percent'] === undefined) {
			log("No oxygen data found for surface: " + entry['Station.Number'] + "@" + entry["jsTime"]);
			recheckSectors.push(sector);
			sector.dirty = true;
			sector.fill=hexAlphaToRgbString("#FFFFFF", 0.8);
		} else {
			var col = getColorForSaturation(entry['Oxygen.Saturation.percent']);
			sector.dirty = true;
			sector.fill=hexAlphaToRgbString(col, 0.8);
		}
	});

	recheckSectors.forEach(function(s) {
		var rechecks = currentData.filter(e => e['Station.Number'] === s['id'] && e['Oxygen.Saturation.percent']);
		if(rechecks.length == 0) {
			currentData = currentData.filter(e => e['Station.Number'] !== s['id']);
			s.dirty = true;
			s.fill=hexAlphaToRgbString("#ffffff", 0.1);
		}
	});

	canvas.requestRenderAll();

	if(lastStation) {
		showInfo(lastStation);
	}
}

function getColorForSaturation(saturation){
	var idx = STEPS.findIndex(function(step){
		return (step.from <= saturation && saturation <= step.to);
	}); 

	return COLOR_PALETTE[idx];
}


function getUniqueSurfaceEntries(data){
	var subset = [];
	data.filter(function(x){
		if(!subset.some(e => e['Station.Number'] == x['Station.Number'])) {
			if(x['Depth'] == 1) {
				subset.push(x);
			}
		}
	});

	return subset;
}


function resetAllColoring(){
	sectors.forEach(function(sector){
		sector.dirty = true;
		sector.fill=hexAlphaToRgbString("#ffffff", 0.1);
		sector.stroke="#ddd";
		sector.strokeWidth=2;
	});
	canvas.requestRenderAll();
}

function getDataForTime(month, year) {
	var start = new Date(year + "-" + month + "-01 00:00");

	if(month == 12) {
		month = 1;
		year = year + 1;
	} else {
		month++;
	}
	var end = new Date(year + "-" + month + "-01 23:59:59");
	end.setDate(end.getDate() - 1);
	return filterDate(start, end, dataSet);
}


function getSaturationBoundaries(data){
	var max = getMaxSaturation(data);
	var min = getMinSaturation(dataSet);

	return {"min":min,"max":max};
}
function getDepthBoundaries(data){
	var max = getMaxHeight(data);
	var min = getMinHeight(data);

	return {"min":min,"max":max};
}
function getDateBoundaries(data){
	var before = getMaxDate(data);
	var after = getMinDate(data);
	return {"after":after,"before":before}
}
function getMaxDate(data) {
	return data.reduce((max, p) => p['jsTime'] > max ? p['jsTime'] : max, data[0]['jsTime']);
}
function getMinDate(data) {
	return data.reduce((min, p) => p['jsTime'] < min ? p['jsTime'] : min, data[0]['jsTime']);
}

function getMaxHeight(data) {
	return data.reduce((max, p) => p['Depth'] > max ? p['Depth'] : max, data[0]['Depth']);
}
function getMinHeight(data) {
	return data.reduce((min, p) => p['Depth'] < min ? p['Depth'] : min, data[0]['Depth']);
}
function getMaxSaturation(data) {
	return data.reduce(function(max, p){
		if(p['Oxygen.Saturation.percent'] === undefined) return max;
		return p['Oxygen.Saturation.percent'] < max ? max : p['Oxygen.Saturation.percent'];
	}, 100);
}

function getMinSaturation(data) {
	return data.reduce(function(min, p){
		if(p['Oxygen.Saturation.percent'] === undefined) return min;
		return p['Oxygen.Saturation.percent'] > min ? min : p['Oxygen.Saturation.percent'];
	}, 100);
}

function filterDate(after, before, data){
	return data.filter(function(date){
		return date['jsTime'] < before &&
		date['jsTime'] > after;
	});
}

function drawStations(){
	stations.forEach(function(station) {
		var lat = parseLonLat(station["lat"]);
		var x = normalizeLatitude(lat);
		var lon = parseLonLat(station["lon"]);
		var y = normalizeLongitude(lon);

		var circle = new fabric.Circle({
			selectable: true,
			radius: RADIUS, 
			fill: SONNY_BLACK, 
			left: x, 
			top: y, 
			id: station['id'], 
			originX: 'center', 
			originY: 'center',
			hasBorders: false
		});

		grStations.add(circle);
	});
	grStations.addWithUpdate();
	grStations.moveTo(1);
}


//----------- Mouse Events -------------


function registerPathEvents(path){
	path.on({
		'mousedown': function(event) {
			pathDown = path;
			pathSelected = true;
		},
		'mouseup': function(event) {
			if(path === pathDown) {
				handlePathClick(path);
			}		
		}
	});
}

function registerCanvasEvents(){
	canvas.on({
		'mouse:down': function(event) {
			isDown = true;
			moveOriginX = event.pointer['x'];
			moveOriginY = event.pointer['y'];
		},
		'mouse:up': function(event) {
			isDown = false;
			sectors.forEach(function(s){
				s.dirty = true;
				s.stroke = "#ddd";
			});
			$("#station-info").empty();
			$("#station-data").empty();
			lastStation = undefined;
			canvas.requestRenderAll();
		},
		'mouse:move': function(event) {
			if(!isDown) return;
			
			var tx = moveOriginX-event.pointer['x'];
			var ty = moveOriginY-event.pointer['y'];
			var vpt = this.viewportTransform;

			var xOff = vpt[4]-tx;
			var yOff = vpt[5]-ty;

			var boundaries = getBoundaries(xOff, yOff, vpt[0]);
			
			canvas.setViewportTransform([vpt[0],0,0,vpt[3],boundaries.x,boundaries.y]);
			
			moveOriginX=event.pointer['x'];
			moveOriginY=event.pointer['y'];
		},

		'mouse:wheel': function(opt) {
			var delta = opt.e.deltaY;
			var pointer = canvas.getPointer(opt.e);
			var zoom = canvas.getZoom();
			zoom = zoom + (-delta)/200;

			if (zoom > 10) {
				zoom = 10;
			} else if (zoom < 1) {
				zoom = 1;
				canvas.setViewportTransform([1,0,0,1,0,0]);
			} else {
				canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
				
				if(delta > 0) {
					var vpt = canvas.viewportTransform;
					var vpt4 = vpt[4];
					var vpt5 = vpt[5];

					var xSmooth = CANVAS_WIDTH*vpt[0]/50;
					var ySmooth = CANVAS_HEIGHT*vpt[3]/50;

					var boundaries = getBoundaries(vpt4, vpt5, vpt[0]);
					canvas.setViewportTransform([vpt[0],0,0,vpt[3],boundaries.x,boundaries.y]);
				}

				grStations.getObjects().forEach(function(station){
					station.setRadius(RADIUS/zoom);
				});
				
				canvas.renderAll();
				opt.e.preventDefault();
				opt.e.stopPropagation();
			}
		}
	});
}


//----------- Loading/Handling Data -------------

function loadMap(url){
	fabric.loadSVGFromURL(url, function(objects, options){
		var map = fabric.util.groupSVGElements(objects, options);

		map.scaleToWidth(CANVAS_WIDTH);
		map.selectable = false; 
		canvas.add(map); 
		canvas.calcOffset();
		loadData();
	});
}

function loadMapPng(url){
	fabric.Image.fromURL(url, function(img) {
		img.set({
			width: CANVAS_WIDTH,
			height: CANVAS_HEIGHT
		});
		canvas.add(img);
		loadData();
	});
}

function loadPaths(url){
	fabric.loadSVGFromURL(url, function(objects, options){
		objects.forEach(function(path){
			registerPathEvents(path);
			path.selectable = false; 
			path.perPixelTargetFind = true;
			canvas.add(path);
			sectors.push(path);
		});
	});
}

function loadData(){
	loadPaths(PATHS_SVG);
	getData(ALL_DATA,dataSet,handleData);
	getData(ALL_STATIONS,stations,drawStations);
}

function getData(url,arr,callback){
	$.ajax({
		type: "GET",
		url: url,
		dataType: "text",
		success: function(data) {
			parseData(data,arr,callback);
		}
	});
}

function parseData(data, arr,callback) {
	var lines = data.split(/\r\n|\n/);
	var header = lines[0].split(';');

	for (var i=1; i<lines.length; i++) {
		var row = lines[i].split(';');
		if (row.length == header.length) {
			var values = {};
			values['id'] = i;
			for (var j=0; j<header.length; j++) {
				var rowVal = "";
				if(!row[j]) {
					rowVal = undefined;	
				} else {
					if(isNaN(Number(row[j]))){
						rowVal = row[j];
					} else {
						rowVal = Number(row[j]);
					}
				}

				values[header[j]] = rowVal;
			}
			arr.push(values);
		}
	}
	call(callback);
}

function call(callback){
	if(callback !== undefined && callback !== null && typeof callback === "function") {
		callback();
	}
}

function handleData(){
	for (var i = 0; i < dataSet.length; i++) {
		var date = dataSet[i];
		var d = new Date(date["TimeStamp"]);
		date['jsTime'] = d;
		dataSet[i] = date;
	}

	releaseCanvas();
}

function releaseCanvas(){
	$("#mapCanvas").css({ opacity: 1 });
	$("#loader").hide();
	resetAllColoring();
}

