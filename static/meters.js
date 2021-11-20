
// Simple power meter

function MeterDisplay(id_canvas)
{
    this.canvas = document.getElementById(id_canvas);
    this.ctx = this.canvas.getContext('2d');
    this.label = 'dBm';
    this.pad = 20;
    this.Rm = 2*this.canvas.height;
    this.xm = this.canvas.width/2;
    this.ym = this.Rm + this.pad;
    this.a2 = Math.acos(this.xm/this.Rm);
    this.a1 = Math.PI - this.a2;
    this.Rd = this.Rm - 50;
    this.ticLength = 20;
    this.needleWidth = 1;
    this.scaleWidth = 2;
}

MeterDisplay.prototype.valueToAngle = function(v)
{
    return ((v+140)*this.a2 - v*this.a1)/140;
}
 
MeterDisplay.prototype.xPolar = function(radius,angle)
{
    return radius * Math.cos(angle) + this.xm;
}

MeterDisplay.prototype.yPolar = function(radius,angle)
{
    return this.ym - radius * Math.sin(angle); 
}

MeterDisplay.prototype.drawNeedle = function(val)
{
    let a = this.valueToAngle(val);
    let x = this.xPolar(this.Rm,a);
    let y = this.yPolar(this.Rm,a);
    this.ctx.beginPath();
    this.ctx.moveTo(this.xm,this.ym);
    this.ctx.lineTo(x,y);
    this.ctx.lineWidth = this.needleWidth;
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.stroke();
}

MeterDisplay.prototype.drawDial = function()
{
    let xb,yb,xe,ye;
    let a1 = Math.PI + this.a2;
    let a2 = 2*Math.PI - this.a2;
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '10pt monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.beginPath();
    this.ctx.arc(this.xm,this.ym,this.Rd,a1,a2);
    this.ctx.lineWidth = this.scaleWidth;
    this.ctx.strokeStyle = '#000000';
    for (let n = -140; n < 20; n += 20) {
        xe = this.xPolar(this.Rd+this.ticLength,this.valueToAngle(n));
        ye = this.yPolar(this.Rd+this.ticLength,this.valueToAngle(n));
        xb = this.xPolar(this.Rd,this.valueToAngle(n));
        yb = this.yPolar(this.Rd,this.valueToAngle(n));
        this.ctx.moveTo(xb,yb);
        this.ctx.lineTo(xe,ye);
        xe = this.xPolar(this.Rd+this.ticLength+5,this.valueToAngle(n));
        ye = this.yPolar(this.Rd+this.ticLength+5,this.valueToAngle(n));
        this.ctx.fillText(String(n),xe,ye);
    }
    this.ctx.font = '20pt monospace';
    this.ctx.fillText(this.label,this.canvas.width/2,this.canvas.height-30);
    this.ctx.stroke();
}

MeterDisplay.prototype.draw = function(val)
{
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.drawDial();
    this.drawNeedle(val);
}

