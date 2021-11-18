function Digit(inc) 
{
   this.inc = inc;
   this.elem = document.createElement('div');
   this.elem.setAttribute('class','digit');
   this.txt = document.createElement('div');
   this.txt.innerHTML = '0';
   this.txt.setAttribute('class','digit-text');
   this.elem.appendChild(this.txt);
   this.up = document.createElement('div');
   this.up.setAttribute('class','top-cover');
   this.elem.appendChild(this.up);
   this.down = document.createElement('div');
   this.down.setAttribute('class','bottom-cover');
   this.elem.appendChild(this.down);
   this.change = undefined;
   this.up.onclick = function() 
   {
      if (this.change) 
         this.change(this.inc);
   }.bind(this);
   this.down.onclick = function()
   {
      if (this.change)
         this.change(-this.inc);
   }.bind(this);
}

Digit.prototype.getValue = function()
{
   return this.inc*Number(this.txt.innerHTML);
};

Digit.prototype.setValue = function(value)
{
   this.txt.innerHTML = String(value);
};

function DigitBox(element,ndigit)
{
   this.minValue = 0;
   this.maxValue = 2000000000;
   this.digits = [];
   for (let n = 0; n < ndigit; n++) {
      this.digits[n] = new Digit(Math.pow(10,n));
   }
   for (let n = 0; n < ndigit; n++) {
      let k = ndigit - n - 1;
      element.appendChild(this.digits[k].elem);
      if ( (k + 1) % 3 === 0) {
         this.digits[k].elem.style.borderLeft = '5px solid orange';
      }
   }
   this.action = undefined;
   this.change = function(inc)
   {
      let value = this.getValue();
      value += inc;
      if (value > this.minValue && value <= this.maxValue) {
         this.setValue(value);
         if (this.action)
            this.action(value);
      }
   }.bind(this);
   for (let n = 0; n < this.digits.length; n++)
      this.digits[n].change = this.change;
}

DigitBox.prototype.onchange = function(fnc)
{
   this.action = fnc;
}

DigitBox.prototype.getValue = function()
{
   let value = 0;
   for (let n = 0; n < this.digits.length; n++) {
      value += this.digits[n].getValue();
   }
   return value;
};

DigitBox.prototype.setValue = function(value)
{
   for (let n = 0; n < this.digits.length; n++)
      this.digits[n].setValue(0);
   let str = String(Math.floor(value));
   for (let n = 0; n < str.length; n++) {
      let k = str.length - n - 1;
      this.digits[k].setValue(Number(str[n]));
   }
};

