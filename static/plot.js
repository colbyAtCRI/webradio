/*
** Second stab at line plotting 
*/

function LinearTransform(x1,x2,y1,y2)
{
    return (x) => {
        let a = (y1-y2)/(x1-x2);
        let b = (x2*y1-x1*y2)/(x1-x2);
        return a*x-b;
    };
}

function FFTFrequency(N)
{
    let rng = [];
    if (N % 2 == 0) {
        for (let n = 0; n < N; n++) {
            rng.push((n - N/2)/N);
        }
    }
    else {
        for (let n = 0; n < N; n++) {
            rng.push((n - (N-1)/2)/N);
        }
    }
    return rng;
}

function range(array)
{
    let rng = [];
    for (let n = 0; n < array.length; n++) {
        rng.push(n);
    }
    return rng;
}

function SpectrumDisplay(id_canvas) {
    this.canvas = document.getElementById(id_canvas);
    this.context = this.canvas.getContext('2d');
    this.backgroundImage = undefined;
    this.backgroundTopColor = 'lightblue';
    this.backgroundBottomColor = 'darkblue';
    this.lineColor = '#FFFF00';
    this.cursorColor = '#FF0000';
    this.lineWidth = 1;
    this.ymax = -10;
    this.ymin = -140;
    this.ytic = 20;
    this.xmax = 10;
    this.xmin = 0;
    this.xtic = 100000;
    this.crop = true;
    this.cursor = -100;
    this.scaleMin = false;
    this.band_start = 0;
    this.band_end = 0;
    this.lastCF = 0;
    this.lastTF = 0;
    this.resizeObserver = new ResizeObserver(thing => this.backgroundImage = undefined);
    this.resizeObserver.observe(this.canvas.parentElement);
    this.canvas.onmousemove = function(evnt)
    {
        this.cursor = evnt.offsetX;
    }.bind(this);
    this.canvas.onmouseleave = function()
    {
        this.cursor = -100;
    }.bind(this);
}

SpectrumDisplay.prototype.rescaleMin = function() {
    this.scaleMin = true;
}

SpectrumDisplay.prototype.updateBackground = function()
{
    this.backgroundImage = undefined;
}

SpectrumDisplay.prototype.xrange = function(xmin,xmax) {
    if (this.xmin != xmin || this.xmax != xmax)
        this.updateBackground();
    this.xmin = xmin;
    this.xmax = xmax;
    this.xToPixel = LinearTransform(this.xmin,this.xmax,0,this.canvas.width);
    this.xToFreq  = LinearTransform(0,this.canvas.width,xmin,xmax);
}

SpectrumDisplay.prototype.cursorFreq = function() {
    return this.xToFreq(this.cursor);
}

SpectrumDisplay.prototype.yrange = function(ymin,ymax) {
    if (this.ymin != ymin || this.ymax != ymax)
        this.updateBackground();
    this.ymin = ymin;
    this.ymax = ymax;
    this.yToPixel = LinearTransform(this.ymax,this.ymin,0,this.canvas.height);
}

SpectrumDisplay.prototype.drawYTics = function(data) {
    let ctx = this.context;
    let ytic = this.ymax;
    let ytics = [];
    ctx.beginPath();
    ctx.strokeStyle = 'darkgreen';
    ctx.lineWidth = 1;
    while (ytic > this.ymin) {
        ctx.moveTo(0,this.yToPixel(ytic));
        ctx.lineTo(this.canvas.width,this.yToPixel(ytic));
        ytics.push(ytic);
        ytic -= this.ytic;
    }
    ctx.stroke();
    ctx.fillStyle = '#FFFF00';
    ctx.font = '20px sans-serif';
    for (let n = 0; n < ytics.length; n++) {
        ctx.fillText(String(ytics[n])+' dB',10,this.yToPixel(ytics[n])-5);
    }
}

