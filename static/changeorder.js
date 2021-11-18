function ChangeOrder(template)
{
   this.template = template;
   this.blank = {"radio":{},"settings":{}, "spectrum":{}, "tuner":{}, "modem":{}};
}

ChangeOrder.prototype.order = function(value)
{
   if (typeof(value) === 'string') {
      value = '"' + value + '"';
   }
   return {
      ...JSON.parse(this.template.replace('#',value)),
      ...this.order
   };
}

function OnOffControl(name,template,value,values)
{
   this.name = name;
   this.order = new ChangeOrder(template);
   this.values = values;
   this.value = value;
   this.onColor = 'lightblue';
   this.offColor = 'white';
   this.elem = document.createElement('div');
   this.elem.setAttribute('class','control');
   this.mbut = document.createElement('button');
   this.elem.appendChild(this.mbut);
   this.mbut.type = 'button';
   this.mbut.innerHTML = this.name;
   this.mbut.setAttribute('class','control');
   this.mbut.style.backgroundColor = (this.value === this.values[0]) ? this.onColor : this.offColor;
   this.mbut.onclick = function() {
      if (this.value === this.values[0]) {
         this.value = this.values[1];
         this.mbut.style.backgroundColor = this.offColor;
      }
      else {
         this.value = this.values[0];
         this.mbut.style.backgroundColor = this.onColor;
      }
      socket.emit('apply',this.order.order(this.value));
   }.bind(this);
}

function OptionControl(name,template,value,values)
{
   this.name = name;
   this.order = new ChangeOrder(template);
   this.values = values;
   this.value = value;
   this.elem = document.createElement('div');
   this.mlab = document.createElement('label');
   this.msel = document.createElement('select');
   this.elem.appendChild(this.mlab);
   this.elem.appendChild(this.msel);
   this.values.foreach( val => {
      let opt = document.createElement('option');
      this.msel.appendChild(opt);
      opt.innerHTML = val;
      if (this.value === val) {
         opt.checked = true;
      }
   });
   this.msel.onchange = function() {
      this.value = this.values[this.msel.selectedIndex];
      socket.emit('apply',this.order.order(this.value));
   }.bind(this); 
}

