function ChangeOrder()
{
   this.radio = {};
   this.radio.settings = {};
   this.tuner = {};
   this.spectrum = {};
   this.modem = {};
}

function addOptionBox(id,ops,action) 
{
    this.action = action;
    this.option = document.getElementById(id);
    this.elem = document.createElement('div');
    this.elem.setAttribute('class','option-box');
    for (let n = 0; n < ops.length; n++) {
        let op = document.createElement('div');
        op.setAttribute('class','option');
        this.elem.appendChild(op);
        op.innerHTML = ops[n];
        op.onclick = function()
        {
            this.action(ops[n]);
            this.hide();
        }.bind(this);
    }
    $('#option-overlay')[0].appendChild(this.elem);
    this.option.onclick = function() 
    {
        this.show();
    }.bind(this);
    this.elem.onmouseleave = function()
    {
        this.hide();
    }.bind(this);
    this.hide = function()
    {
        this.elem.style.border = 'none';
        this.elem.style.display = 'none';
        this.elem.style.opacity = '0';
    }.bind(this);
    this.show = function()
    {
        this.elem.style.border = '10px solid orange';
        this.elem.style.display = 'block';
        this.elem.style.opacity = '1';
    }.bind(this);
    this.hide();
}
    
function DisplayControls(stat) 
{
   this.elem = document.createElement('div');
   this.elem.hidden = true;
   this.elem.setAttribute("class","dropdown");
   let item;
   item = new GenericOptionSetting(
      "FFT",
      ['spectrum', 'length'],
      stat.spectrum.length,
      [1024,2048,4096,8192]);
   this.elem.appendChild(item.elem);
   item = new GenericOptionSetting(
      "Decimation",
      ["spectrum","decimation"],
      stat.spectrum.decimation,
      [1,2,3,4,5,6,7,8,9,10]);
   this.elem.appendChild(item.elem);
}

function Settings(settings) {
   this.elem = document.createElement('div');
   this.elem.setAttribute("class","dropdown");
   this.elem.hidden = true;
   for (let n in settings) {
      let s;
      if (settings[n].type === 0) {
         s = new LogicalSetting(settings[n]);
         this.elem.appendChild(s.elem);
      }
      else if (settings[n].options.length > 1) {
         s = new OptionSetting(settings[n]);
         this.elem.appendChild(s.elem);
      }
   }
}

function RadioControls(stat)
{
   this.elem = document.createElement('div');
   this.elem.setAttribute("class","dropdown");
   this.elem.hidden = true;
   let item;
   item = new GenericOptionSetting(
      'Sampling Rate',
      ['radio', 'sampleRate'],
      stat.radio.sampleRate,
      stat.hardware.sampleRates);
   this.elem.appendChild(item.elem);
   item = new GenericOptionSetting(
      'Bandwidth',
      ['radio', 'bandwidth'],
      stat.radio.bandwidth,
      stat.hardware.bandwidths);
   this.elem.appendChild(item.elem);
   item = new GenericOptionSetting(
      'Antenna',
      ['radio', 'antenna'],
      stat.radio.antenna,
      stat.hardware.antennas);
   this.elem.appendChild(item.elem);
   item = new GenericValueSetting(
      'frequency Correction',
      ['radio','freqCorrection'],
      stat.radio.freqCorrection);
   this.elem.appendChild(item.elem);
}

function LogicalSetting(setting)
{
   this.value = setting.value;
   this.name = setting.name;
   this.key = setting.key;
   this.onColor = "lightblue";
   this.offColor = "white";
   this.elem = document.createElement('div');
   this.elem.setAttribute('class','control');
   this.mbut = document.createElement('button');
   this.elem.appendChild(this.mbut);
   this.mbut.type = 'button';
   this.mbut.id = this.name;
   this.mbut.innerHTML = this.name;
   this.mbut.setAttribute("class","control");
   this.mbut.style.backgroundColor = (this.value==='true') ? this.onColor : this.offColor;
   this.mbut.onclick = function() {
      var co = new ChangeOrder();
      if (this.value === 'true') {
         this.value = 'false';
         this.mbut.style.backgroundColor = this.offColor;
         co.radio.settings[this.key] = 'false';
         socket.emit('apply',co);
      }
      else {
         this.value = 'true';
         this.mbut.style.backgroundColor = this.onColor;
         co.radio.settings[this.key] = 'true';
         socket.emit('apply',co);
      }
   }.bind(this);
}

function OptionSetting(setting)
{
   this.value = setting.value;
   this.name = setting.name;
   this.key = setting.key;
   this.options = setting.options;
   this.optionNames = setting.optionNames;
   this.elem = document.createElement('div');
   this.elem.setAttribute("class","control");
   var label = document.createElement('label');
   label.innerHTML = this.name;
   label.setAttribute("class","control");
   this.elem.appendChild(label);
   this.msel = document.createElement('select');
   this.msel.setAttribute("class","control");
   this.elem.appendChild(this.msel);
   for ( let n in this.options) {
      var opt = document.createElement('option');
      opt.setAttribute("class","control");
      this.msel.appendChild(opt);
      if (this.optionNames.length > 0) 
         opt.innerHTML = '<div class="control">' + this.optionNames[n] + '</div>';
      else
         opt.innerHTML = '<div class="control">' + this.options[n] + '</div>';
      if (this.options[n] === this.value) opt.checked = true;
   }
   this.msel.onchange = function() {
      var co = new ChangeOrder();
      this.value = this.options[this.msel.selectedIndex];
      co.radio.settings[this.key] = this.value;
      socket.emit('apply',co);
   }.bind(this);
}

function GenericOptionSetting(label,coAsStringList,value,values)
{
   this.coList = coAsStringList;
   this.value = value;
   this.values = values;
   this.elem = document.createElement('div');
   this.msel = document.createElement('select');
   var cap   = document.createElement('label');
   this.msel.setAttribute("class","control");
   cap.setAttribute("class","control");
   this.elem.setAttribute("class","control");
   cap.innerHTML = label;
   this.elem.appendChild(cap);
   this.elem.appendChild(this.msel);
   for (let nval in values) {
      var opt = document.createElement('option');
      opt.setAttribute("class","control");
      this.msel.appendChild(opt);
      opt.value = values[nval];
      opt.innerHTML = values[nval];
      if (this.value === values[nval])
         this.msel.selectedIndex = nval;
   }
   this.msel.onchange = function() {
      var co = new ChangeOrder();
      var here = co;
      for (let nkey in this.coList) {
         if (nkey < this.coList.length - 1)
            here = here[this.coList[nkey]];
         else
            here[this.coList[nkey]] = this.values[this.msel.selectedIndex];
      } 
      console.log(co);
      socket.emit('apply',co);
   }.bind(this);
}

function GenericValueSetting(label,coAsStringList,value)
{
   this.coList = coAsStringList;
   this.value = value;
   this.elem = document.createElement('div');
   this.inpv = document.createElement('input');
   this.capt = document.createElement('label');
   this.capt.setAttribute('class','control');
   this.elem.setAttribute('class','control');
   this.inpv.setAttribute('class','control');
   //this.inpv.setAttribute('type','number');
   this.elem.appendChild(this.capt);   
   this.elem.appendChild(this.inpv);
   this.inpv.value = String(this.value);
   this.inpv.onchange = function() {
      var co = new ChangeOrder();
      var here = co;
      for (let nkey in this.coList) {
         if (nkey < this.coList.length - 1)
            here = here[this.coList[nkey]];
         else
            here[this.coList[nkey]] = Number(this.inpv.value);
      }
      console.log(co);
      socket.emit('apply',co);
   }.bind(this);
}
   
