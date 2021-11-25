function ChangeOrder()
{
   this.radio = {};
   this.radio.settings = {};
   this.spectrum = {};
   this.modem = {};
}

function setTuner(tf,cf,modem)
{
    let co = new ChangeOrder();
    co.radio.centerFreq = cf * 1000000;
    co.radio.tunerFreq = tf * 1000000;
    co.radio.modem_type = modem;
    return co;
}

const FMStationPresets = {
    '91.1'  : setTuner(91.1,91.0,'FMS'),
    '92.3'  : setTuner(92.3,92.2,'FMS'),
    '94.5'  : setTuner(94.5,94.4,'FMS'),
    '95.7'  : setTuner(95.7,95.6,'FMS'),
    '96.5'  : setTuner(96.5,96.4,'FMS'),
    '105.3' : setTuner(105.3,105.2,'FMS'),
    '107.3' : setTuner(107.3,107.2,'FMS'),
    '105.7' : setTuner(105.7,105.6,'FMS'),
    '99.7'  : setTuner(99.7,99.6,'FMS'),
    '103.3' : setTuner(103.3,103.2,'FMS'),
    '101.3' : setTuner(101.3,101.2,'FMS'),
    '104.9' : setTuner(104.9,104.8,'FMS') 
};


const HamBands = {
    'MW'   : setTuner(1.0,1.0,'AM'),
    '160M' : setTuner(1.9,1.9,'LSB'),
    '80M'  : setTuner(3.75,3.75,'LSB'),
    '40M'  : setTuner(7.1,7.1,'LSB'),
    '20M'  : setTuner(14.15,14.15,'USB'),
    '17M'  : setTuner(18.1,18.1,'USB'),
    '15M'  : setTuner(21.225,21.225,'USB'),
    '12M'  : setTuner(24.95,24.95,'USB'),
    '10M'  : setTuner(28.85,28.85,'USB'),
    '6M'   : setTuner(52.0,52.0,'NBFM'),
    '2M'   : setTuner(146.0,146.0,'NBFM'),
    '1.25M': setTuner(223.5,223.5,'NBFM'),
    '70CM' : setTuner(435.0,435.0,'NBFM'),
    '33CM' : setTuner(915.0,915.0,'NBFM'),
    '23CM' : setTuner(1270.0,1270.0,'NBFM')
};

function clearAllPreset()
{
    $('.preset-button').each(function()
    {
        this.style.color = 'black';
    });
}

class PresetButtons
{
    constructor(id_bbox,NB,bands) {
        this.box = document.getElementById(id_bbox);
        this.label = Object.keys(bands);
        this.bands = bands;
        for (let k = 0; k < NB; k++) {
            let bt = document.createElement('div');
            bt.setAttribute('class','preset-button');
            bt.innerHTML = (k < this.label.length)?this.label[k]:'-';
            bt.onclick = function() 
            {
                clearAllPreset();
                if (bands.hasOwnProperty(bt.innerHTML)) {
                    apply(bands[bt.innerHTML]);
                    bt.style.color = 'red';
                }
            };
            this.box.appendChild(bt);
        }
    }
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
   
