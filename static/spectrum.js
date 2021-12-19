/*
** Power Spectrum Display. 
*/

function linearTransform(x1,x2,y1,y2)
{
    return (x) => {
        let a = (y1-y2)/(x1-x2);
        let b = (x2*y1-x1*y2)/(x1-x2);
        return a*x-b;
    };
}

function addCommas(num)
{
    return num.replace(/(.)(?=(\d{3})+$)/g,'$1,');
}

class SpectrumDisplay
{
    backgroundImage;
    backgroundTopColor = 'lightblue';
    backgroundBottomColor = 'darkblue';

    lineColor = '#FFFF00';
    lineWidth = 1;

    scaleStrokeStyle = 'darkgreen';
    scaleLineWidth = 1;
    scaleFont = '20px sans-serif';
    scaleColor = 'yellow';
    scaleLineWidth = 1;

    tunerFillStyle = 'rgb(0,0,255,0.5)';
    tunerStrokeStyle = 'red';
    tunerLineWidth = 3;

    cursorLineWidth = 1;
    cursorStrokeStyle = 'lightgreen';
    cursorFont = '25px sans-serif';
    cursorFillStyle = 'yellow';

    bandStart = 0;
    bandEnd = 0;
    bandFillStyle = 'lightgreen';

    ymax = -10;
    ymin = -140;
    ytic = 20;
    yLabels = [];
    xmax = 10;
    xmin = 0;
    xtic = 100000;
    xLabels = [];
    crop = true;
    cursor = -100; // hidden
    scaleMin = false;
    
