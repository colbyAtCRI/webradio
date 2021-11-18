function getFrequency(obj)
{
   fetch('/'+myRadio+'/get_frequency')
      .then(resp => resp.text())
      .then(number => { obj.value = Number(number);})
      .then(crap => { obj.drawMe(); });
}

function blankChangeOrder()
{
   var ret = {};
   ret.radio = {};
   ret.tuner = {};
   ret.spectrum = {};
   ret.modem = {};
   return ret;
}

function setFrequency(freq,callback) 
{
   var change = blankChangeOrder();
   change.radio.centerFreq = freq;
   socket.emit('change',change,callback);
}

function setTunerFreq(freq,callback)
{
   var change = blankChangeOrder();
   change.tuner.freq = freq;
   socket.emit('change',change,callback);
}

function  NumericDisplay(canvas)
{
   this.init(canvas);
}

NumericDisplay.prototype.init = function(canvas)
{
   this.canvas = canvas;
   this.value = 0;
   this.digits = ['0','0','0','0','0','0','0','0','0','0'];
   this.upper = 9999999999;
   this.lower = 0;
   this.cellWidth = 30;
   this.canvas.width = 10*this.cellWidth;
   this.canvas.height = this.cellWidth+20;
   this.canvas.style = 'border:2px solid #000000;';
   let ctx = this.canvas.getContext('2d');
   ctx.font = '36px sans-serif';
   ctx.textAlign = 'center';
   ctx.textBaseline = 'middle';
   this.canvas.addEventListener('click',this.onClick.bind(this),false);
   this.canvas.addEventListener('mousemove',this.onMouseMove.bind(this),false);
   this.canvas.addEventListener('mouseleave',this.onMouseLeave.bind(this),false);;
   this.nx = -1;
   this.ny = -1;
   if (this.onInit) this.onInit(this);
   this.drawMe();
}

NumericDisplay.prototype.onMouseLeave = function()
{
   this.nx = -1;
   this.ny = -1;
   this.drawMe();
}

NumericDisplay.prototype.onMouseMove = function(e) 
{
   if (!e) e = window.event;
   var nx = Math.floor(e.offsetX / this.cellWidth);
   var ny = Math.floor(e.offsetY / (this.canvas.height/2));
   if (nx != this.nx || ny != this.ny) {
      this.nx = nx;
      this.ny = ny;
      this.drawMe();
   } 
}

NumericDisplay.prototype.onClick = function()
{
   var nx    = this.nx;
   var ny    = this.ny;
   var value = this.value;
   if (!(nx < 0||ny < 0)) {
      if ( ny == 0 ) {
         value += Math.pow(10,9-nx);
      }
      else { 
         value -= Math.pow(10,9-nx);
      }
      if (!(value < this.lower || value > this.upper)) {
         this.value = value;
         if (this.onChange) this.onChange(this.value);
      }
      this.drawMe();
   }
}

NumericDisplay.prototype.setDigits = function()
{
   for (let n = 0; n < this.digits.length; n++) {
      this.digits[n] = '0';
   }
   let value = String(this.value);
   for (let n = 0; n < value.length; n++) {
      this.digits[n + this.digits.length - value.length] = value[n];
   }
}

 
NumericDisplay.prototype.printDigits = function()
{
   var cw  = this.cellWidth;
   var ht  = this.canvas.height;
   var ctx = this.canvas.getContext('2d')
   for (let n = 0; n < this.digits.length; n++) {
      ctx.fillStyle = 'black';
      ctx.fillText(this.digits[n],(n+0.5)*cw,ht/2);
   }
}

NumericDisplay.prototype.drawSeparators = function()
{
   var ctx = this.canvas.getContext('2d');
   var cw  = this.cellWidth;
   var ht  = this.canvas.height;
   var ln  = [1,4,7];
   ctx.fillStyle = 'black';
   ctx.lineWidth = 1.0;
   ctx.beginPath();
   for (let n = 0; n < 3; n++) {
      ctx.moveTo(ln[n]*cw,0);
      ctx.lineTo(ln[n]*cw,ht);
   }
   ctx.stroke();
}

NumericDisplay.prototype.drawMe = function() 
{
   var nx  = this.nx;
   var ny  = this.ny;
   var cw  = this.cellWidth;
   var ht  = this.canvas.height;
   var ctx = this.canvas.getContext('2d');

   this.setDigits();
   ctx.fillStyle = 'white';
   ctx.fillRect(0,0,10*cw,ht);
   if (!(nx < 0 || ny < 0)) {
      ctx.fillStyle = 'lightblue';
      if ( ny == 0) {
         ctx.fillRect(nx*cw,0,cw,ht/2);
      }
      else {
         ctx.fillRect(nx*cw,ht/2,cw,ht/2);
      }
   }
   this.printDigits();
   this.drawSeparators();
}

