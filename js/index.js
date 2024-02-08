const canvasObjects = {
	nodes: [],
	edges: []
}

function loadFile(event) {
	let file = event.target.files[0]; 
	var reader = new FileReader();
	reader.readAsText(file);

	reader.onload = readerEvent => {
		let converter = new showdown.Converter();
		let content = JSON.parse(readerEvent.target.result);
		console.log(content);
		canvasObjects.edges = content.edges;
		content.nodes.forEach(node => {
			let element = document.createElement('div');
			element.className = 'node';
			element.id = node.id;
			element.style.left = (node.x + offset.x) + 'px';
			element.style.top = (node.y + offset.y) + 'px';
			element.style.width = node.width + 'px';
			element.style.height = node.height + 'px';
			element.style.transform = `scale(${zoomLevel})`;
			element.innerHTML = converter.makeHtml(node.text);
			document.getElementById('nodeContainer').appendChild(element);
			canvasObjects.nodes.push({
				id: node.id,
				x: node.x,
				y: node.y
			});
		});
		console.log(canvasObjects);
	}
}

const canvas = document.getElementById("bgCanvas")
const ctx = canvas.getContext('2d')

let offset = { 
	x: window.innerWidth/2, 
	y: window.innerHeight/2
}
let lastOffset = { x: 0, y: 0 }
let zoomLevel = 1
let lastZoomLevel = 1

function draw() {
	if (lastOffset.x == offset.x && lastOffset.y == offset.y && zoomLevel == lastZoomLevel) {
		requestAnimationFrame(draw)
		return;
	}

	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
	
	ctx.translate(window.innerWidth / 2, window.innerHeight / 2)
	ctx.scale(zoomLevel, zoomLevel)
	ctx.translate(-window.innerWidth / 2 + offset.x, -window.innerHeight / 2 + offset.y)
	ctx.clearRect(0,0, window.innerWidth, window.innerHeight)

	console.log(window.innerWidth, window.innerHeight, offset.x, offset.y, zoomLevel)

	ctx.fillStyle = "#353535"
	const circleRadius = 1/zoomLevel;
	
	let baseGap;
	if (zoomLevel > 5) {
		baseGap = 5;
	} else if (zoomLevel > 2.5) {
		baseGap = 10;
	} else if (zoomLevel > 1.25) {
		baseGap = 20;
	} else if (zoomLevel > 0.625) {
		baseGap = 40;
	} else if (zoomLevel > 0.3125) {
		baseGap = 80;
	} else {
		baseGap = 160;
	}

	const gap = baseGap - 2 * circleRadius;
	const rows = (window.innerHeight / zoomLevel) / (2 * circleRadius + gap);
	const cols = (window.innerWidth / zoomLevel) / (2 * circleRadius + gap);

	const localOffset = {
		x: offset.x + (window.innerWidth / 2) * (1/zoomLevel - 1),
		y: offset.y + (window.innerHeight / 2) * (1/zoomLevel - 1)
	}

	updateNodes(localOffset);

	for (let i = 0; i < rows; i++) {
	  for (let j = 0; j < cols; j++) {
		let x = j * (2 * circleRadius + gap) - (localOffset.x - localOffset.x % (2 * circleRadius + gap))
		let y = i * (2 * circleRadius + gap) - (localOffset.y - localOffset.y % (2 * circleRadius + gap))
		
		ctx.beginPath();
		ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.closePath();
	  }
	}

	lastOffset.x = offset.x
	lastOffset.y = offset.y
	lastZoomLevel = zoomLevel 
	
	requestAnimationFrame(draw)
}

function updateNodes(localOffset) {
	canvasObjects.nodes.forEach(node => {
		let element = document.getElementById(node.id);
		element.style.left = (node.x + localOffset.x) * zoomLevel + 'px';
		element.style.top = (node.y + localOffset.y) * zoomLevel + 'px';
		element.style.transform = `scale(${zoomLevel})`;
	});
}

function getEventLocation(e) {
	if (e.touches && e.touches.length == 1)	{
		return { x:e.touches[0].clientX, y: e.touches[0].clientY }
	} else if (e.clientX && e.clientY) {
		return { x: e.clientX, y: e.clientY }        
	}
}

let isDragging = false
let dragStart = { x: 0, y: 0 }

function onPointerDown(e) {
	if (e.button != 1) {
		return
	}
	isDragging = true
	dragStart.x = getEventLocation(e).x/zoomLevel - offset.x
	dragStart.y = getEventLocation(e).y/zoomLevel - offset.y
}

function onPointerUp(e) {
	if (e.button != 1) {
		return
	}
	isDragging = false
	initialPinchDistance = null
	lastZoom = zoomLevel
}

function onPointerMove(e) {
	if (isDragging) {
		offset.x = getEventLocation(e).x/zoomLevel - dragStart.x
		offset.y = getEventLocation(e).y/zoomLevel - dragStart.y
	}
}

function handleTouch(e, singleTouchHandler) {
	if ( e.touches.length == 1 ) {
		singleTouchHandler(e)
	} else if (e.type == "touchmove" && e.touches.length == 2) {
		isDragging = false
		handlePinch(e)
	}
}

let initialPinchDistance = null
let lastZoom = zoomLevel

function handlePinch(e) {
	e.preventDefault()
	
	let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
	let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
	
	let currentDistance = (touch1.x - touch2.x)**2 + (touch1.y - touch2.y)**2
	
	if (initialPinchDistance == null) {
		initialPinchDistance = currentDistance
	} else {
		adjustZoom( null, currentDistance/initialPinchDistance )
	}
}

function adjustZoom(zoomAmount, zoomFactor) {
	if (!isDragging) {
		if (zoomAmount) {
			zoomLevel += zoomAmount
		} else if (zoomFactor) {
			console.log(zoomFactor)
			zoomLevel = zoomFactor*lastZoom
		}
		
		zoomLevel = Math.min(zoomLevel, 5)
		zoomLevel = Math.max(zoomLevel, 0.2)
		
		console.log(zoomAmount)
	}
}

const bodyContainer = document.getElementById('bodyContainer')

bodyContainer.addEventListener('mousedown', onPointerDown)
bodyContainer.addEventListener('touchstart', (e) => handleTouch(e, onPointerDown))
bodyContainer.addEventListener('mouseup', onPointerUp)
bodyContainer.addEventListener('touchend',  (e) => handleTouch(e, onPointerUp))
bodyContainer.addEventListener('mousemove', onPointerMove)
bodyContainer.addEventListener('touchmove', (e) => handleTouch(e, onPointerMove))
bodyContainer.addEventListener('wheel', (e) => adjustZoom(-e.deltaY*0.001))

draw()