
function LinearMap(x1,x2,y1,y2)
{
    return function(x)
    {
        let a = (y1-y2)/(x1-x2);
        let b = (x2*y1 - x1*y2)/(x1 - x2);
        return a*x - b;
    }
}

function LogMap(x1,x2,y1,y2)
{
    x1 = Math.log10(x1);
    x2 = Math.log10(x2);
    return function(x)
    {
        let a = (y1-y2)/(x1-x2);
        let b = (x2*y1 - x1*y2)/(x1 - x2);
        return a*Math.log10(x) - b;
    }
}

class Meter 
{
    constructor(id_canvas,label,tics,logScale) {
        this.canvas = document.getElementById(id_canvas);
        this.ctx = this.canvas.getContext('2d');
        this.label = (label)?label:'dBm';
        this.tics = (tics)?tics:[0,'0',10,'10'];
        this.setGeometry();
        this.dialColor = 'rgb(256,256,100)';
        this.needleColor = 'rgb(256,0,0)';
        this.textColor = 'rgb(0,0,0)';
        let from = this.tics[0];
        let to = this.tics[this.tics.length-2];
        if (logScale) 
            this.angleMap = LogMap(from,to,this.a1,this.a2);
        else
            this.angleMap = LinearMap(from,to,this.a1,this.a2);
    }
    
    setGeometry() {
        this.pad = 20;
        this.Rm = 2*this.canvas.height;
        this.xm = this.canvas.width / 2;
        this.ym = this.Rm + this.pad;
        this.a2 = Math.acos(this.xm/this.Rm);
        this.a1 = Math.PI - this.a2;
        this.Rd = this.Rm - 50;
        this.ticLength = 20;
        this.needleWidth = 2;
        this.scaleWidth = 2;
    }

    drawDial() {
        let xb,yb,xe,ye;
        let a1 = Math.PI + this.a2;
        let a2 = 2*Math.PI - this.a2;
        this.ctx.fillStyle = this.textColor;
        this.ctx.font = '10pt monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.beginPath();
        this.ctx.arc(this.xm,this.ym,this.Rd,a1,a2);
        this.ctx.lineWidth = this.scaleWidth;
        this.ctx.strokeStyle = this.textColor;
        for (let n = 0; n < this.tics.length; n += 2) {
            let lb = this.tics[n+1];
            let An = this.angleMap(this.tics[n]);
            let tl = this.ticLength/((lb)?1:2);
            xe = this.Xp(this.Rd + tl,An);
            ye = this.Yp(this.Rd + tl,An);
            xb = this.Xp(this.Rd, An);
            yb = this.Yp(this.Rd, An);
            this.ctx.moveTo(xb,yb);
            this.ctx.lineTo(xe,ye);
            if ( lb ) {
                xe = this.Xp(this.Rd+tl+5, An);
                ye = this.Yp(this.Rd+tl+5, An);
                this.ctx.fillText(String(lb),xe,ye);
            }
        }
        this.ctx.font = '20pt monospace';
        this.ctx.fillText(this.label,this.canvas.width/2,this.canvas.height-30);
        this.ctx.stroke();
    }

    drawNeedle(val) {
        let a = this.angleMap(val);
        let x = this.Xp(this.Rm,a);
        let y = this.Yp(this.Rm,a);
        this.ctx.beginPath();
        this.ctx.moveTo(this.xm,this.ym);
        this.ctx.lineTo(x,y);
        this.ctx.lineWidth = this.needleWidth;
        this.ctx.strokeStyle = this.needleColor;
        this.ctx.shadowOffsetX = -3;
        this.ctx.shadowOffsetY = 5;
        this.ctx.shadowBlur = 3;
        this.ctx.shadowColor = 'rgb(0,0,0,.3)';
        this.ctx.stroke();
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.shadowBlur = 0.0;
        this.ctx.shadowColor = 'rgb(0,0,0,0)';
    }

    draw(val) {
        this.ctx.fillStyle = this.dialColor;
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.drawDial();
        this.drawNeedle(val);
    }

    Xp(r,a) {
        return r * Math.cos(a) + this.xm;
    }

    Yp(r,a) {
        return this.ym - r * Math.sin(a);
    }
}

class SMeter extends Meter
{
    constructor(id_canvas) {
        let tics = [.5,'',1,'1',2,'',3,'3',4,'',5,'5',6,'',7,'7',8,'',9,'9',12,'',15,'15',30,'30',60,'60'];
        super(id_canvas,'SM',tics,true);
    }
}

class PowerMeter extends Meter
{
    constructor(id_canvas) {
        let tics = [-140,'-140', -130, '', -120,'-120', -110, '', -100,'-100', -90, '', -80,'-80', -70, '', 
                     -60,'-60', -50, '', -40,'-40', -30, '', -20,'-20', -10, '', 0,'0'];
        super(id_canvas,'dBm',tics,false);
        this.valueMap = LinearMap(this.a1,this.a2,this.tics[0],this.tics[this.tics.length-2]);
        this.squelchLevel = -120;
        this.isSquelched = false;
        this.canvas.onclick = function(ev)
        {
            this.squelchLevel = this.valueMap(Math.atan2(this.ym - ev.offsetY, ev.offsetX - this.xm));
        }.bind(this);
        this.canvas.onmousemove = function(ev)
        {
            this.cursor = Math.atan2(this.ym - ev.offsetY, ev.offsetX - this.xm);
        }.bind(this);
        this.canvas.onmouseleave = function()
        {
            this.cursor = -Math.PI/2;
        }.bind(this);
    }

    drawSquelch() {
        let xs = this.Xp(this.Rd,this.angleMap(this.squelchLevel));
        let ys = this.Yp(this.Rd,this.angleMap(this.squelchLevel));
        this.ctx.beginPath();
        this.ctx.arc(xs,ys,5,0,2*Math.PI);
        this.ctx.closePath();
        this.ctx.fillStyle = this.dialColor;
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawCursor() {
        let xc = this.Xp(this.Rm,this.cursor);
        let yc = this.Yp(this.Rm,this.cursor);
        this.ctx.beginPath();
        this.ctx.moveTo(this.xm,this.ym);
        this.ctx.lineTo(xc,yc);
        this.ctx.strokeStyle = 'green';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }   

    draw(val) {
        this.isSquelched = val < this.squelchLevel;
        this.ctx.fillStyle = 'rgb(256,256,100)';
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.drawDial();
        this.drawSquelch();
        this.drawCursor();
        this.drawNeedle(val);
    }
}