SpectrumDisplay.prototype.drawXTics = function(fmin,fmax) {
    let ctx = this.context;
    let xtics = [];
    let xtic = Math.ceil(fmin/this.xtic) * this.xtic;
    ctx.beginPath();
    ctx.strokeStyle = 'darkgreen';
    ctx.lineWidth = 1;
    while (xtic < fmax) {
        xtics.push(xtic);
        ctx.moveTo(this.xToPixel(xtic),0);
        ctx.lineTo(this.xToPixel(xtic),this.canvas.height);
        xtic += this.xtic;
    }
    let xval = xtics;
    ctx.stroke();
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#FFFF00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 0; n < xtics.length; n++) {
        ctx.fillText(String(xtics[n]/1000000)+ ' MHz',this.xToPixel(xtics[n]),this.canvas.height-20);
    }
}

SpectrumDisplay.prototype.drawTuner = function(data)
{
    let ctx = this.context;
    var fcenter = data.radio.tunerFreq;
    var fstart = fcenter + data.modem.fstart;
    var fend   = fcenter + data.modem.fend;
    let fs = this.xToPixel(fstart);
    let fe = this.xToPixel(fend);
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillRect(fs,0,fe-fs,this.canvas.height);
    ctx.beginPath();
    ctx.moveTo(this.xToPixel(fcenter),0);
    ctx.lineTo(this.xToPixel(fcenter),this.canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
}

SpectrumDisplay.prototype.drawCursor = function()
{
    let ctx = this.context;
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.cursorColor;
    ctx.beginPath();
    ctx.moveTo(this.cursor,0);
    ctx.lineTo(this.cursor,35);
    ctx.moveTo(this.cursor,65);
    ctx.lineTo(this.cursor,this.canvas.height);
    ctx.stroke();
    ctx.font = '25px sans-serif';
    ctx.fillStyle = '#FFFF00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let freq = this.xToFreq(this.cursor);
    ctx.fillText(String(Math.floor(freq/1000)),this.cursor,50); 
}

SpectrumDisplay.prototype.drawBandMarker = function()
{
    let ctx = this.context;
    let bs = this.xToPixel(this.band_start);
    let be = this.xToPixel(this.band_end); 
    let ht = this.canvas.height-40;
    ctx.fillStyle = 'rgba(0,100,0,1.0)';
    ctx.fillRect(bs,ht,be-bs,40);
}

SpectrumDisplay.prototype.plot = function(data) {
    if (this.lastCF != data.radio.centerFreq || this.lastTF != data.radio.tunerFreq)
        this.updateBackground();
    this.lastCF = data.radio.centerFreq;
    this.lastTF = data.radio.tunerFreq;
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
    this.xrange(data.spectrum.bstart,data.spectrum.bend);
    this.yrange(this.ymin,this.ymax);
    let ctx = this.context;
    if (this.backgroundImage) {
        ctx.putImageData(this.backgroundImage,0,0);
    }
    else {
        ctx.fillStyle = ctx.createLinearGradient(0,0,0,this.canvas.height);
        ctx.fillStyle.addColorStop(0,this.backgroundTopColor);
        ctx.fillStyle.addColorStop(1,this.backgroundBottomColor);
        ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.drawTuner(data);
        this.drawBandMarker();
        this.drawYTics();
        this.drawXTics(data.spectrum.fstart,data.spectrum.fend);
        this.backgroundImage = ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
    }
    this.drawCursor();
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    let fr = data.spectrum.fstart;
    ctx.moveTo(this.xToPixel(fr),this.yToPixel(data.spectrum.data[0]));
    for (let n = 1; n < data.spectrum.length; n++) {
        fr += data.spectrum.fstep;
        ctx.lineTo(this.xToPixel(fr),this.yToPixel(data.spectrum.data[n]));
    }
    ctx.stroke();
    if (this.scaleMin) {
        let fstart = data.spectrum.fstart;
        let fstep = data.spectrum.fstep;
        let b = Math.ceil((data.spectrum.bstart - fstart)/fstep);
        let e = Math.floor((data.spectrum.bend - fstart)/fstep);
        this.ymin = Math.floor(Math.min(...data.spectrum.data.slice(b,e)))-10;
        this.scaleMin = false;
        this.updateBackground();
    }
}
