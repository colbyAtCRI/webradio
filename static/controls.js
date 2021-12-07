function ChangeOrder()
{
   this.radio = {};
   this.radio.settings = {};
   this.spectrum = {};
   this.modem = {};
}

class Band
{
    constructor(label,bstart,bend,modem,offset) {
        this.label = label;
        this.bstart = 1000000 * bstart;
        this.bend = 1000000 * bend;
        this.modem = modem;
        this.offset = offset;
    }

    changeOrder() {
        let co = new ChangeOrder();
        co.radio.centerFreq = (this.bstart+this.bend)/2;
        co.radio.tunerFreq = co.radio.centerFreq;
        if (this.modem)
            co.radio.modem_type = this.modem;
        if (this.offset)
            co.radio.centerFreq -= 1000000 * this.offset;
        return co;
    }

    inBand(stat) {
        return this.bstart <= stat.radio.tunerFreq &&
               stat.radio.tunerFreq <= this.bend;
    } 
}

const FMStationPresets = [
    new Band('KGO',0.80,0.82,'AM',0.01),
    new Band('91.1',91,91.2,'FMS',0.1),
    new Band('91.5',91.4,91.6,'FMS',0.1),
    new Band('104.9',104.8,105.0,'FMS',0.1),
    new Band('105.3',105.2,105.4,'FMS',0.1),
    new Band('106.5',106.4,106.6,'FMS',0.1),
    new Band('107.7',107.6,107.8,'FMS',0.1) 
];

const HamBands = [
    new Band('160M',1.8,2.0,'LSB'),
    new Band('80M',3.5,4.0,'LSB'),
    new Band('40M',7.0,7.3,'LSB'),
    new Band('30M',10.1,10.15,'LSB'),
    new Band('20M',14.0,14.35,'USB'),
    new Band('17M',18.068,18.168,'USB'),
    new Band('15M',21.0,21.45),
    new Band('12M',24.890,24.990),
    new Band('10M',28.0,29.7),
    new Band('6M',50.0,54.0),
    new Band('2M',144.0,148.0,'NBFM'),
    new Band('1.25M',222.0,225.0,'NBFM')
];

class PresetButtons
{
    constructor(id_bbox,NB,bands,marker) {
        this.box = document.getElementById(id_bbox);
        this.bands = bands;
        this.marker = (marker)?marker:function(){};
        for (let k = 0; k < NB; k++) {
            let bt = document.createElement('div');
            bt.setAttribute('class','preset-button');
            bt.innerHTML = '*';
            if ( k < bands.length ) {
                this.bands[k].button = bt;
                this.bands[k].button.innerHTML = this.bands[k].label;
                bt.onclick = function()
                {   
                    apply(bands[k].changeOrder());
                };
            }
            this.box.appendChild(bt);
        }
    }

    updateStatus(stat) {
        for (let n = 0; n < this.bands.length; n++) {
            if (this.bands[n].inBand(stat)) {
                this.bands[n].button.style.color = 'red';
                this.marker(this.bands[n].bstart,this.bands[n].bend);
            }
            else {
                this.bands[n].button.style.color = 'black';
            }
        }
    }
}

// ToggleButtons, such as the tuner-lock button, control or modify
// several UI functions. One my define N states in which case clicking
// will cycle through the states. States is an array of objects of the 
// form [state0,state1,...] where states all have the form,
//
//     stateN = {'text':`some text`,'style':`some style choices`}
//
// Each UI element using the toggle may associate a different action
// for each state using the select method.

class ToggleButton
{
    constructor(id,states) {
        this.element = document.getElementById(id);
        this.states = states;
        this.state = 0;
        this.setState();
        this.element.onclick = function()
        {
            this.state += 1;
            if (this.state >= this.states.length)
                this.state = 0;
            this.setState();
        }.bind(this);
    }

    setState() {
        this.element.innerHTML = this.states[this.state].text;
        for (let prop in this.states[this.state].style) {
            this.element.style[prop] = this.states[this.state].style[prop];
        }
        if (this.states[this.state].action) {
            this.states[this.state].action();
        }
    }

    text() {
        return this.states[this.state].text;
    }

    select(action) {
        return function(...args)
        {
            action[this.state](...args);
        }.bind(this);
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