    constructor(id_canvas) {
        this.canvas = document.getElementById(id_canvas);
        this.ctx = this.canvas.getContext('2d');
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

    xRange(xmin,xmax) {
        this.xmin = xmin;
        this.xmax = xmax;
        this.xToPixel = linearTransform(this.xmin,this.xmax,0,this.canvas.width);
        this.xToFreq = linearTransform(0,this.canvas.width,this.xmin,this.xmax);
    }

    yRange(ymin,ymax) {
        this.ymin = ymin;
        this.ymax = ymax;
        this.yToPixel = linearTransform(this.ymax,this.ymin,0,this.canvas.height);
    }

    drawYTics() {
        this.yLabels = [];
        this.ctx.strokeStyle = this.scaleStrokeStyle;
        this.ctx.lineWidth = this.scaleLineWidth;
        this.ctx.beginPath();
        let y = this.ymax;
        while (y > this.ymin) {
            let yp = this.yToPixel(y);
            this.ctx.moveTo(0,yp);
            this.ctx.lineTo(this.canvas.width,yp);
            this.yLabels.push(y);
            y -= this.ytic;
        }
        this.ctx.stroke();
    }

    drawXTics() {
        this.xLabels = [];
        this.ctx.strokeStyle = this.scaleStrokeStyle;
        this.ctx.lineWidth = this.scaleLineWidth;
        this.ctx.beginPath();
        let x = Math.ceil(this.xmin/this.xtic) * this.xtic;
        while (x < this.xmax) {
            let xp = this.xToPixel(x);
            this.ctx.moveTo(xp,0);
            this.ctx.lineTo(xp,this.canvas.width);
            this.xLabels.push(x);
            x += this.xtic;
        }
        this.ctx.stroke();
    }

    drawLabels(data) {
        this.ctx.font = this.scaleFont;
        this.ctx.fillStyle = this.scaleColor;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        for (let label of this.yLabels) {
            this.ctx.fillText(String(label)+' dB',10,this.yToPixel(label)-5);
        }
        this.ctx.font = this.scaleFont;
        this.ctx.fillStyle = this.scaleColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (let label of this.xLabels) {
            this.ctx.fillText(String(label/1000000)+' MHz',this.xToPixel(label),this.canvas.height-20);
        } 
        this.ctx.font = '40pt monospace';
        this.ctx.fillStyle = 'rgb(255,255,255,1.0)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(addCommas(String(data.radio.tunerFreq)),this.canvas.width/2,50);
    }

    drawTuner(data) {
        let ft = data.radio.tunerFreq;
        let fs = this.xToPixel(ft + data.modem.fstart);
        let fe = this.xToPixel(ft + data.modem.fend);
        this.ctx.fillStyle = this.tunerFillStyle;
        this.ctx.fillRect(fs,0,fe-fs,this.canvas.height);
        this.ctx.strokeStyle = this.tunerStrokeStyle;
        this.ctx.lineWidth = this.tunerLineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(this.xToPixel(ft),0);
        this.ctx.lineTo(this.xToPixel(ft),this.canvas.width);
        this.ctx.stroke();
    }

    drawCursor() {
        this.ctx.lineWidth = this.cursorLineWidth;
        this.ctx.strokeStyle = this.cursorStrokeStyle;
        this.ctx.beginPath();
        this.ctx.moveTo(this.cursor,0);
        this.ctx.lineTo(this.cursor,35);
        this.ctx.moveTo(this.cursor,65);
        this.ctx.lineTo(this.cursor,this.canvas.height);
        this.ctx.stroke();
        this.ctx.font = this.cursorFont;
        this.ctx.fillStyle = this.cursorFillStyle;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let freq = this.xToFreq(this.cursor);
        this.ctx.fillText(String(Math.round(freq/1000)),this.cursor,50);
    }

    drawBandMarker() {
        let bs = this.xToPixel(this.bandStart);
        let be = this.xToPixel(this.bandEnd);
        let ht = this.canvas.height - 10;
        this.ctx.fillStyle = this.bandFillStyle;
        this.ctx.fillRect(bs,ht,be-bs,10);
    }

    // We have/expect from the server
    //
    //   data.radio.centerFreq
    //   data.radio.sampleRate
    //   data.radio.bandwidth
    //   data.spectrum.decimation
    //   data.spectrum.displayCenter
    //   data.spectrum.fstart
    //   data.spectrum.fstep
    //
    // The data.spectrum.displayCenter frequency should appear at the center of the power
    // spectrum plot. It's set equal to data.radio.tunerFreq in the server when 
    // data.spectrum.decimation is changed and greater than 1. When data.spectrum.decimation = 1
    // it's set to data.radio.centerFreq.
    //
    // crop is used to limit the frequency plot to the reported bandwidth of the radio. This
    // bandwidth may be set by the user for SDRPlay radios so it might wind up greater than
    // the sampling rate which is impossible so we ignore this case.
    setDisplayRange(data) {
        this.yRange(this.ymin,this.ymax);
        let bw = data.radio.bandwidth / data.spectrum.decimation;
        if (data.radio.bandwidth > data.radio.sampleRate)
            bw = data.radio.sampleRate / data.spectrum.decimation;
        if (!this.crop) 
            bw = data.radio.sampleRate / data.spectrum.decimation;
        let xmin = data.spectrum.displayCenter - bw/2;
        let xmax = data.spectrum.displayCenter + bw/2;
        this.xRange(xmin,xmax);
    }

    plot(data) {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.setDisplayRange(data);
        if (this.backgroundImage) {
            this.ctx.putImageData(this.backgroundImage,0,0);
        }
        else {
            this.ctx.fillStyle = this.ctx.createLinearGradient(0,0,0,this.canvas.height);
            this.ctx.fillStyle.addColorStop(0,this.backgroundTopColor);
            this.ctx.fillStyle.addColorStop(1,this.backgroundBottomColor);
            this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
            this.drawYTics();
            this.drawXTics();
            this.drawTuner(data);
            this.drawBandMarker();
            this.drawLabels(data);
            this.backgroundImage = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        }
        this.drawCursor();
        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.beginPath();
        let x = data.spectrum.fstart;
        this.ctx.moveTo(this.xToPixel(x),this.yToPixel(data.spectrum.data[0]));
        for (let n = 1; n < data.spectrum.length; n++) {
            this.ctx.lineTo(this.xToPixel(x),this.yToPixel(data.spectrum.data[n]));
            x += data.spectrum.fstep;
        }
        this.ctx.stroke();
        if (this.scaleMin) {
            let fs = data.spectrum.fstart;
            let df = data.spectrum.fstep;
            let b = Math.ceil((this.xmin - fs)/df);
            let e = Math.floor((this.xmax - fs)/df);
            this.ymin = Math.floor(Math.min(...data.spectrum.data.slice(b,e))) - 10;
            this.scaleMin = false;
            this.updateBackground();
        }
    }

    cursorFreq() {
        return this.xToFreq(this.cursor);
    }

    rescaleMin() {
        this.scaleMin = true;
    }

    updateBackground() {
        this.backgroundImage = undefined;
    }

}

